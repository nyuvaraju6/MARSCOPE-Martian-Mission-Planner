import {
  AlertTriangle,
  BookOpen,
  Compass,
  ExternalLink,
  FlaskConical,
  Loader2,
  MessageSquare,
  Mountain,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MARS_MAP_LAYERS } from '../data/marsLayers';
import { MARS_REGIONS } from '../data/marsRegions';
import {
  fetchAiServiceStatus,
  requestGeologicalInterpretation,
  requestTerrainIntelligence,
  sendAiChatQuestion,
} from '../services/aiAssistantClient';
import {
  fetchGeologyPoint,
  fetchInSightHistory,
  fetchMolaPointAnalysis,
  fetchMolaRouteProfile,
} from '../services/nasaDataManager';
import type {
  AiChatMessage,
  AiStatusResponse,
  GeologicalInterpretationResult,
  GeologyPointRecord,
  InSightApiResponse,
  MarsLayerCategory,
  MarsRegion,
  MissionPlan,
  PageId,
  PointTerrainAnalysis,
  RouteTerrainAnalysisResponse,
  TerrainIntelligenceResult,
} from '../types/mars';
import {
  buildMarsContextSnapshot,
  EXAMPLE_AI_QUESTIONS,
  GEOLOGICAL_OBSERVATION_PRESETS,
  REPUTABLE_SCIENTIFIC_SOURCES,
} from '../utils/aiContext';
import { formatMarsCoords } from '../utils/marsGeo';
import { assessRouteRisk, computeTerrainProfileMetrics } from '../utils/terrainAnalysis';

interface MarsAiAssistantPageProps {
  selectedRegion: MarsRegion;
  onSelectRegion: (region: MarsRegion) => void;
  activeLayerId: MarsLayerCategory;
  activeMission: MissionPlan;
  onNavigate: (page: PageId) => void;
}

type AssistantTab = 'conversation' | 'geology' | 'terrain';

