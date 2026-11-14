import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  formatContextForPrompt,
  REPUTABLE_SCIENTIFIC_SOURCES,
  sanitizeSourceReferences,
} from '../utils/aiContext';
import type {
  AiSourceReference,
  GeologicalInterpretationResult,
  MarsContextSnapshot,
  MissionAdvisorAssessment,
  TerrainIntelligenceResult,
} from '../types/mars';

export const GEMINI_MODEL_ID = 'gemini-4-hydrogen';

const CORE_SYSTEM_INSTRUCTION = `
You are the MARSCOPE Scientific Exploration Assistant for NASA Space Apps Challenge 2026.
Your role is to help planetary science researchers, students, and mission planners understand Martian geography, geology, surface terrain (MOLA/HRSC), thermal inertia (THEMIS), high-resolution imagery (CTX/HiRISE), mineralogy (CRISM/OMEGA), historical radiation/weather archives (Curiosity RAD, InSight APSS), and astronaut EVA planning constraints.

STRICT SCIENTIFIC ACCURACY & TRANSPARENCY RULES:
1. Distinguish epistemic categories clearly in every explanation:
   - Verified scientific observations (live queried NASA Trek DEM / USGS SIM 3292 / CRISM point detections in provided context)
   - Historical NASA measurements (e.g., Curiosity RAD Sol 0–300, Hassler et al. 2014; InSight Oct 2020 mission archive ended Dec 2022)
   - Calculated values (e.g., spherical great-circle route distance with R=3,389.5 km, duration from EVA walking speed, finite-difference DEM slope)
   - Demonstration data (default Gale Crater sample traverse or simulated routes)
   - Scientific interpretations (hypotheses about depositional history, mineralogy, or trafficability)
   - Unknown or unavailable information (e.g., unqueried DEMs, real-time dust storm telemetry, real-time SEP radiation alerts, global <1m boulder maps)
2. NEVER invent NASA measurements, coordinates, Sol numbers, instrument readings, or API values. If a metric is null or marked UNAVAILABLE in the provided context JSON, state explicitly that it is unavailable or not yet retrieved.
3. MINERAL IDENTIFICATION RULE: Never identify specific minerals from an ordinary optical photograph alone. Mineral identification requires spectral or geochemical evidence (such as MRO CRISM 18 m/px hyperspectral cubes, Mars Express OMEGA, Curiosity CheMin/APXS, or Perseverance PIXL/SHERLOC).
4. ASTRONAUT SAFETY RULE: Never certify or declare any route "safe" for human astronauts based on AI reasoning or horizontal distance alone. Emphasize hi-res HiRISE stereo slope/boulder verification, loose regolith sand-trap risks, PLSS limits, thermal extremes, and unmitigated radiation hazards.
5. CITATIONS RULE: Only reference reputable official URLs from NASA Mars Trek (https://trek.nasa.gov/), NASA PDS (https://pds.nasa.gov/), NASA Mars Exploration (https://science.nasa.gov/mars/), USGS Astrogeology (https://astrogeology.usgs.gov/), or Caltech Murray Lab CTX (https://murray-lab.caltech.edu/CTX/). Never fabricate citations or paper DOIs.
6. Tone: Clear, objective NASA scientific editorial prose. Concise, well-structured, no sci-fi hype.
`.trim();

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiServiceError(
      'GEMINI_API_KEY is not configured in server environment variables. Configure a valid Gemini API key in Settings > Secrets to enable the MARSCOPE AI Assistant.',
      503
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export class GeminiServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
  }
}

function classifyGeminiError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('401')) {
    return new GeminiServiceError(
      'Gemini API authentication failed (invalid or unauthorized GEMINI_API_KEY). Please verify the key in Settings > Secrets.',
      401
    );
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return new GeminiServiceError(
      'Gemini API rate limit or quota exceeded (HTTP 429). Please retry shortly or verify billing/quota in Settings > Secrets.',
      429
    );
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return new GeminiServiceError(
      `Gemini model "${GEMINI_MODEL_ID}" was not found or is unsupported by the configured endpoint.`,
      502
    );
  }
  return new GeminiServiceError(`Gemini API connection error: ${msg}`, 502);
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const classified = classifyGeminiError(err);
      if (classified.statusCode === 401 || classified.statusCode === 503) {
        throw classified;
      }
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }
  throw classifyGeminiError(lastErr);
}

