import type {
  AiChatMessage,
  AiSourceReference,
  AiStatusResponse,
  GeologicalInterpretationResult,
  MarsContextSnapshot,
  MissionAdvisorAssessment,
  TerrainIntelligenceResult,
} from '../types/mars';

export interface AiChatApiResponse {
  reply: string;
  references: AiSourceReference[];
  model: string;
  generatedAt: string;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string; details?: string };
  if (!response.ok) {
    throw new Error(data.error || data.details || `AI service request failed (HTTP ${response.status})`);
  }
  return data as T;
}

export async function fetchAiServiceStatus(probe = false): Promise<AiStatusResponse> {
  try {
    const res = await fetch(`/api/ai/status${probe ? '?probe=1' : ''}`);
    if (!res.ok) {
      return {
        configured: false,
        status: 'UNAVAILABLE',
        model: 'gemini-4-hydrogen',
        message: `Backend status endpoint returned HTTP ${res.status}`,
        checkedAt: new Date().toISOString(),
      };
    }
    return (await res.json()) as AiStatusResponse;
  } catch (err) {
    return {
      configured: false,
      status: 'UNAVAILABLE',
      model: 'gemini-4-hydrogen',
      message: err instanceof Error ? err.message : 'Unable to reach AI backend endpoint.',
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function sendAiChatQuestion(params: {
  question: string;
  history: AiChatMessage[];
  context: MarsContextSnapshot;
}): Promise<AiChatApiResponse> {
  const recentHistory = params.history.slice(-8).map((m) => ({
    role: m.role,
    content: m.content,
  }));
  return postJson<AiChatApiResponse>('/api/ai/chat', {
    question: params.question,
    history: recentHistory,
    context: params.context,
  });
}

export async function requestGeologicalInterpretation(params: {
  observation: string;
  spectralEvidenceProvided: boolean;
  context: MarsContextSnapshot;
}): Promise<GeologicalInterpretationResult> {
  return postJson<GeologicalInterpretationResult>('/api/ai/geology-interpret', params);
}

export async function requestTerrainIntelligence(params: {
  context: MarsContextSnapshot;
}): Promise<TerrainIntelligenceResult> {
  return postJson<TerrainIntelligenceResult>('/api/ai/terrain-interpret', params);
}

export async function requestMissionAdvisorAnalysis(params: {
  context: MarsContextSnapshot;
}): Promise<MissionAdvisorAssessment> {
  return postJson<MissionAdvisorAssessment>('/api/ai/mission-advisor', params);
}