export function MarsAiAssistantPage({
  selectedRegion,
  onSelectRegion,
  activeLayerId,
  activeMission,
  onNavigate,
}: MarsAiAssistantPageProps) {
  const [activeTab, setActiveTab] = useState<AssistantTab>('conversation');
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Live MARSCOPE region & coordinate context
  const [inspectCoords, setInspectCoords] = useState<{ lat: number; lng: number }>({
    lat: selectedRegion.lat,
    lng: selectedRegion.lng,
  });
  const [pointAnalysis, setPointAnalysis] = useState<PointTerrainAnalysis | null>(null);
  const [geologyRecord, setGeologyRecord] = useState<GeologyPointRecord | null>(null);
  const [profileResponse, setProfileResponse] = useState<RouteTerrainAnalysisResponse | null>(
    null
  );
  const [insightData, setInsightData] = useState<InSightApiResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Tab 1: Conversational Q&A state
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Tab 2: Geological Interpreter state
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    GEOLOGICAL_OBSERVATION_PRESETS[0].id
  );
  const [geoObservation, setGeoObservation] = useState<string>(
    GEOLOGICAL_OBSERVATION_PRESETS[0].observationText
  );
  const [geoSpectralProvided, setGeoSpectralProvided] = useState<boolean>(
    GEOLOGICAL_OBSERVATION_PRESETS[0].spectralEvidenceProvided
  );
  const [geoResult, setGeoResult] = useState<GeologicalInterpretationResult | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Tab 3: Terrain Intelligence state
  const [terrainResult, setTerrainResult] = useState<TerrainIntelligenceResult | null>(null);
  const [terrainLoading, setTerrainLoading] = useState(false);
  const [terrainError, setTerrainError] = useState<string | null>(null);

  const activeLayer =
    MARS_MAP_LAYERS.find((l) => l.id === activeLayerId) ?? MARS_MAP_LAYERS[0];

  const checkStatus = useCallback(async (probe = false) => {
    setStatusLoading(true);
    const status = await fetchAiServiceStatus(probe);
    setAiStatus(status);
    setStatusLoading(false);
  }, []);

  useEffect(() => {
    checkStatus(false);
  }, [checkStatus]);

  useEffect(() => {
    setInspectCoords({ lat: selectedRegion.lat, lng: selectedRegion.lng });
  }, [selectedRegion]);

  useEffect(() => {
    let cancelled = false;
    setContextLoading(true);
    Promise.all([
      fetchMolaPointAnalysis(inspectCoords.lat, inspectCoords.lng),
      fetchGeologyPoint(inspectCoords.lat, inspectCoords.lng),
      fetchInSightHistory(),
      activeMission.waypoints.length >= 2
        ? fetchMolaRouteProfile(activeMission.waypoints)
        : Promise.resolve(null),
    ])
      .then(([pt, geo, ins, prof]) => {
        if (cancelled) return;
        setPointAnalysis(pt);
        setGeologyRecord(geo);
        setInsightData(ins);
        setProfileResponse(prof);
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inspectCoords.lat, inspectCoords.lng, activeMission.waypoints]);

  const profileMetrics = useMemo(
    () => computeTerrainProfileMetrics(profileResponse?.samples ?? []),
    [profileResponse]
  );

  const riskAssessment = useMemo(
    () =>
      assessRouteRisk({
        waypoints: activeMission.waypoints,
        walkingSpeedKmH: activeMission.walkingSpeedKmH,
        profileResponse,
        profileMetrics,
      }),
    [activeMission.waypoints, activeMission.walkingSpeedKmH, profileResponse, profileMetrics]
  );

  const contextSnapshot = useMemo(
    () =>
      buildMarsContextSnapshot({
        region: selectedRegion,
        inspectedCoords: inspectCoords,
        activeLayer,
        pointAnalysis,
        geologyRecord,
        mission: activeMission,
        profileResponse,
        profileMetrics,
        riskAssessment,
        insightData,
      }),
    [
      selectedRegion,
      inspectCoords,
      activeLayer,
      pointAnalysis,
      geologyRecord,
      activeMission,
      profileResponse,
      profileMetrics,
      riskAssessment,
      insightData,
    ]
  );

  const handleSendQuestion = async (rawQuestion?: string) => {
    const q = (rawQuestion ?? questionInput).trim();
    if (!q || chatLoading) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
      regionName: selectedRegion.name,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!rawQuestion) setQuestionInput('');
    setChatError(null);
    setChatLoading(true);

    try {
      const response = await sendAiChatQuestion({
        question: q,
        history: messages,
        context: contextSnapshot,
      });

      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        createdAt: response.generatedAt,
        regionName: selectedRegion.name,
        references: response.references,
        model: response.model,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to reach Gemini AI service.';
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleInterpretGeology = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = geoObservation.trim();
    if (!trimmed) {
      setGeoError('Enter a geological observation or select a preset before analyzing.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    try {
      const res = await requestGeologicalInterpretation({
        observation: trimmed,
        spectralEvidenceProvided: geoSpectralProvided,
        context: contextSnapshot,
      });
      setGeoResult(res);
    } catch (err) {
      setGeoError(
        err instanceof Error ? err.message : 'Unable to run Gemini Geological Interpreter.'
      );
    } finally {
      setGeoLoading(false);
    }
  };

  const handleInterpretTerrain = async () => {
    setTerrainLoading(true);
    setTerrainError(null);
    try {
      const res = await requestTerrainIntelligence({ context: contextSnapshot });
      setTerrainResult(res);
    } catch (err) {
      setTerrainError(
        err instanceof Error ? err.message : 'Unable to run Gemini Terrain Intelligence.'
      );
    } finally {
      setTerrainLoading(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="pb-6 border-b border-[#D9DDE2] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1.5">
            MARSCOPE Version 4 · AI-Powered Martian Exploration Assistant
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#171717]">
            MARSCOPE Scientific Exploration Assistant
          </h1>
          <p className="text-sm text-[#4B5563] mt-1.5 max-w-3xl">
            Ask planetary science questions grounded in active NASA Mars Trek elevation, USGS SIM
            3292 geology, MRO CRISM/CTX/HiRISE coverage, and historical radiation/weather records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="border border-[#D9DDE2] bg-[#F3F4F6] px-3 py-2 text-xs flex items-center gap-2">
            <span className="font-semibold text-[#4B5563] uppercase">Gemini Backend:</span>
            {statusLoading ? (
              <span className="font-bold text-[#0057B8] uppercase">Checking...</span>
            ) : aiStatus?.status === 'CONNECTED' ? (
              <span
                className="bg-[#0057B8] text-white font-bold uppercase px-2 py-0.5 text-[10px]"
                data-testid="ai-connection-badge"
              >
                Connected · {aiStatus.model}
              </span>
            ) : (
              <span
                className="bg-[#B91C1C] text-white font-bold uppercase px-2 py-0.5 text-[10px]"
                data-testid="ai-connection-badge"
              >
                Unavailable
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => checkStatus(true)}
            disabled={statusLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#D9DDE2] bg-white text-xs font-semibold uppercase tracking-wide text-[#171717] hover:bg-[#F3F4F6] cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#0057B8] ${statusLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Test Gemini Link</span>
          </button>
        </div>
      </div>

      {/* Backend Unavailable Warning (if unconfigured/unreachable) */}
      {aiStatus && aiStatus.status === 'UNAVAILABLE' && (
        <div
          role="alert"
          className="border border-[#B91C1C] bg-[#FEF2F2] p-4 text-xs text-[#171717] flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold uppercase text-[#B91C1C]">
              Gemini AI Service Connection Notice
            </p>
            <p className="mt-0.5 text-[#374151]">{aiStatus.message}</p>
          </div>
        </div>
      )}

      {/* Active Region & Scientific Data Context Indicator */}
      <section
        aria-labelledby="ai-context-indicator-heading"
        className="border border-[#D9DDE2] bg-[#F3F4F6] p-4 space-y-3"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#D9DDE2]">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <label
              id="ai-context-indicator-heading"
              htmlFor="ai-region-select"
              className="text-xs font-bold uppercase tracking-wider text-[#0057B8]"
            >
              Active Context Region:
            </label>
            <select
              id="ai-region-select"
              value={selectedRegion.id}
              onChange={(e) => {
                const found = MARS_REGIONS.find((r) => r.id === e.target.value);
                if (found) onSelectRegion(found);
              }}
              className="w-full sm:w-auto max-w-full min-w-0 border border-[#D9DDE2] bg-white px-3 py-1.5 text-xs font-semibold text-[#171717]"
            >
              {MARS_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.quadrangle})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-[#4B5563]">
            {contextLoading
              ? 'Synchronizing live NASA Trek & USGS regional context...'
              : `Context synchronized · ${formatMarsCoords(inspectCoords.lat, inspectCoords.lng, 4)}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-white border border-[#D9DDE2] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#4B5563] mb-0.5">
              Elevation &amp; Slope
            </p>
            <p className="font-bold font-mono text-[#171717]">
              {pointAnalysis?.primaryElevationM !== null && pointAnalysis?.primaryElevationM !== undefined
                ? `${pointAnalysis.primaryElevationM.toFixed(1)} m`
                : 'UNAVAILABLE'}
            </p>
            <p className="text-[11px] text-[#4B5563] mt-0.5">
              {pointAnalysis?.slopeDeg !== null && pointAnalysis?.slopeDeg !== undefined
                ? `Slope: ${pointAnalysis.slopeDeg.toFixed(2)}° (${pointAnalysis.dataAvailability})`
                : 'Waiting / Unavailable'}
            </p>
          </div>

          <div className="bg-white border border-[#D9DDE2] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#4B5563] mb-0.5">
              Geology (USGS SIM 3292)
            </p>
            <p className="font-bold text-[#171717]">
              {geologyRecord?.unitCode ? `Unit ${geologyRecord.unitCode}` : 'UNAVAILABLE'}
            </p>
            <p className="text-[11px] text-[#4B5563] truncate mt-0.5">
              {geologyRecord?.unitDescription ?? '1:20M global bedrock classification'}
            </p>
          </div>

          <div className="bg-white border border-[#D9DDE2] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#4B5563] mb-0.5">
              Active Map Layer
            </p>
            <p className="font-bold text-[#171717] truncate">{activeLayer.shortLabel}</p>
            <p className="text-[11px] text-[#4B5563] truncate mt-0.5">
              {activeLayer.resolution}
            </p>
          </div>

          <div className="bg-white border border-[#D9DDE2] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#4B5563] mb-0.5">
              Active Route Context
            </p>
            <p className="font-bold text-[#171717] truncate">{activeMission.name}</p>
            <p className="text-[11px] font-mono text-[#4B5563] mt-0.5">
              {riskAssessment.totalDistanceKm.toFixed(2)} km · {activeMission.waypoints.length} waypoints
            </p>
          </div>

          <div className="bg-white border border-[#D9DDE2] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#4B5563] mb-0.5">
              Data Transparency
            </p>
            <p className="font-bold text-[#F47721]">
              {activeMission.isDemonstration ? 'DEMONSTRATION ROUTE' : 'DRAFT ROUTE'}
            </p>
            <p className="text-[11px] text-[#4B5563] mt-0.5">
              Real-time weather &amp; SEP alerts disconnected
            </p>
          </div>
        </div>
      </section>

      {/* Workbench Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#D9DDE2] pb-3" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'conversation'}
          onClick={() => setActiveTab('conversation')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide border cursor-pointer ${
            activeTab === 'conversation'
              ? 'bg-[#0057B8] text-white border-[#0057B8]'
              : 'bg-white text-[#171717] border-[#D9DDE2] hover:bg-[#F3F4F6]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>1. Scientific Q&amp;A Assistant</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'geology'}
          onClick={() => setActiveTab('geology')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide border cursor-pointer ${
            activeTab === 'geology'
              ? 'bg-[#0057B8] text-white border-[#0057B8]'
              : 'bg-white text-[#171717] border-[#D9DDE2] hover:bg-[#F3F4F6]'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
          <span>2. Geological Interpreter</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'terrain'}
          onClick={() => setActiveTab('terrain')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide border cursor-pointer ${
            activeTab === 'terrain'
              ? 'bg-[#0057B8] text-white border-[#0057B8]'
              : 'bg-white text-[#171717] border-[#D9DDE2] hover:bg-[#F3F4F6]'
          }`}
        >
          <Mountain className="w-3.5 h-3.5" aria-hidden="true" />
          <span>3. Terrain Intelligence</span>
        </button>
      </div>

      {/* Main Split Content + Reputable Sources Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* ==================================================
              TAB 1: CONVERSATIONAL SCIENTIFIC EXPLORATION ASSISTANT
              ================================================== */}
          {activeTab === 'conversation' && (
            <section
              aria-labelledby="ai-chat-heading"
              className="border border-[#D9DDE2] bg-white p-5 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D9DDE2]">
                <div>
                  <h2 id="ai-chat-heading" className="text-base font-bold text-[#171717]">
                    Scientific Exploration Dialogue
                  </h2>
                  <p className="text-xs text-[#4B5563]">
                    Multi-turn scientific conversation grounded in your selected region and active
                    MARSCOPE telemetry.
                  </p>
                </div>

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      setChatError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D9DDE2] bg-white text-xs font-semibold text-[#374151] hover:bg-[#F3F4F6] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear Session</span>
                  </button>
                )}
              </div>

              {/* Suggested Scientific Question Chips */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#0057B8]">
                  Suggested Planetary Science Questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_AI_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={chatLoading}
                      onClick={() => handleSendQuestion(q)}
                      className="text-left px-3 py-1.5 border border-[#D9DDE2] bg-[#F9FAFB] text-xs font-medium text-[#171717] hover:border-[#0057B8] hover:text-[#0057B8] disabled:opacity-50 cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat History */}
              <div
                className="border border-[#D9DDE2] bg-white divide-y divide-[#D9DDE2] max-h-[520px] overflow-y-auto"
                data-testid="ai-chat-history"
              >
                {messages.length === 0 ? (
                  <div className="p-6 text-xs text-[#4B5563] space-y-2">
                    <p className="font-semibold text-[#171717]">
                      Session ready for {selectedRegion.name}.
                    </p>
                    <p>
                      Select one of the scientific questions above or ask about regional geology,
                      MOLA/HRSC elevation and slopes, THEMIS daytime vs. nighttime infrared physics,
                      CRISM mineralogy, or EVA route planning.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <article
                      key={msg.id}
                      data-testid={`chat-msg-${msg.role}`}
                      className={`p-4 space-y-2 ${
                        msg.role === 'user' ? 'bg-[#F9FAFB]' : 'bg-white'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span
                          className={`font-bold uppercase tracking-wider ${
                            msg.role === 'user' ? 'text-[#171717]' : 'text-[#0057B8]'
                          }`}
                        >
                          {msg.role === 'user'
                            ? 'Researcher Query'
                            : 'MARSCOPE Scientific Exploration Assistant'}
                        </span>
                        <span className="font-mono text-[#6B7280]">
                          {msg.regionName ? `${msg.regionName} · ` : ''}
                          {msg.createdAt.slice(11, 19)} UTC
                          {msg.model ? ` · ${msg.model}` : ''}
                        </span>
                      </div>

                      <div className="text-sm text-[#171717] leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      {msg.references && msg.references.length > 0 && (
                        <div className="pt-2 border-t border-[#E5E7EB] flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-[#4B5563]">Sources:</span>
                          {msg.references.map((ref) => (
                            <a
                              key={ref.url}
                              href={ref.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 border border-[#D9DDE2] bg-[#F9FAFB] text-[#0057B8] hover:underline"
                            >
                              <span>{ref.label}</span>
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))
                )}

                {chatLoading && (
                  <div className="p-4 bg-white flex items-center gap-2.5 text-xs text-[#0057B8] font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>
                      Analyzing active MARSCOPE datasets with Gemini AI ({selectedRegion.name})...
                    </span>
                  </div>
                )}
              </div>

              {chatError && (
                <div
                  role="alert"
                  className="border border-[#B91C1C] bg-[#FEF2F2] p-3 text-xs text-[#171717] flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
                  <span>{chatError}</span>
                </div>
              )}

              {/* Question Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion();
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <label htmlFor="ai-question-input" className="sr-only">
                  Ask the MARSCOPE Scientific Exploration Assistant
                </label>
                <input
                  id="ai-question-input"
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder={`Ask about ${selectedRegion.name}, DEM slope, mineralogy, or EVA planning...`}
                  className="flex-1 border border-[#D9DDE2] px-3 py-2.5 text-sm text-[#171717] focus:border-[#0057B8] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !questionInput.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ask Assistant</span>
                </button>
              </form>
            </section>
          )}

          {/* ==================================================
              TAB 2: GEOLOGICAL INTERPRETER
              ================================================== */}
          {activeTab === 'geology' && (
            <section
              aria-labelledby="geo-interpreter-heading"
              className="border border-[#D9DDE2] bg-white p-5 space-y-5"
            >
              <div className="pb-3 border-b border-[#D9DDE2]">
                <h2 id="geo-interpreter-heading" className="text-base font-bold text-[#171717]">
                  Martian Geological Interpreter
                </h2>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Select a geological observation preset or enter field/orbital morphology notes.
                  Strictly separates visual texture from spectral mineral identification.
                </p>
              </div>

              <form onSubmit={handleInterpretGeology} className="space-y-4">
                <div>
                  <label
                    htmlFor="geo-preset-select"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Select Representative Observation
                  </label>
                  <select
                    id="geo-preset-select"
                    value={selectedPresetId}
                    onChange={(e) => {
                      const preset = GEOLOGICAL_OBSERVATION_PRESETS.find(
                        (p) => p.id === e.target.value
                      );
                      setSelectedPresetId(e.target.value);
                      if (preset) {
                        setGeoObservation(preset.observationText);
                        setGeoSpectralProvided(preset.spectralEvidenceProvided);
                      }
                    }}
                    className="w-full border border-[#D9DDE2] bg-white px-3 py-2 text-xs font-semibold text-[#171717]"
                  >
                    {GEOLOGICAL_OBSERVATION_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.title} ({preset.regionHint})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="geo-observation-text"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Geological Observation Description
                  </label>
                  <textarea
                    id="geo-observation-text"
                    rows={4}
                    value={geoObservation}
                    onChange={(e) => setGeoObservation(e.target.value)}
                    className="w-full border border-[#D9DDE2] px-3 py-2 text-xs text-[#171717]"
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-[#171717] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geoSpectralProvided}
                    onChange={(e) => setGeoSpectralProvided(e.target.checked)}
                    className="accent-[#0057B8]"
                  />
                  <span>
                    Observation includes verified spectral or geochemical evidence (CRISM / OMEGA /
                    APXS / CheMin)
                  </span>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-[#4B5563]">
                    Rule enforced: Optical images alone cannot confirm mineral species.
                  </span>
                  <button
                    type="submit"
                    disabled={geoLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] disabled:opacity-50 cursor-pointer"
                  >
                    {geoLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{geoLoading ? 'Interpreting...' : 'Interpret Observation'}</span>
                  </button>
                </div>
              </form>

              {geoError && (
                <div role="alert" className="border border-[#B91C1C] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
                  {geoError}
                </div>
              )}

              {geoResult && (
                <div className="border-t border-[#D9DDE2] pt-4 space-y-4 text-xs" data-testid="geo-interpreter-result">
                  <div className="flex flex-wrap items-center justify-between gap-2 border border-[#0057B8] bg-[#EFF6FF] px-3 py-2">
                    <span className="font-bold uppercase text-[#0057B8] text-[11px] leading-snug">
                      {geoResult.epistemicClassification}
                    </span>
                    <span className="font-mono text-[#4B5563] shrink-0">{geoResult.model}</span>
                  </div>

                  <div className="border border-[#F47721] bg-[#FFF7ED] p-3 text-[#171717]">
                    <p className="font-bold uppercase text-[#9A3412] mb-0.5">
                      Spectral Evidence &amp; Mineral Identification Standard
                    </p>
                    <p>{geoResult.spectralEvidenceRuleNote}</p>
                  </div>

                  <div>
                    <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1">
                      Possible Geological Significance
                    </h3>
                    <p className="text-[#171717] leading-relaxed">{geoResult.geologicalSignificance}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-[#D9DDE2] p-3 bg-[#F9FAFB]">
                      <h3 className="font-bold uppercase tracking-wider text-[#171717] mb-1.5">
                        Relevant Scientific Concepts
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-[#374151]">
                        {geoResult.relevantConcepts.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-[#D9DDE2] p-3 bg-[#F9FAFB]">
                      <h3 className="font-bold uppercase tracking-wider text-[#171717] mb-1.5">
                        Recommended NASA Instruments
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-[#374151]">
                        {geoResult.recommendedNasaInstruments.map((inst, i) => (
                          <li key={i}>{inst}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-[#D9DDE2] p-3 bg-white">
                      <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1.5">
                        Additional Observations Needed
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-[#374151]">
                        {geoResult.additionalObservationsNeeded.map((obs, i) => (
                          <li key={i}>{obs}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-[#D9DDE2] p-3 bg-white">
                      <h3 className="font-bold uppercase tracking-wider text-[#B91C1C] mb-1.5">
                        Scientific Uncertainties
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-[#374151]">
                        {geoResult.scientificUncertainties.map((u, i) => (
                          <li key={i}>{u}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              TAB 3: TERRAIN INTELLIGENCE
              ================================================== */}
          {activeTab === 'terrain' && (
            <section
              aria-labelledby="terrain-intel-heading"
              className="border border-[#D9DDE2] bg-white p-5 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DDE2]">
                <div>
                  <h2 id="terrain-intel-heading" className="text-base font-bold text-[#171717]">
                    AI Terrain Intelligence
                  </h2>
                  <p className="text-xs text-[#4B5563]">
                    Interprets live MOLA/HRSC &amp; Gale 1 m/px DEM elevations, route slope legs,
                    and unresolved data gaps.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleInterpretTerrain}
                  disabled={terrainLoading || contextLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {terrainLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Mountain className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {terrainLoading ? 'Interpreting DEM...' : 'Analyze Active Terrain'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="border border-[#D9DDE2] bg-[#F9FAFB] p-3">
                  <p className="text-[11px] text-[#4B5563] uppercase">Lowest Route Elev.</p>
                  <p className="font-mono font-bold text-[#171717] mt-0.5">
                    {profileMetrics.lowestPointM !== null
                      ? `${profileMetrics.lowestPointM.toFixed(1)} m`
                      : 'N/A'}
                  </p>
                </div>
                <div className="border border-[#D9DDE2] bg-[#F9FAFB] p-3">
                  <p className="text-[11px] text-[#4B5563] uppercase">Highest Route Elev.</p>
                  <p className="font-mono font-bold text-[#171717] mt-0.5">
                    {profileMetrics.highestPointM !== null
                      ? `${profileMetrics.highestPointM.toFixed(1)} m`
                      : 'N/A'}
                  </p>
                </div>
                <div className="border border-[#D9DDE2] bg-[#F9FAFB] p-3">
                  <p className="text-[11px] text-[#4B5563] uppercase">Route Relief Span</p>
                  <p className="font-mono font-bold text-[#171717] mt-0.5">
                    {profileMetrics.elevationDifferenceM !== null
                      ? `${profileMetrics.elevationDifferenceM.toFixed(1)} m`
                      : 'N/A'}
                  </p>
                </div>
                <div className="border border-[#D9DDE2] bg-[#F9FAFB] p-3">
                  <p className="text-[11px] text-[#4B5563] uppercase">Max Sampled Slope</p>
                  <p className="font-mono font-bold text-[#171717] mt-0.5">
                    {profileMetrics.maxSlopeDeg !== null
                      ? `${profileMetrics.maxSlopeDeg.toFixed(2)}°`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {terrainError && (
                <div role="alert" className="border border-[#B91C1C] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
                  {terrainError}
                </div>
              )}

              {terrainResult && (
                <div className="space-y-4 text-xs border-t border-[#D9DDE2] pt-4" data-testid="terrain-intel-result">
                  <div className="border border-[#B91C1C] bg-[#FEF2F2] p-3 text-[#171717]">
                    <p className="font-bold uppercase text-[#B91C1C] mb-0.5">
                      Safety Clearance Boundary
                    </p>
                    <p>{terrainResult.safetyClearanceStatement}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-[#D9DDE2] p-3">
                      <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1">
                        Elevation Differences
                      </h3>
                      <p className="text-[#171717] leading-relaxed">
                        {terrainResult.elevationDifferences}
                      </p>
                    </div>
                    <div className="border border-[#D9DDE2] p-3">
                      <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1">
                        Steep Sections Analysis
                      </h3>
                      <p className="text-[#171717] leading-relaxed">
                        {terrainResult.steepSectionsAnalysis}
                      </p>
                    </div>
                  </div>

                  <div className="border border-[#D9DDE2] p-3 bg-[#F9FAFB]">
                    <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1">
                      Terrain Variability &amp; Morphology
                    </h3>
                    <p className="text-[#171717] leading-relaxed">
                      {terrainResult.terrainVariability}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-[#F47721] bg-[#FFF7ED] p-3">
                      <h3 className="font-bold uppercase tracking-wider text-[#9A3412] mb-1.5">
                        Potential Traverse Challenges
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-[#171717]">
                        {terrainResult.potentialTraverseChallenges.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-[#D9DDE2] bg-white p-3">
                      <h3 className="font-bold uppercase tracking-wider text-[#B91C1C] mb-1.5">
                        Areas With Missing / Unresolved Data
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-[#374151]">
                        {terrainResult.missingDataAreas.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right Column: Epistemic Standards, Missing Datasets, & Official Sources */}
        <aside className="lg:col-span-4 space-y-5">
          <section className="border border-[#D9DDE2] bg-white p-4 space-y-3 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#171717] border-b border-[#D9DDE2] pb-2">
              Scientific Evidence Standards
            </h2>
            <p className="text-[#4B5563] leading-relaxed">
              The MARSCOPE AI Assistant separates every output into six explicit categories so no
              hypotheses or demonstration estimates are mistaken for verified measurements:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-[#171717] font-medium">
              <li>Verified Scientific Observations (live NASA/USGS queries)</li>
              <li>Historical NASA Measurements (MSL RAD, InSight APSS)</li>
              <li>Calculated Values (spherical distance &amp; DEM slope)</li>
              <li>Demonstration Data (default Gale Crater plan)</li>
              <li>Scientific Interpretations (geological &amp; mobility hypotheses)</li>
              <li>Unknown / Unavailable Information (unqueried or offline feeds)</li>
            </ol>
          </section>

          <section className="border border-[#F47721] bg-[#FFF7ED] p-4 space-y-2 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#9A3412]">
              Active Missing / Limited Datasets
            </h2>
            <ul className="list-disc pl-4 space-y-1 text-[#171717]">
              {contextSnapshot.missingDatasets.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="border border-[#D9DDE2] bg-white p-4 space-y-3 text-xs">
            <div className="flex items-center gap-1.5 border-b border-[#D9DDE2] pb-2">
              <BookOpen className="w-4 h-4 text-[#0057B8]" aria-hidden="true" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                Official Scientific Source Directory
              </h2>
            </div>
            <ul className="space-y-2.5">
              {REPUTABLE_SCIENTIFIC_SOURCES.map((src) => (
                <li key={src.url} className="border-b border-[#F3F4F6] last:border-b-0 pb-2 last:pb-0">
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-[#0057B8] hover:underline"
                  >
                    <span>{src.label}</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                  <p className="text-[11px] text-[#4B5563] mt-0.5">{src.relevance}</p>
                </li>
              ))}
            </ul>

            <div className="pt-2 border-t border-[#D9DDE2] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="px-3 py-1.5 border border-[#0057B8] text-[#0057B8] font-semibold uppercase hover:bg-[#0057B8] hover:text-white cursor-pointer"
              >
                Open Mission Planner
              </button>
              <button
                type="button"
                onClick={() => onNavigate('intelligence')}
                className="px-3 py-1.5 border border-[#D9DDE2] text-[#171717] font-semibold uppercase hover:bg-[#F3F4F6] cursor-pointer"
              >
                <Compass className="w-3 h-3 inline mr-1" aria-hidden="true" />
                Mission Intelligence
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