const REFERENCE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      label: { type: Type.STRING },
      url: { type: Type.STRING },
      relevance: { type: Type.STRING },
    },
    required: ['label', 'url', 'relevance'],
  },
};

export async function checkGeminiStatus(probe = false): Promise<{
  configured: boolean;
  status: 'CONNECTED' | 'UNAVAILABLE';
  model: string;
  message: string;
  checkedAt: string;
}> {
  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const checkedAt = new Date().toISOString();

  if (!hasKey) {
    return {
      configured: false,
      status: 'UNAVAILABLE',
      model: GEMINI_MODEL_ID,
      message: 'GEMINI_API_KEY not found on backend server.',
      checkedAt,
    };
  }

  if (!probe) {
    return {
      configured: true,
      status: 'CONNECTED',
      model: GEMINI_MODEL_ID,
      message: `Server-side Gemini API configured (${GEMINI_MODEL_ID}).`,
      checkedAt,
    };
  }

  try {
    const ai = getGeminiClient();
    await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: 'Respond with the single word ONLINE.',
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    return {
      configured: true,
      status: 'CONNECTED',
      model: GEMINI_MODEL_ID,
      message: `Live connection verified with ${GEMINI_MODEL_ID}.`,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    const classified = classifyGeminiError(err);
    return {
      configured: true,
      status: 'UNAVAILABLE',
      model: GEMINI_MODEL_ID,
      message: classified.message,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function runAiChat(params: {
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: MarsContextSnapshot;
}): Promise<{
  reply: string;
  references: AiSourceReference[];
  model: string;
  generatedAt: string;
}> {
  const ai = getGeminiClient();
  const contextJson = formatContextForPrompt(params.context);

  const conversationContents = [
    ...params.history.slice(-8).map((turn) => ({
      role: turn.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: turn.content }],
    })),
    {
      role: 'user' as const,
      parts: [
        {
          text: `ACTIVE MARSCOPE APPLICATION CONTEXT (use exact values; mark nulls/unretrieved items as unavailable):\n${contextJson}\n\nUSER QUESTION:\n${params.question}`,
        },
      ],
    },
  ];

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: conversationContents,
      config: {
        systemInstruction: `${CORE_SYSTEM_INSTRUCTION}

Respond in clean JSON with:
- "reply": Well-organized scientific answer (plain text paragraphs and numbered/bulleted lines; avoid excessive markdown clutter). Explicitly separate Verified Observations, Historical Measurements, Calculated Values, Demonstration Data, Scientific Interpretations, and Unavailable/Unknown Information where relevant.
- "references": 2 to 4 relevant official URLs chosen ONLY from https://trek.nasa.gov/, https://pds.nasa.gov/, https://science.nasa.gov/mars/, https://astrogeology.usgs.gov/, or https://murray-lab.caltech.edu/CTX/.`,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            references: REFERENCE_SCHEMA,
          },
          required: ['reply', 'references'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      reply?: string;
      references?: AiSourceReference[];
    };

    if (!parsed.reply) {
      throw new GeminiServiceError('Gemini API returned an empty response payload.', 502);
    }

    return {
      reply: parsed.reply,
      references: sanitizeSourceReferences(parsed.references),
      model: GEMINI_MODEL_ID,
      generatedAt: new Date().toISOString(),
    };
  });
}

