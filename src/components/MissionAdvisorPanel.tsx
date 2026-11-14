import { AlertTriangle, BookOpen, Compass, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { requestMissionAdvisorAnalysis } from '../services/aiAssistantClient';
import type {
  InSightApiResponse,
  MarsMapLayer,
  MarsRegion,
  MissionAdvisorAssessment,
  MissionPlan,
  PageId,
  RouteRiskAssessment,
  RouteTerrainAnalysisResponse,
  TerrainProfileMetrics,
} from '../types/mars';
import { buildMarsContextSnapshot } from '../utils/aiContext';

interface MissionAdvisorPanelProps {
  region: MarsRegion;
  activeLayer: MarsMapLayer;
  mission: MissionPlan;
  profileResponse: RouteTerrainAnalysisResponse | null;
  profileMetrics: TerrainProfileMetrics;
  riskAssessment: RouteRiskAssessment;
  insightData: InSightApiResponse | null;
  onOpenAiAssistant?: () => void;
  onNavigate?: (page: PageId) => void;
}

export function MissionAdvisorPanel({
  region,
  activeLayer,
  mission,
  profileResponse,
  profileMetrics,
  riskAssessment,
  insightData,
  onOpenAiAssistant,
}: MissionAdvisorPanelProps) {
  const [assessment, setAssessment] = useState<MissionAdvisorAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAnalyzeRoute = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const startWp = mission.waypoints[0];
      const context = buildMarsContextSnapshot({
        region,
        inspectedCoords: startWp
          ? { lat: startWp.lat, lng: startWp.lng }
          : { lat: region.lat, lng: region.lng },
        activeLayer,
        pointAnalysis: null,
        geologyRecord: null,
        mission,
        profileResponse,
        profileMetrics,
        riskAssessment,
        insightData,
      });

      const result = await requestMissionAdvisorAnalysis({ context });
      setAssessment(result);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to reach Gemini AI Mission Advisor service.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="ai-mission-advisor"
      aria-labelledby="ai-mission-advisor-heading"
      className="border border-[#D9DDE2] bg-white p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9DDE2]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8]">
            MARSCOPE Version 4 · Gemini Mission Decision Support
          </p>
          <h2 id="ai-mission-advisor-heading" className="text-base font-bold text-[#171717]">
            AI Mission Advisor
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Examines active waypoints, distance, live DEM terrain slopes, scientific targets, and
            missing datasets to produce a structured non-certifying planning assessment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenAiAssistant && (
            <button
              type="button"
              onClick={onOpenAiAssistant}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#D9DDE2] bg-white text-[#171717] text-xs font-semibold uppercase tracking-wide hover:bg-[#F3F4F6] cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#0057B8]" aria-hidden="true" />
              <span>Full AI Assistant</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleAnalyzeRoute}
            disabled={loading || mission.waypoints.length < 2}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{loading ? 'Analyzing Route...' : 'Analyze Proposed Route'}</span>
          </button>
        </div>
      </div>

      {mission.waypoints.length < 2 && (
        <p className="text-xs text-[#4B5563] bg-[#F3F4F6] border border-[#D9DDE2] p-3">
          Place at least 2 waypoints (start and destination) on the planner map to run the AI
          Mission Advisor analysis.
        </p>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="border border-[#B91C1C] bg-[#FEF2F2] p-3 text-xs text-[#171717] flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold uppercase text-[#B91C1C]">
              Gemini AI Mission Advisor Unavailable
            </p>
            <p className="mt-0.5 text-[#374151]">{errorMsg}</p>
          </div>
        </div>
      )}

      {!assessment && !loading && !errorMsg && mission.waypoints.length >= 2 && (
        <div className="border border-[#D9DDE2] bg-[#F9FAFB] p-4 text-xs text-[#4B5563]">
          Click <strong className="text-[#171717]">Analyze Proposed Route</strong> to evaluate{' '}
          <strong className="text-[#171717]">{mission.name}</strong> (
          {riskAssessment.totalDistanceKm.toFixed(2)} km, {mission.waypoints.length} waypoints,{' '}
          {mission.scientificTargets.length} targets) using live MARSCOPE terrain context via
          server-side Gemini AI.
        </div>
      )}

      {assessment && (
        <div className="space-y-4 text-xs" data-testid="mission-advisor-result">
          {/* Evidence vs Recommendations Notice */}
          <div className="border border-[#0057B8] bg-[#EFF6FF] p-3 text-[#171717]">
            <p className="font-bold uppercase tracking-wider text-[#0057B8] mb-1">
              Evidence vs. AI Recommendations Distinction
            </p>
            <p className="leading-relaxed text-[#374151]">
              {assessment.evidenceVsRecommendationsNote}
            </p>
            <p className="text-[11px] font-mono text-[#4B5563] mt-1.5">
              Model: {assessment.model} · Generated {assessment.generatedAt.slice(0, 19).replace('T', ' ')} UTC
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#D9DDE2] p-3.5 bg-white">
              <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1.5">
                MISSION OVERVIEW
              </h3>
              <p className="text-[#171717] leading-relaxed">{assessment.missionOverview}</p>
            </div>

            <div className="border border-[#D9DDE2] p-3.5 bg-white">
              <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1.5">
                SCIENTIFIC OBJECTIVES
              </h3>
              <p className="text-[#171717] leading-relaxed">{assessment.scientificObjectives}</p>
            </div>
          </div>

          <div className="border border-[#D9DDE2] p-3.5 bg-white">
            <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1.5">
              TERRAIN OBSERVATIONS
            </h3>
            <p className="text-[#171717] leading-relaxed">{assessment.terrainObservations}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#F47721] bg-[#FFF7ED] p-3.5">
              <h3 className="font-bold uppercase tracking-wider text-[#9A3412] mb-1.5">
                POTENTIAL CONCERNS
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-[#171717]">
                {assessment.potentialConcerns.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="border border-[#D9DDE2] bg-[#F9FAFB] p-3.5">
              <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1.5">
                RECOMMENDED DATASETS
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-[#171717]">
                {assessment.recommendedDatasets.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="border border-[#D9DDE2] bg-white p-3.5">
              <h3 className="font-bold uppercase tracking-wider text-[#0057B8] mb-1.5">
                ADDITIONAL INVESTIGATIONS
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-[#171717]">
                {assessment.additionalInvestigations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="border border-[#B91C1C] bg-[#FEF2F2] p-3.5">
              <h3 className="font-bold uppercase tracking-wider text-[#B91C1C] mb-1.5">
                MISSION LIMITATIONS
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-[#171717]">
                {assessment.missionLimitations.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {assessment.references.length > 0 && (
            <div className="border-t border-[#D9DDE2] pt-3">
              <p className="font-bold uppercase tracking-wider text-[#4B5563] mb-2 inline-flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#0057B8]" aria-hidden="true" />
                <span>Referenced Scientific Sources</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {assessment.references.map((ref) => (
                  <a
                    key={ref.url}
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#D9DDE2] bg-[#F9FAFB] text-[#0057B8] font-semibold hover:underline"
                  >
                    <span>{ref.label}</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
