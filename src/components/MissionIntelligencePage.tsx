import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Database,
  ExternalLink,
  FileText,
  FlaskConical,
  Layers,
  Mountain,
  Play,
  Radiation,
  RefreshCw,
  ShieldAlert,
  Thermometer,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MARS_MAP_LAYERS } from '../data/marsLayers';
import { MARS_REGIONS } from '../data/marsRegions';
import {
  NASA_DATA_MODULES,
  buildProvenanceLedger,
  checkHiRiseRegionalCoverage,
  fetchGeologyPoint,
  fetchInSightHistory,
  fetchMolaPointAnalysis,
  fetchMolaRouteProfile,
  getCuriosityRadBaseline,
  verifyAllNasaServices,
} from '../services/nasaDataManager';
import type {
  GeologyPointRecord,
  InSightApiResponse,
  MarsLayerCategory,
  MarsRegion,
  MissionPlan,
  NasaModuleAvailability,
  NasaServicesStatusResponse,
  PageId,
  PointTerrainAnalysis,
  RouteTerrainAnalysisResponse,
  ScenarioSimulationResult,
  ScenarioSimulatorConfig,
  SimulatorEquipmentOption,
} from '../types/mars';
import { formatMarsCoords } from '../utils/marsGeo';
import {
  buildScenarioSimulation,
  generateMissionRecommendations,
} from '../utils/missionIntelligence';
import { assessRouteRisk, computeTerrainProfileMetrics } from '../utils/terrainAnalysis';
import { CompareLayersPanel } from './CompareLayersPanel';
import { MissionReportModal } from './MissionReportModal';

interface MissionIntelligencePageProps {
  selectedRegion: MarsRegion;
  onSelectRegion: (region: MarsRegion) => void;
  activeLayerId: MarsLayerCategory;
  activeMission: MissionPlan;
  onLoadSimulatedMission: (mission: MissionPlan, region: MarsRegion) => void;
  onNavigate: (page: PageId) => void;
}

const EQUIPMENT_OPTIONS: SimulatorEquipmentOption[] = [
  'Pressurized EVA Rover',
  'Unassisted Suited EVA Only',
  'Portable Drill & Spectrometer',
  'HiRISE Local Slope Stereo Package',
  'Solar Storm Dosimeter & Contingency Shelter',
];

function statusBadgeStyle(status: NasaModuleAvailability): string {
  if (status === 'AVAILABLE') return 'bg-[#0057B8] text-white';
  if (status === 'PARTIAL COVERAGE' || status === 'HISTORICAL ARCHIVE') {
    return 'bg-[#F47721] text-white';
  }
  if (status === 'CHECKING') return 'bg-[#6B7280] text-white';
  return 'bg-[#B91C1C] text-white';
}