export async function runGeologicalInterpreter(params: {
  observation: string;
  spectralEvidenceProvided: boolean;
  context: MarsContextSnapshot;
}): Promise<GeologicalInterpretationResult> {
  const ai = getGeminiClient();
  const contextJson = formatContextForPrompt(params.context);

  const prompt = `
ACTIVE MARSCOPE CONTEXT:
${contextJson}

GEOLOGICAL OBSERVATION TO INTERPRET:
"${params.observation}"

SPECTRAL / GEOCHEMICAL EVIDENCE PROVIDED IN INPUT: ${params.spectralEvidenceProvided ? 'YES (spectral instrument data cited in observation)' : 'NO (optical/visual or thermal morphological observation only)'}

Analyze this Martian geological observation thoroughly.
CRITICAL SCIENTIFIC RULE:
If no CRISM/OMEGA/APXS/CheMin/PIXL/SHERLOC spectral or geochemical evidence is provided, you MUST explicitly state that mineral composition CANNOT be uniquely identified from visual photographs or texture alone, and explain which spectral instruments are needed.
Distinguish scientific interpretations clearly from verified local USGS SIM 3292 / CRISM context.
`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: prompt,
      config: {
        systemInstruction: CORE_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            epistemicClassification: { type: Type.STRING },
            geologicalSignificance: { type: Type.STRING },
            relevantConcepts: { type: Type.ARRAY, items: { type: Type.STRING } },
            additionalObservationsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedNasaInstruments: { type: Type.ARRAY, items: { type: Type.STRING } },
            scientificUncertainties: { type: Type.ARRAY, items: { type: Type.STRING } },
            spectralEvidenceRuleNote: { type: Type.STRING },
            references: REFERENCE_SCHEMA,
          },
          required: [
            'epistemicClassification',
            'geologicalSignificance',
            'relevantConcepts',
            'additionalObservationsNeeded',
            'recommendedNasaInstruments',
            'scientificUncertainties',
            'spectralEvidenceRuleNote',
            'references',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<GeologicalInterpretationResult>;
    if (!parsed.geologicalSignificance) {
      throw new GeminiServiceError('Gemini Geological Interpreter returned incomplete output.', 502);
    }

    return {
      observationAnalyzed: params.observation,
      epistemicClassification:
        parsed.epistemicClassification ||
        'SCIENTIFIC INTERPRETATION (Grounded in USGS SIM 3292 & MARSCOPE regional context)',
      geologicalSignificance: parsed.geologicalSignificance,
      relevantConcepts: Array.isArray(parsed.relevantConcepts) ? parsed.relevantConcepts : [],
      additionalObservationsNeeded: Array.isArray(parsed.additionalObservationsNeeded)
        ? parsed.additionalObservationsNeeded
        : [],
      recommendedNasaInstruments: Array.isArray(parsed.recommendedNasaInstruments)
        ? parsed.recommendedNasaInstruments
        : [],
      scientificUncertainties: Array.isArray(parsed.scientificUncertainties)
        ? parsed.scientificUncertainties
        : [],
      spectralEvidenceRuleNote:
        parsed.spectralEvidenceRuleNote ||
        'Mineralogical identification requires verified orbital spectroscopy (MRO CRISM, Mars Express OMEGA) or in-situ geochemical/XRD measurements—not optical photography alone.',
      references: sanitizeSourceReferences(parsed.references),
      model: GEMINI_MODEL_ID,
      generatedAt: new Date().toISOString(),
    };
  });
}

export async function runTerrainIntelligence(params: {
  context: MarsContextSnapshot;
}): Promise<TerrainIntelligenceResult> {
  const ai = getGeminiClient();
  const contextJson = formatContextForPrompt(params.context);

  const prompt = `
ACTIVE MARSCOPE DEM & ROUTE TERRAIN CONTEXT:
${contextJson}

Interpret the actual Martian terrain data currently loaded in MARSCOPE:
1. Elevation differences along the route and at the inspected coordinate (use exact meters from context if present; if null/unavailable state that explicitly).
2. Steep sections (>=10° caution or >=15° steep) and finite-difference slope resolution limits (e.g. 200 m/px vs 1 m/px).
3. Terrain variability and local morphology (depression/crater floor, ridge, bench, planar).
4. Potential EVA/rover traverse challenges (boulder resolution limits, thermal inertia/sand traps, dune intersections).
5. Areas or parameters with missing/unverified data.
6. Explicit safety clearance notice: DO NOT claim any route is safe for astronauts from AI or coarse DEM data alone.
`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: prompt,
      config: {
        systemInstruction: CORE_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            elevationDifferences: { type: Type.STRING },
            steepSectionsAnalysis: { type: Type.STRING },
            terrainVariability: { type: Type.STRING },
            potentialTraverseChallenges: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingDataAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            safetyClearanceStatement: { type: Type.STRING },
            references: REFERENCE_SCHEMA,
          },
          required: [
            'elevationDifferences',
            'steepSectionsAnalysis',
            'terrainVariability',
            'potentialTraverseChallenges',
            'missingDataAreas',
            'safetyClearanceStatement',
            'references',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<TerrainIntelligenceResult>;
    if (!parsed.elevationDifferences) {
      throw new GeminiServiceError('Gemini Terrain Intelligence returned incomplete output.', 502);
    }

    return {
      elevationDifferences: parsed.elevationDifferences,
      steepSectionsAnalysis: parsed.steepSectionsAnalysis || 'Slope data unavailable or not sampled.',
      terrainVariability: parsed.terrainVariability || 'Terrain variability assessment pending DEM samples.',
      potentialTraverseChallenges: Array.isArray(parsed.potentialTraverseChallenges)
        ? parsed.potentialTraverseChallenges
        : [],
      missingDataAreas: Array.isArray(parsed.missingDataAreas)
        ? parsed.missingDataAreas
        : params.context.missingDatasets,
      safetyClearanceStatement:
        parsed.safetyClearanceStatement ||
        'NOT CREW CERTIFIED: AI terrain interpretation and orbital DEM profiles cannot certify a Martian route as astronaut-safe without targeted HiRISE stereo verification and local rover/scout reconnaissance.',
      references: sanitizeSourceReferences(parsed.references),
      model: GEMINI_MODEL_ID,
      generatedAt: new Date().toISOString(),
    };
  });
}

export async function runMissionAdvisor(params: {
  context: MarsContextSnapshot;
}): Promise<MissionAdvisorAssessment> {
  const ai = getGeminiClient();
  const contextJson = formatContextForPrompt(params.context);

  const prompt = `
PROPOSED MARTIAN MISSION & LIVE TELEMETRY CONTEXT:
${contextJson}

Generate a rigorous, structured NASA mission planning assessment covering ALL 7 sections:
1. missionOverview (summarize start/destination coordinates, distance km, duration, EVA speed, demonstration vs custom status)
2. scientificObjectives (evaluate stated objective and logged scientific targets with their coordinates/categories)
3. terrainObservations (report strictly observed DEM elevation span, slope angles, and resolution used—or explicitly state if DEM profile is incomplete/unavailable)
4. potentialConcerns (list terrain slope, sand/dune hazards, PLSS duration, radiation baseline limits, thermal extremes)
5. recommendedDatasets (specific NASA/USGS datasets & links needed to resolve unknowns)
6. additionalInvestigations (pre-EVA verification steps such as HiRISE strip slope extraction, CRISM spectral confirmation, THEMIS thermal inertia check)
7. missionLimitations (what this assessment CANNOT verify, including missing live weather/SEP alerts and sub-meter obstacles)
Plus "evidenceVsRecommendationsNote" clearly separating hard observed/calculated inputs from AI planning recommendations.
`;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: prompt,
      config: {
        systemInstruction: CORE_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            missionOverview: { type: Type.STRING },
            scientificObjectives: { type: Type.STRING },
            terrainObservations: { type: Type.STRING },
            potentialConcerns: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedDatasets: { type: Type.ARRAY, items: { type: Type.STRING } },
            additionalInvestigations: { type: Type.ARRAY, items: { type: Type.STRING } },
            missionLimitations: { type: Type.ARRAY, items: { type: Type.STRING } },
            evidenceVsRecommendationsNote: { type: Type.STRING },
            references: REFERENCE_SCHEMA,
          },
          required: [
            'missionOverview',
            'scientificObjectives',
            'terrainObservations',
            'potentialConcerns',
            'recommendedDatasets',
            'additionalInvestigations',
            'missionLimitations',
            'evidenceVsRecommendationsNote',
            'references',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<MissionAdvisorAssessment>;
    if (!parsed.missionOverview) {
      throw new GeminiServiceError('Gemini Mission Advisor returned incomplete output.', 502);
    }

    return {
      missionOverview: parsed.missionOverview,
      scientificObjectives: parsed.scientificObjectives || params.context.missionRoute.scientificObjective,
      terrainObservations:
        parsed.terrainObservations || 'DEM terrain observations unavailable or pending verification.',
      potentialConcerns: Array.isArray(parsed.potentialConcerns) ? parsed.potentialConcerns : [],
      recommendedDatasets: Array.isArray(parsed.recommendedDatasets)
        ? parsed.recommendedDatasets
        : REPUTABLE_SCIENTIFIC_SOURCES.map((s) => `${s.label} (${s.url})`),
      additionalInvestigations: Array.isArray(parsed.additionalInvestigations)
        ? parsed.additionalInvestigations
        : [],
      missionLimitations: Array.isArray(parsed.missionLimitations)
        ? parsed.missionLimitations
        : params.context.missingDatasets,
      evidenceVsRecommendationsNote:
        parsed.evidenceVsRecommendationsNote ||
        'Observed/calculated values (coordinates, spherical distances, DEM slopes, and historical MSL RAD / InSight dates) are distinct from advisory AI planning recommendations, which are non-authoritative.',
      references: sanitizeSourceReferences(parsed.references),
      model: GEMINI_MODEL_ID,
      generatedAt: new Date().toISOString(),
    };
  });
}