export function MissionIntelligencePage({
  selectedRegion,
  onSelectRegion,
  activeLayerId,
  activeMission,
  onLoadSimulatedMission,
  onNavigate,
}: MissionIntelligencePageProps) {
  const [inspectCoords, setInspectCoords] = useState<{ lat: number; lng: number }>({
    lat: selectedRegion.lat,
    lng: selectedRegion.lng,
  });

  const [serviceStatus, setServiceStatus] = useState<NasaServicesStatusResponse | null>(null);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [pointAnalysis, setPointAnalysis] = useState<PointTerrainAnalysis | null>(null);
  const [pointLoading, setPointLoading] = useState(true);

  const [geologyRecord, setGeologyRecord] = useState<GeologyPointRecord | null>(null);
  const [geologyLoading, setGeologyLoading] = useState(true);

  const [profileResponse, setProfileResponse] = useState<RouteTerrainAnalysisResponse | null>(null);
  const [insightData, setInsightData] = useState<InSightApiResponse | null>(null);

  const [reportOpen, setReportOpen] = useState(false);

  // Simulator state initialized from selectedRegion & activeMission
  const [simConfig, setSimConfig] = useState<ScenarioSimulatorConfig>(() => ({
    regionId: selectedRegion.id,
    startLat: activeMission.waypoints[0]?.lat ?? selectedRegion.lat,
    startLng: activeMission.waypoints[0]?.lng ?? selectedRegion.lng,
    destLat:
      activeMission.waypoints[activeMission.waypoints.length - 1]?.lat ??
      Number((selectedRegion.lat - 0.12).toFixed(4)),
    destLng:
      activeMission.waypoints[activeMission.waypoints.length - 1]?.lng ??
      Number((selectedRegion.lng - 0.03).toFixed(4)),
    waypointCount: Math.max(2, Math.min(8, activeMission.waypoints.length || 4)),
    walkingSpeedKmH: activeMission.walkingSpeedKmH || 2.0,
    scientificObjective: activeMission.scientificObjective || selectedRegion.scientificInterest,
    equipment: ['Portable Drill & Spectrometer', 'HiRISE Local Slope Stereo Package'],
  }));
  const [simResult, setSimResult] = useState<ScenarioSimulationResult | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  const activeLayer = MARS_MAP_LAYERS.find((l) => l.id === activeLayerId) ?? MARS_MAP_LAYERS[0];
  const radBaseline = getCuriosityRadBaseline();
  const hiriseRegional = checkHiRiseRegionalCoverage(selectedRegion);

  // Sync inspect coords when selected region changes
  useEffect(() => {
    setInspectCoords({ lat: selectedRegion.lat, lng: selectedRegion.lng });
  }, [selectedRegion.id, selectedRegion.lat, selectedRegion.lng]);

  const loadIntelligenceCoordinate = useCallback(
    async (lat: number, lng: number, forceRefresh = false) => {
      setPointLoading(true);
      setGeologyLoading(true);
      const [ptRes, geoRes] = await Promise.allSettled([
        fetchMolaPointAnalysis(lat, lng, forceRefresh),
        fetchGeologyPoint(lat, lng, forceRefresh),
      ]);
      if (ptRes.status === 'fulfilled') {
        setPointAnalysis(ptRes.value);
      }
      if (geoRes.status === 'fulfilled') {
        setGeologyRecord(geoRes.value);
      }
      setPointLoading(false);
      setGeologyLoading(false);
    },
    []
  );

  const loadGlobalServices = useCallback(async (forceRefresh = false) => {
    setServicesLoading(true);
    const [svcRes, insRes] = await Promise.allSettled([
      verifyAllNasaServices(forceRefresh),
      fetchInSightHistory(forceRefresh),
    ]);
    if (svcRes.status === 'fulfilled') setServiceStatus(svcRes.value);
    if (insRes.status === 'fulfilled') setInsightData(insRes.value);
    setServicesLoading(false);
  }, []);

  useEffect(() => {
    loadGlobalServices(false);
  }, [loadGlobalServices]);

  useEffect(() => {
    loadIntelligenceCoordinate(inspectCoords.lat, inspectCoords.lng, false);
  }, [inspectCoords.lat, inspectCoords.lng, loadIntelligenceCoordinate]);

  useEffect(() => {
    let cancelled = false;
    if (activeMission.waypoints.length < 2) {
      setProfileResponse(null);
      return;
    }
    fetchMolaRouteProfile(activeMission.waypoints)
      .then((data) => {
        if (!cancelled) setProfileResponse(data);
      })
      .catch(() => {
        if (!cancelled) setProfileResponse(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMission.waypoints]);

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

  const recommendations = useMemo(
    () =>
      generateMissionRecommendations({
        region: selectedRegion,
        mission: activeMission,
        pointAnalysis,
        geologyRecord,
        profileResponse,
        profileMetrics,
        riskAssessment,
        insightData,
      }),
    [
      selectedRegion,
      activeMission,
      pointAnalysis,
      geologyRecord,
      profileResponse,
      profileMetrics,
      riskAssessment,
      insightData,
    ]
  );

  const provenanceRecords = useMemo(
    () =>
      buildProvenanceLedger({
        serviceStatus,
        pointAnalysis,
        geologyRecord,
        insightData,
      }),
    [serviceStatus, pointAnalysis, geologyRecord, insightData]
  );

  // Initialize default scenario output once data settles
  useEffect(() => {
    if (!simResult) {
      setSimResult(
        buildScenarioSimulation({
          config: simConfig,
          insightData,
          profileResponse,
          profileMetrics,
        })
      );
    }
  }, [simConfig, insightData, profileResponse, profileMetrics, simResult]);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimRunning(true);
    try {
      const prelim = buildScenarioSimulation({
        config: simConfig,
        insightData,
        profileResponse: null,
        profileMetrics: computeTerrainProfileMetrics([]),
      });
      const simProfile = await fetchMolaRouteProfile(prelim.generatedWaypoints);
      const simMetrics = computeTerrainProfileMetrics(simProfile.samples);
      setSimResult(
        buildScenarioSimulation({
          config: simConfig,
          insightData,
          profileResponse: simProfile,
          profileMetrics: simMetrics,
        })
      );
    } finally {
      setSimRunning(false);
    }
  };

  const handleToggleEquipment = (item: SimulatorEquipmentOption) => {
    setSimConfig((prev) => {
      const exists = prev.equipment.includes(item);
      return {
        ...prev,
        equipment: exists ? prev.equipment.filter((e) => e !== item) : [...prev.equipment, item],
      };
    });
  };

  const handleApplyScenarioToPlanner = () => {
    if (!simResult) return;
    const simRegion = MARS_REGIONS.find((r) => r.id === simResult.config.regionId) ?? selectedRegion;
    const newMission: MissionPlan = {
      id: `sim-${Date.now()}`,
      name: `${simRegion.name.split('(')[0].trim()} Simulated Traverse`,
      regionId: simRegion.id,
      regionName: simRegion.name,
      scientificObjective: simResult.config.scientificObjective,
      walkingSpeedKmH: simResult.config.walkingSpeedKmH,
      waypoints: simResult.generatedWaypoints,
      scientificTargets: [],
      status: 'DEMONSTRATION SCENARIO — Unverified for Human Crew Traverse',
      isDemonstration: true,
      updatedAt: new Date().toISOString(),
    };
    onLoadSimulatedMission(newMission, simRegion);
    onNavigate('planner');
  };

  const latestSol =
    insightData?.status === 'HISTORICAL DATA' && insightData.sols.length > 0
      ? insightData.sols[insightData.sols.length - 1]
      : null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Page Header */}
      <div className="pb-6 border-b border-[#D9DDE2] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1.5">
            MARSCOPE Version 3 · Intelligent Martian Mission Intelligence System
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#171717]">
            Unified Mission Intelligence Dashboard
          </h1>
          <p className="text-sm text-[#4B5563] mt-1.5 max-w-3xl">
            Combines NASA MOLA/HRSC topography, Mars Odyssey THEMIS thermal inertia, MRO CTX/HiRISE
            imagery, USGS SIM 3292 geology, OMEGA/CRISM mineralogy, InSight meteorology, and
            Curiosity RAD radiation records into an auditable decision-support workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              loadGlobalServices(true);
              loadIntelligenceCoordinate(inspectCoords.lat, inspectCoords.lng, true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#D9DDE2] bg-white text-[#171717] text-xs font-semibold uppercase tracking-wide hover:bg-[#F3F4F6] cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${servicesLoading ? 'animate-spin text-[#0057B8]' : ''}`}
              aria-hidden="true"
            />
            <span>Verify NASA Services</span>
          </button>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export Technical Report (PDF)</span>
          </button>
        </div>
      </div>

      {/* Section Quick Anchor Bar + Region Focus */}
      <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <label
            htmlFor="intel-region-select"
            className="text-xs font-bold uppercase tracking-wider text-[#171717]"
          >
            Active Region:
          </label>
          <select
            id="intel-region-select"
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
          <span className="text-xs font-mono text-[#4B5563]">
            Inspected Point: {formatMarsCoords(inspectCoords.lat, inspectCoords.lng, 4)}
          </span>
        </div>

        <nav aria-label="Intelligence Sections" className="flex flex-wrap gap-2 text-xs">
          <a
            href="#unified-intel-grid"
            className="px-2.5 py-1 bg-white border border-[#D9DDE2] text-[#0057B8] font-semibold hover:bg-[#E5E7EB]"
          >
            1. 7-Pillar Intelligence
          </a>
          <a
            href="#compare-scientific-layers"
            className="px-2.5 py-1 bg-white border border-[#D9DDE2] text-[#0057B8] font-semibold hover:bg-[#E5E7EB]"
          >
            2. Compare Layers
          </a>
          <a
            href="#intelligent-recommendations"
            className="px-2.5 py-1 bg-white border border-[#D9DDE2] text-[#0057B8] font-semibold hover:bg-[#E5E7EB]"
          >
            3. Recommendations ({recommendations.length})
          </a>
          <a
            href="#surface-exploration-simulator"
            className="px-2.5 py-1 bg-white border border-[#D9DDE2] text-[#0057B8] font-semibold hover:bg-[#E5E7EB]"
          >
            4. Mission Simulator
          </a>
          <a
            href="#data-provenance-panel"
            className="px-2.5 py-1 bg-white border border-[#D9DDE2] text-[#0057B8] font-semibold hover:bg-[#E5E7EB]"
          >
            5. Data Provenance
          </a>
        </nav>
      </div>

      {/* ==================================================
          1. UNIFIED 7-PILLAR MISSION INTELLIGENCE DASHBOARD
          ================================================== */}
      <section id="unified-intel-grid" aria-labelledby="unified-intel-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8]">
              Consolidated Multi-Instrument Brief for {selectedRegion.name}
            </p>
            <h2 id="unified-intel-heading" className="text-xl font-bold text-[#171717]">
              Regional Scientific Intelligence Overview
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#4B5563]">
            Active Route: <strong className="text-[#171717]">{activeMission.name}</strong> (
            {riskAssessment.totalDistanceKm.toFixed(2)} km · {riskAssessment.category})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Terrain & Elevation */}
          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#0057B8]">
                  <Mountain className="w-3.5 h-3.5" aria-hidden="true" />
                  Terrain &amp; Elevation
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusBadgeStyle(
                    pointLoading
                      ? 'CHECKING'
                      : pointAnalysis?.dataAvailability === 'UNAVAILABLE'
                      ? 'UNAVAILABLE'
                      : 'AVAILABLE'
                  )}`}
                >
                  {pointLoading ? 'LOADING' : pointAnalysis?.dataAvailability ?? 'UNAVAILABLE'}
                </span>
              </div>
              {pointLoading ? (
                <p className="text-xs text-[#4B5563]">Querying MOLA/HRSC DEM...</p>
              ) : (
                <div className="space-y-1 text-xs">
                  <p className="text-base font-bold font-mono text-[#171717]">
                    {pointAnalysis?.primaryElevationM !== null && pointAnalysis?.primaryElevationM !== undefined
                      ? `${pointAnalysis.primaryElevationM.toFixed(1)} m`
                      : 'Unavailable'}
                  </p>
                  <p className="text-[#374151]">
                    Slope:{' '}
                    <strong className="font-mono">
                      {pointAnalysis?.slopeDeg !== null && pointAnalysis?.slopeDeg !== undefined
                        ? `${pointAnalysis.slopeDeg.toFixed(2)}° (${pointAnalysis.slopeCategory})`
                        : 'Unavailable'}
                    </strong>
                  </p>
                  <p className="text-[#4B5563]">{selectedRegion.elevationSummary}</p>
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#4B5563] border-t border-[#F3F4F6] pt-2 mt-3">
              Source: NASA Mars Trek ({pointAnalysis?.primaryDemResolution ?? '200 m/px'})
            </p>
          </article>

          {/* 2. Thermal Observations */}
          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#0057B8]">
                  <Thermometer className="w-3.5 h-3.5" aria-hidden="true" />
                  Thermal (THEMIS)
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-[#F47721] text-white">
                  PARTIAL COVERAGE
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-[#171717]">Day &amp; Night IR (100 m/px)</p>
                <p className="text-[#374151]">
                  Controlled Oct 2018 mosaics separate warm rocky bedrock (high thermal inertia) from
                  cool loose sand/dust pockets.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-[#4B5563] border-t border-[#F3F4F6] pt-2 mt-3">
              Source: 2001 Mars Odyssey THEMIS (ASU / USGS)
            </p>
          </article>

          {/* 3. Geological Information */}
          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#0057B8]">
                  <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                  Geology (SIM 3292)
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusBadgeStyle(
                    geologyLoading
                      ? 'CHECKING'
                      : geologyRecord?.availability === 'AVAILABLE'
                      ? 'AVAILABLE'
                      : 'UNAVAILABLE'
                  )}`}
                >
                  {geologyLoading ? 'LOADING' : geologyRecord?.availability ?? 'UNAVAILABLE'}
                </span>
              </div>
              {geologyLoading ? (
                <p className="text-xs text-[#4B5563]">Querying USGS SIM 3292...</p>
              ) : geologyRecord?.unitCode ? (
                <div className="space-y-1 text-xs">
                  <p className="text-base font-bold font-mono text-[#171717]">
                    Unit {geologyRecord.unitCode}
                  </p>
                  <p className="text-[#374151]">{geologyRecord.unitDescription}</p>
                  {geologyRecord.areaKm2 && (
                    <p className="text-[#4B5563] font-mono">
                      Unit extent: {geologyRecord.areaKm2.toLocaleString()} km²
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#4B5563]">
                  USGS SIM 3292 unit lookup unavailable for this coordinate.
                </p>
              )}
            </div>
            <p className="text-[11px] text-[#4B5563] border-t border-[#F3F4F6] pt-2 mt-3">
              Source: USGS Astrogeology SIM 3292 (1:20M)
            </p>
          </article>

          {/* 4. Surface Imagery */}
          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#0057B8]">
                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                  Surface Imagery
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    hiriseRegional.hasDirectTileOrDem
                      ? 'bg-[#0057B8] text-white'
                      : 'bg-[#F47721] text-white'
                  }`}
                >
                  {hiriseRegional.hasDirectTileOrDem ? 'CTX + SITE HI-RES' : 'CTX 5M ONLY'}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-[#171717]">MRO CTX 5 m/px + HiRISE</p>
                <p className="text-[#374151]">{hiriseRegional.coverageNote}</p>
              </div>
            </div>
            <p className="text-[11px] text-[#4B5563] border-t border-[#F3F4F6] pt-2 mt-3">
              Source: Caltech Murray Lab CTX · UArizona HiRISE
            </p>
          </article>

          {/* 5. Mineralogical Observations */}
          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#0057B8]">
                  <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                  Mineralogy (CRISM)
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-[#F47721] text-white">
                  TARGETED DATA
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-base font-bold font-mono text-[#171717]">
                  {pointAnalysis?.nearbyMineralDetections.length ?? 0} Local Detections
                </p>
                <p className="text-[#374151]">
                  {pointAnalysis && pointAnalysis.nearbyMineralDetections.length > 0
                    ? `Indexed ${pointAnalysis.nearbyMineralDetections[0].instrument} hydrous mineral signatures within ±0.55° corridor.`
                    : 'No OMEGA/CRISM point markers indexed in immediate ±0.55° box; consult NASA PDS CRISM cubes.'}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-[#4B5563] border-t border-[#F3F4F6] pt-2 mt-3">
              Source: MRO CRISM / Mars Express OMEGA
            </p>
          </article>

          {/* 6. Atmospheric Observations */}
          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#0057B8]">
                  <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                  Atmosphere (InSight)
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-[#F47721] text-white">
                  {insightData?.status ?? 'CHECKING'}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                {latestSol ? (
                  <>
                    <p className="text-base font-bold font-mono text-[#171717]">
                      {latestSol.tempMinC}°C to {latestSol.tempMaxC}°C
                    </p>
                    <p className="text-[#374151]">
                      Sol {latestSol.sol} (Oct 2020): Avg {latestSol.tempAvgC}°C ·{' '}
                      {latestSol.pressureAvgPa} Pa · Wind {latestSol.windAvgMs ?? '—'} m/s
                    </p>
                  </>
                ) : (
                  <p className="text-[#374151]">
                    Historical archive currently disconnected (InSight mission concluded Dec 2022).
                  </p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#4B5563] border-t border-[#F3F4F6] pt-2 mt-3">
              Source: NASA InSight APSS (Elysium Planitia)
            </p>
          </article>

          {/* 7. Historical Radiation Measurements */}
          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between md:col-span-2">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-[#0057B8]">
                  <Radiation className="w-3.5 h-3.5" aria-hidden="true" />
                  Historical Radiation Baseline (Curiosity RAD)
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-[#F47721] text-white">
                  HISTORICAL ARCHIVE · NO LIVE TELEMETRY
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-1">
                <div className="bg-[#F9FAFB] border border-[#D9DDE2] p-2.5">
                  <p className="text-[11px] text-[#4B5563]">Absorbed Surface Dose (GCR)</p>
                  <p className="text-base font-bold font-mono text-[#171717]">~0.21 mGy/day</p>
                  <p className="text-[11px] text-[#4B5563]">Gale Crater (-4.5 km), Sol 0–300</p>
                </div>
                <div className="bg-[#F9FAFB] border border-[#D9DDE2] p-2.5">
                  <p className="text-[11px] text-[#4B5563]">Dose Equivalent Rate</p>
                  <p className="text-base font-bold font-mono text-[#171717]">~0.64 mSv/day</p>
                  <p className="text-[11px] text-[#4B5563]">
                    Quiet solar baseline (Aug 2012 – Jun 2013)
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#4B5563] border-t border-[#F3F4F6] pt-2 mt-3">
              Source: {radBaseline.module.provider} · Hassler et al., Science (2014) · Live SEP
              storm alerts UNAVAILABLE
            </p>
          </article>
        </div>

        {/* NASA Data Integration Manager — 6 Independent Instrument Modules */}
        <div className="border border-[#D9DDE2] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#D9DDE2]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8]">
                NASA Data Integration Manager
              </p>
              <h3 className="text-base font-bold text-[#171717]">
                Independent Scientific Instrument Modules &amp; Service Verification
              </h3>
            </div>
            <span className="text-xs font-mono text-[#4B5563]">
              {serviceStatus
                ? `Last Verified: ${serviceStatus.checkedAt.slice(11, 19)} UTC${
                    serviceStatus.cached ? ' (Cached)' : ' (Live Check)'
                  }`
                : 'Verifying services...'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(NASA_DATA_MODULES).map((mod) => {
              const health = serviceStatus?.services.find((s) => s.id === mod.id);
              const badgeStatus: NasaModuleAvailability = servicesLoading
                ? 'CHECKING'
                : health?.status ?? (mod.isHistoricalOnly ? 'HISTORICAL ARCHIVE' : 'PARTIAL COVERAGE');
              return (
                <div key={mod.id} className="border border-[#D9DDE2] p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-[#171717]">{mod.id}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeStyle(
                        badgeStatus
                      )}`}
                    >
                      {badgeStatus}
                    </span>
                  </div>
                  <p className="font-semibold text-[#0057B8]">{mod.datasetName}</p>
                  <p className="text-[#4B5563]">
                    <strong>Resolution:</strong> {mod.spatialResolution}
                  </p>
                  <p className="text-[#4B5563]">
                    <strong>Observation Date:</strong> {mod.observationDate}
                  </p>
                  <p className="text-[#4B5563]">
                    <strong>Coverage:</strong> {mod.coverage}
                  </p>
                  {health && (
                    <p className="font-mono text-[11px] text-[#374151] bg-[#F3F4F6] px-2 py-1">
                      {health.httpStatus ? `HTTP ${health.httpStatus}` : 'Archive'}{' '}
                      {health.latencyMs !== null ? `· ${health.latencyMs} ms` : ''} —{' '}
                      {health.message}
                    </p>
                  )}
                  <a
                    href={mod.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#0057B8] hover:underline pt-1"
                  >
                    <span>Official Dataset Link</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================
          3. MULTI-LAYER SCIENTIFIC COMPARISON
          ================================================== */}
      <CompareLayersPanel
        selectedRegion={selectedRegion}
        waypoints={activeMission.waypoints}
        onInspectCoordinate={(lat, lng) => setInspectCoords({ lat, lng })}
      />

      {/* ==================================================
          4. INTELLIGENT MISSION RECOMMENDATIONS
          ================================================== */}
      <section
        id="intelligent-recommendations"
        aria-labelledby="recommendations-heading"
        className="border border-[#D9DDE2] bg-white p-6 space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#D9DDE2]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
              Transparent Rule-Based Decision Support
            </p>
            <h2 id="recommendations-heading" className="text-xl font-bold text-[#171717]">
              Intelligent Mission Recommendations
            </h2>
            <p className="text-xs text-[#4B5563] mt-1">
              Evaluates active DEM slopes, data completeness, HiRISE coverage, dune hazards,
              geology/mineralogy, and historical measurement limits without unverified safety claims.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#FFF7ED] border border-[#F47721] text-[#171717] text-xs font-bold uppercase">
            NEVER CERTIFIES SAFE WITHOUT VALIDATED HI-RES DATA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => {
            const sevBg =
              rec.severity === 'HIGH CONCERN'
                ? 'bg-[#B91C1C]'
                : rec.severity === 'INSUFFICIENT DATA' || rec.severity === 'CAUTION'
                ? 'bg-[#F47721]'
                : 'bg-[#0057B8]';

            return (
              <article
                key={rec.id}
                className="border border-[#D9DDE2] bg-[#F9FAFB] p-4 space-y-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold uppercase tracking-wider text-[#0057B8]">
                    {rec.category}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase text-white ${sevBg}`}>
                    {rec.severity}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#171717]">{rec.title}</h3>
                <p className="text-[#374151] leading-relaxed">{rec.rationale}</p>
                <p className="font-mono text-[11px] text-[#4B5563] bg-white border border-[#D9DDE2] px-2.5 py-1.5">
                  Rule: {rec.ruleTriggered}
                </p>
                <p className="text-[#171717]">
                  <strong className="text-[#0057B8]">Recommended Action: </strong>
                  {rec.actionableStep}
                </p>
                {rec.observationDateNote && (
                  <p className="text-[11px] font-semibold text-[#F47721]">
                    Observation Dates: {rec.observationDateNote}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ==================================================
          5. MARS SURFACE EXPLORATION SIMULATOR
          ================================================== */}
      <section
        id="surface-exploration-simulator"
        aria-labelledby="simulator-heading"
        className="border border-[#D9DDE2] bg-white p-6 space-y-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#D9DDE2]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
              Scenario Configuration &amp; Traverse Modeling
            </p>
            <h2 id="simulator-heading" className="text-xl font-bold text-[#171717]">
              MARS SURFACE EXPLORATION SIMULATOR
            </h2>
            <p className="text-xs text-[#4B5563] mt-1">
              Configure hypothetical exploration parameters to compute surface distance, duration,
              DEM terrain context, equipment constraints, and missing dataset alerts.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-[#F47721] text-white text-xs font-bold uppercase">
            DEMONSTRATION SCENARIO MODEL
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Simulator Inputs */}
          <form
            onSubmit={handleRunSimulation}
            className="lg:col-span-5 border border-[#D9DDE2] bg-[#F9FAFB] p-5 space-y-4 text-xs"
          >
            <div>
              <label htmlFor="sim-region" className="block font-semibold text-[#171717] mb-1">
                Exploration Region
              </label>
              <select
                id="sim-region"
                value={simConfig.regionId}
                onChange={(e) => {
                  const reg = MARS_REGIONS.find((r) => r.id === e.target.value);
                  if (!reg) return;
                  setSimConfig((prev) => ({
                    ...prev,
                    regionId: reg.id,
                    startLat: reg.lat,
                    startLng: reg.lng,
                    destLat: Number((reg.lat - 0.12).toFixed(4)),
                    destLng: Number((reg.lng - 0.03).toFixed(4)),
                    scientificObjective: reg.scientificInterest,
                  }));
                }}
                className="w-full border border-[#D9DDE2] bg-white px-3 py-2 text-xs text-[#171717]"
              >
                {MARS_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sim-start-lat" className="block font-semibold text-[#171717] mb-1">
                  Start Latitude
                </label>
                <input
                  id="sim-start-lat"
                  type="number"
                  step="0.0001"
                  value={simConfig.startLat}
                  onChange={(e) =>
                    setSimConfig((p) => ({ ...p, startLat: Number(e.target.value) }))
                  }
                  className="w-full border border-[#D9DDE2] bg-white px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label htmlFor="sim-start-lng" className="block font-semibold text-[#171717] mb-1">
                  Start Longitude
                </label>
                <input
                  id="sim-start-lng"
                  type="number"
                  step="0.0001"
                  value={simConfig.startLng}
                  onChange={(e) =>
                    setSimConfig((p) => ({ ...p, startLng: Number(e.target.value) }))
                  }
                  className="w-full border border-[#D9DDE2] bg-white px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sim-dest-lat" className="block font-semibold text-[#171717] mb-1">
                  Destination Latitude
                </label>
                <input
                  id="sim-dest-lat"
                  type="number"
                  step="0.0001"
                  value={simConfig.destLat}
                  onChange={(e) => setSimConfig((p) => ({ ...p, destLat: Number(e.target.value) }))}
                  className="w-full border border-[#D9DDE2] bg-white px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label htmlFor="sim-dest-lng" className="block font-semibold text-[#171717] mb-1">
                  Destination Longitude
                </label>
                <input
                  id="sim-dest-lng"
                  type="number"
                  step="0.0001"
                  value={simConfig.destLng}
                  onChange={(e) => setSimConfig((p) => ({ ...p, destLng: Number(e.target.value) }))}
                  className="w-full border border-[#D9DDE2] bg-white px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sim-wp-count" className="block font-semibold text-[#171717] mb-1">
                  Waypoints (2–8)
                </label>
                <input
                  id="sim-wp-count"
                  type="number"
                  min={2}
                  max={8}
                  value={simConfig.waypointCount}
                  onChange={(e) =>
                    setSimConfig((p) => ({ ...p, waypointCount: Number(e.target.value) }))
                  }
                  className="w-full border border-[#D9DDE2] bg-white px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label htmlFor="sim-speed" className="block font-semibold text-[#171717] mb-1">
                  Walking Speed (km/h)
                </label>
                <input
                  id="sim-speed"
                  type="number"
                  min={0.5}
                  max={15}
                  step={0.5}
                  value={simConfig.walkingSpeedKmH}
                  onChange={(e) =>
                    setSimConfig((p) => ({ ...p, walkingSpeedKmH: Number(e.target.value) }))
                  }
                  className="w-full border border-[#D9DDE2] bg-white px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sim-objective" className="block font-semibold text-[#171717] mb-1">
                Scientific Objective
              </label>
              <textarea
                id="sim-objective"
                rows={2}
                value={simConfig.scientificObjective}
                onChange={(e) =>
                  setSimConfig((p) => ({ ...p, scientificObjective: e.target.value }))
                }
                className="w-full border border-[#D9DDE2] bg-white px-2.5 py-1.5"
              />
            </div>

            <fieldset className="space-y-1.5">
              <legend className="font-semibold text-[#171717] mb-1">Available Equipment</legend>
              {EQUIPMENT_OPTIONS.map((item) => (
                <label key={item} className="flex items-center gap-2 cursor-pointer text-[#374151]">
                  <input
                    type="checkbox"
                    checked={simConfig.equipment.includes(item)}
                    onChange={() => handleToggleEquipment(item)}
                    className="w-3.5 h-3.5 accent-[#0057B8]"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </fieldset>

            <button
              type="submit"
              disabled={simRunning}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] disabled:opacity-60 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{simRunning ? 'Sampling NASA DEM & Simulating...' : 'Run Exploration Simulation'}</span>
            </button>
          </form>

          {/* Simulator Output Summary */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            {simResult && (
              <div className="border border-[#D9DDE2] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D9DDE2]">
                  <div>
                    <span className="inline-block bg-[#F47721] text-white text-[10px] font-bold uppercase px-2 py-0.5 mr-2">
                      DEMONSTRATION SIMULATION
                    </span>
                    <strong className="text-sm text-[#171717]">{simResult.regionName}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyScenarioToPlanner}
                    className="px-3 py-1.5 border border-[#0057B8] text-[#0057B8] font-semibold uppercase hover:bg-[#0057B8] hover:text-white cursor-pointer"
                  >
                    Load Scenario into Mission Planner
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
                    <p className="text-[11px] uppercase text-[#4B5563]">Total Distance</p>
                    <p className="text-lg font-bold font-mono text-[#171717]">
                      {simResult.totalDistanceKm.toFixed(2)} km
                    </p>
                  </div>
                  <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
                    <p className="text-[11px] uppercase text-[#4B5563]">Estimated Travel Duration</p>
                    <p className="text-lg font-bold font-mono text-[#171717]">
                      {simResult.estimatedDurationHours.toFixed(2)} hrs
                    </p>
                  </div>
                  <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
                    <p className="text-[11px] uppercase text-[#4B5563]">Waypoints Generated</p>
                    <p className="text-lg font-bold font-mono text-[#171717]">
                      {simResult.generatedWaypoints.length} checkpoints
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-bold uppercase text-[#0057B8] mb-1">Terrain Information</p>
                  <p className="text-[#374151] leading-relaxed">{simResult.terrainSummary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-[#D9DDE2] p-3">
                    <p className="font-bold uppercase text-[#171717] mb-1.5">
                      Suggested Scientific Targets
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[#374151]">
                      {simResult.suggestedTargets.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-[#D9DDE2] p-3">
                    <p className="font-bold uppercase text-[#F47721] mb-1.5">
                      Potential Environmental Concerns
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[#374151]">
                      {simResult.environmentalConcerns.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-[#F47721] bg-[#FFF7ED] p-3">
                    <p className="font-bold uppercase text-[#B45309] mb-1.5">Missing Datasets</p>
                    <ul className="list-disc pl-4 space-y-1 text-[#171717]">
                      {simResult.missingDatasets.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-[#B91C1C] bg-[#FEF2F2] p-3">
                    <p className="font-bold uppercase text-[#B91C1C] mb-1.5">
                      Mission Limitations
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[#171717]">
                      {simResult.missionLimitations.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
                  <p className="font-bold uppercase text-[#171717] mb-1">
                    Explicit Modeling Assumptions (Demonstration Values)
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[#4B5563]">
                    {simResult.assumptions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================
          6. SCIENTIFIC DATA PROVENANCE PANEL
          ================================================== */}
      <section
        id="data-provenance-panel"
        aria-labelledby="provenance-heading"
        className="border border-[#D9DDE2] bg-white p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#D9DDE2]">
          <div className="flex items-start gap-2.5">
            <Database className="w-5 h-5 text-[#0057B8] mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8]">
                Dataset Auditability &amp; Attribution Ledger
              </p>
              <h2 id="provenance-heading" className="text-xl font-bold text-[#171717]">
                Scientific Data Provenance
              </h2>
              <p className="text-xs text-[#4B5563] mt-1">
                Distinguishes historical surface measurements from archived orbital mosaics/DEMs and
                logs original NASA/USGS/Caltech/ASU providers and retrieval timestamps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F3F4F6] border border-[#D9DDE2] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0057B8]" aria-hidden="true" />
              {provenanceRecords.filter((p) => p.availabilityStatus === 'AVAILABLE').length} Live Global
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FFF7ED] border border-[#F47721] font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-[#F47721]" aria-hidden="true" />
              {provenanceRecords.filter((p) => p.temporalClass === 'Historical Measurements').length}{' '}
              Historical Archive
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-[#D9DDE2] text-left text-xs">
            <thead>
              <tr className="bg-[#F3F4F6] border-b border-[#D9DDE2] text-[#171717]">
                <th className="p-2.5 font-bold">Dataset / Module</th>
                <th className="p-2.5 font-bold">NASA Mission &amp; Instrument</th>
                <th className="p-2.5 font-bold">Original Provider</th>
                <th className="p-2.5 font-bold">Observation Date &amp; Type</th>
                <th className="p-2.5 font-bold">Resolution &amp; Coverage</th>
                <th className="p-2.5 font-bold">Status &amp; Last Retrieval</th>
              </tr>
            </thead>
            <tbody>
              {provenanceRecords.map((rec) => (
                <tr key={rec.id} className="border-b border-[#D9DDE2] align-top">
                  <td className="p-2.5">
                    <p className="font-bold text-[#171717]">{rec.datasetName}</p>
                    <a
                      href={rec.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#0057B8] hover:underline mt-0.5 font-mono text-[11px]"
                    >
                      <span>{rec.moduleId} Source</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </td>
                  <td className="p-2.5 text-[#374151]">
                    <p className="font-semibold text-[#171717]">{rec.nasaMission}</p>
                    <p>{rec.instrument}</p>
                  </td>
                  <td className="p-2.5 text-[#4B5563]">{rec.originalProvider}</td>
                  <td className="p-2.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase mb-1 ${
                        rec.temporalClass === 'Historical Measurements'
                          ? 'bg-[#FFF7ED] text-[#B45309] border border-[#F47721]'
                          : 'bg-[#F3F4F6] text-[#374151] border border-[#D9DDE2]'
                      }`}
                    >
                      {rec.temporalClass}
                    </span>
                    <p className="text-[#374151]">{rec.observationDate}</p>
                  </td>
                  <td className="p-2.5 text-[#374151]">
                    <p className="font-mono font-semibold">{rec.spatialResolution}</p>
                    <p className="text-[#4B5563] mt-0.5">{rec.coverage}</p>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase ${statusBadgeStyle(
                        rec.availabilityStatus
                      )}`}
                    >
                      {rec.availabilityStatus}
                    </span>
                    <p className="font-mono text-[11px] text-[#4B5563] mt-1">
                      {rec.lastRetrievedAt
                        ? rec.lastRetrievedAt.includes('T')
                          ? `${rec.lastRetrievedAt.slice(0, 19).replace('T', ' ')} UTC`
                          : rec.lastRetrievedAt
                        : 'Not yet queried'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border border-[#F47721] bg-[#FFF7ED] p-3 text-xs text-[#171717] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#F47721] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong>Historical vs. Real-Time Disclosure:</strong> All datasets above are historical
            measurements or archived orbital mosaics/DEMs. MARSCOPE does not display fabricated live
            rover weather, live radiation, or unverified slope clearance.
          </span>
        </div>
      </section>

      {/* 12-Section Technical Report Modal */}
      <MissionReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        mission={activeMission}
        region={selectedRegion}
        activeLayer={activeLayer}
        profileResponse={profileResponse}
        profileMetrics={profileMetrics}
        riskAssessment={riskAssessment}
        insightData={insightData}
        geologyRecord={geologyRecord}
        recommendations={recommendations}
        provenanceRecords={provenanceRecords}
      />
    </div>
  );
}
