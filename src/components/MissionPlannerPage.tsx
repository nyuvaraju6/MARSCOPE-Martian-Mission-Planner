import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  FileText,
  FlaskConical,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MARS_MAP_LAYERS } from '../data/marsLayers';
import { MARS_REGIONS } from '../data/marsRegions';
import type {
  InSightApiResponse,
  MarsLayerCategory,
  MarsRegion,
  MissionPlan,
  PageId,
  RouteTerrainAnalysisResponse,
  ScientificTarget,
  ScientificTargetCategory,
  Waypoint,
} from '../types/mars';
import { calculateRouteSegments, formatMarsCoords } from '../utils/marsGeo';
import { DEFAULT_GALE_DEMO_MISSION } from '../utils/missionStorage';
import {
  assessRouteRisk,
  computeTerrainProfileMetrics,
} from '../utils/terrainAnalysis';
import { generateMissionRecommendations } from '../utils/missionIntelligence';
import { MarsMap } from './MarsMap';
import { MissionAdvisorPanel } from './MissionAdvisorPanel';
import { MissionReportModal } from './MissionReportModal';
import { TerrainProfileChart } from './TerrainProfileChart';

interface MissionPlannerPageProps {
  selectedRegion: MarsRegion;
  onSelectRegion: (region: MarsRegion) => void;
  activeLayerId: MarsLayerCategory;
  onSelectLayerId: (layerId: MarsLayerCategory) => void;
  activeMission: MissionPlan;
  onChangeActiveMission: (mission: MissionPlan) => void;
  savedMissions: MissionPlan[];
  onSaveMission: (mission: MissionPlan) => void;
  onDeleteMission: (missionId: string) => void;
  onResetDemoMission: () => void;
  onNavigate?: (page: PageId) => void;
}

const TARGET_CATEGORIES: ScientificTargetCategory[] = [
  'Layered sedimentary formations',
  'Clay-bearing deposits',
  'Sulfate-bearing deposits',
  'Crater formations',
  'Ancient geological structures',
  'Other geological target',
];

export function MissionPlannerPage({
  selectedRegion,
  onSelectRegion,
  activeLayerId,
  onSelectLayerId,
  activeMission,
  onChangeActiveMission,
  savedMissions,
  onSaveMission,
  onDeleteMission,
  onResetDemoMission,
  onNavigate,
}: MissionPlannerPageProps) {
  const [newWpName, setNewWpName] = useState('');
  const [newWpLat, setNewWpLat] = useState('');
  const [newWpLng, setNewWpLng] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Feature 5: Scientific Targets form & map click mode
  const [mapClickMode, setMapClickMode] = useState<'waypoint' | 'target'>('waypoint');
  const [newTargetName, setNewTargetName] = useState('');
  const [newTargetCategory, setNewTargetCategory] = useState<ScientificTargetCategory>(
    'Layered sedimentary formations'
  );
  const [newTargetLat, setNewTargetLat] = useState('');
  const [newTargetLng, setNewTargetLng] = useState('');
  const [newTargetDesc, setNewTargetDesc] = useState('');
  const [targetError, setTargetError] = useState<string | null>(null);

  // Feature 2 & 3: DEM Route Elevation Profile & Risk Analysis
  const [profileResponse, setProfileResponse] = useState<RouteTerrainAnalysisResponse | null>(
    null
  );
  const [profileLoading, setProfileLoading] = useState(false);

  // Feature 6: Mission Report Modal & InSight environmental snapshot
  const [reportOpen, setReportOpen] = useState(false);
  const [insightData, setInsightData] = useState<InSightApiResponse | null>(null);

  const activeLayer =
    MARS_MAP_LAYERS.find((l) => l.id === activeLayerId) ?? MARS_MAP_LAYERS[0];

  const segments = calculateRouteSegments(activeMission.waypoints);
  const waypointsSignature = useMemo(
    () =>
      activeMission.waypoints
        .map((w) => `${w.lat.toFixed(4)},${w.lng.toFixed(4)},${w.name}`)
        .join('|'),
    [activeMission.waypoints]
  );

  const analyzeRouteProfile = useCallback(async () => {
    if (activeMission.waypoints.length < 2) {
      setProfileResponse(null);
      return;
    }
    setProfileLoading(true);
    try {
      const res = await fetch('/api/nasa/terrain/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints: activeMission.waypoints }),
      });
      const data = (await res.json()) as RouteTerrainAnalysisResponse;
      setProfileResponse(data);
    } catch {
      setProfileResponse({
        status: 'UNAVAILABLE',
        demName: 'MGS MOLA & Mars Express HRSC Global Blended DEM',
        demInstrument: 'MOLA + HRSC',
        demResolution: 'Unavailable',
        demSourceUrl: 'https://trek.nasa.gov/mars/',
        demCoverageNote: 'Unable to contact backend NASA Mars Trek terrain proxy.',
        samples: [],
        nearbyFeatures: [],
        nearbyDuneFields: [],
        nearbyMineralDetections: [],
        queriedAt: new Date().toISOString(),
        error: 'Network error retrieving elevation profile',
      });
    } finally {
      setProfileLoading(false);
    }
  }, [waypointsSignature]);

  useEffect(() => {
    analyzeRouteProfile();
  }, [analyzeRouteProfile]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/nasa/insight')
      .then((r) => r.json())
      .then((data: InSightApiResponse) => {
        if (!cancelled) setInsightData(data);
      })
      .catch(() => {
        if (!cancelled) {
          setInsightData({
            status: 'DATA NOT CONNECTED',
            source: 'NASA InSight Mars Weather Service (api.nasa.gov)',
            sols: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const reportRecommendations = useMemo(
    () =>
      generateMissionRecommendations({
        region: selectedRegion,
        mission: activeMission,
        pointAnalysis: null,
        geologyRecord: null,
        profileResponse,
        profileMetrics,
        riskAssessment,
        insightData,
      }),
    [selectedRegion, activeMission, profileResponse, profileMetrics, riskAssessment, insightData]
  );

  const startWp = activeMission.waypoints[0] ?? null;
  const endWp =
    activeMission.waypoints.length > 1
      ? activeMission.waypoints[activeMission.waypoints.length - 1]
      : null;

  const updateMission = (partial: Partial<MissionPlan>) => {
    onChangeActiveMission({
      ...activeMission,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
    setSaveNotice(null);
  };

  const handleRegionChange = (regionId: string) => {
    const region = MARS_REGIONS.find((r) => r.id === regionId);
    if (!region) return;
    onSelectRegion(region);

    if (region.id === DEFAULT_GALE_DEMO_MISSION.regionId) {
      onChangeActiveMission({
        ...DEFAULT_GALE_DEMO_MISSION,
        updatedAt: new Date().toISOString(),
      });
      setSaveNotice(null);
    } else {
      updateMission({
        id: `custom-${region.id}-${Date.now()}`,
        name: `${region.name.split('(')[0].trim()} Surface Reconnaissance`,
        regionId: region.id,
        regionName: region.name,
        scientificObjective: region.scientificInterest,
        isDemonstration: false,
        status: 'DRAFT PLAN — Unverified for Human Crew Traverse',
        waypoints: [
          {
            id: `wp-start-${Date.now()}`,
            name: `${region.name.split('(')[0].trim()} Base Landing Zone`,
            lat: region.lat,
            lng: region.lng,
          },
        ],
        scientificTargets: [],
      });
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (mapClickMode === 'target') {
      const nextNum = activeMission.scientificTargets.length + 1;
      const tgt: ScientificTarget = {
        id: `tgt-${Date.now()}-${nextNum}`,
        name: newTargetName.trim() || `${newTargetCategory} Site ${nextNum}`,
        category: newTargetCategory,
        lat,
        lng,
        description:
          newTargetDesc.trim() ||
          `Field inspection target placed at ${formatMarsCoords(lat, lng, 4)}.`,
        createdAt: new Date().toISOString(),
      };
      updateMission({
        isDemonstration: false,
        scientificTargets: [...activeMission.scientificTargets, tgt],
      });
      setNewTargetName('');
      setNewTargetLat('');
      setNewTargetLng('');
      setNewTargetDesc('');
      setTargetError(null);
      return;
    }

    const nextNum = activeMission.waypoints.length + 1;
    const wp: Waypoint = {
      id: `wp-${Date.now()}-${nextNum}`,
      name: nextNum === 1 ? 'Starting Site' : `Target Waypoint ${nextNum}`,
      lat,
      lng,
    };
    updateMission({
      isDemonstration: false,
      status: 'CUSTOM ROUTE — Unverified for Human Crew Traverse',
      waypoints: [...activeMission.waypoints, wp],
    });
  };

  const handleManualAddWaypoint = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedName = newWpName.trim();
    const lat = Number(newWpLat);
    const lng = Number(newWpLng);

    if (!trimmedName) {
      setFormError('Enter a waypoint name before adding.');
      return;
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setFormError('Latitude must be a numeric value between -90° and +90°.');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setFormError('Longitude must be a numeric value between -180° and +180°.');
      return;
    }

    const wp: Waypoint = {
      id: `wp-${Date.now()}`,
      name: trimmedName,
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
    };

    updateMission({
      isDemonstration: false,
      status: 'CUSTOM ROUTE — Unverified for Human Crew Traverse',
      waypoints: [...activeMission.waypoints, wp],
    });
    setNewWpName('');
    setNewWpLat('');
    setNewWpLng('');
  };

  const handleManualAddTarget = (e: React.FormEvent) => {
    e.preventDefault();
    setTargetError(null);
    const trimmedName = newTargetName.trim();
    const trimmedDesc = newTargetDesc.trim();
    const lat = Number(newTargetLat);
    const lng = Number(newTargetLng);

    if (!trimmedName) {
      setTargetError('Enter a scientific target name.');
      return;
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setTargetError('Target latitude must be a numeric value between -90° and +90°.');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setTargetError('Target longitude must be a numeric value between -180° and +180°.');
      return;
    }
    if (!trimmedDesc) {
      setTargetError('Provide a short scientific description for this target.');
      return;
    }

    const tgt: ScientificTarget = {
      id: `tgt-${Date.now()}`,
      name: trimmedName,
      category: newTargetCategory,
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      description: trimmedDesc,
      createdAt: new Date().toISOString(),
    };

    updateMission({
      isDemonstration: false,
      scientificTargets: [...activeMission.scientificTargets, tgt],
    });
    setNewTargetName('');
    setNewTargetLat('');
    setNewTargetLng('');
    setNewTargetDesc('');
  };

  const handleRemoveTarget = (id: string) => {
    updateMission({
      isDemonstration: false,
      scientificTargets: activeMission.scientificTargets.filter((t) => t.id !== id),
    });
  };

  const handleRemoveWaypoint = (id: string) => {
    updateMission({
      isDemonstration: false,
      waypoints: activeMission.waypoints.filter((w) => w.id !== id),
    });
  };

  const handleMoveWaypoint = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= activeMission.waypoints.length) return;
    const copy = [...activeMission.waypoints];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    updateMission({
      isDemonstration: false,
      waypoints: copy,
    });
  };

  const handleRenameWaypoint = (id: string, name: string) => {
    updateMission({
      isDemonstration: false,
      waypoints: activeMission.waypoints.map((w) => (w.id === id ? { ...w, name } : w)),
    });
  };

  const handleSaveCurrentMission = () => {
    if (!activeMission.name.trim()) {
      setFormError('Mission name cannot be empty when saving.');
      return;
    }
    const idToSave =
      activeMission.id === DEFAULT_GALE_DEMO_MISSION.id && !activeMission.isDemonstration
        ? `mission-${Date.now()}`
        : activeMission.id;
    const missionToSave: MissionPlan = {
      ...activeMission,
      id: idToSave,
      updatedAt: new Date().toISOString(),
    };
    onSaveMission(missionToSave);
    onChangeActiveMission(missionToSave);
    setSaveNotice(`Saved "${missionToSave.name}" to browser LocalStorage.`);
  };

  const handleClearWaypoints = () => {
    updateMission({
      isDemonstration: false,
      status: 'EMPTY ROUTE — Click map to place starting location',
      waypoints: [],
    });
    setProfileResponse(null);
  };

  const chartData = segments.map((seg, idx) => ({
    leg: `Leg ${idx + 1}`,
    route: `${seg.fromName} → ${seg.toName}`,
    distanceKm: Number(seg.distanceKm.toFixed(2)),
  }));

  const riskBadgeBg =
    riskAssessment.category === 'HIGH TERRAIN CONCERN'
      ? 'bg-[#B91C1C]'
      : riskAssessment.category === 'MODERATE TERRAIN CONCERN'
      ? 'bg-[#F47721]'
      : 'bg-[#0057B8]';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header & Actions */}
      <div className="pb-6 mb-6 border-b border-[#D9DDE2] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1.5">
            Surface Traverse Engineering &amp; Route Risk Analysis
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#171717]">
            Martian Mission Planner
          </h1>
          <p className="text-sm text-[#4B5563] mt-1.5 max-w-3xl">
            Plot surface waypoints and scientific targets, analyze real NASA MOLA/HRSC DEM
            elevation profiles and steep slopes, and generate printable mission safety reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#0057B8] bg-white text-[#0057B8] text-xs font-semibold uppercase tracking-wide hover:bg-[#0057B8] hover:text-white cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Generate Mission Report</span>
          </button>
          <button
            type="button"
            onClick={handleSaveCurrentMission}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save Mission</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onResetDemoMission();
              setSaveNotice('Restored Gale Crater sample mission (DEMONSTRATION DATA).');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#D9DDE2] bg-white text-[#171717] text-xs font-semibold uppercase tracking-wide hover:bg-[#F3F4F6] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Gale Demo</span>
          </button>
        </div>
      </div>

      {/* Explicit Demonstration & Safety Disclaimer Banner */}
      <div
        role="status"
        className="border border-[#F47721] bg-[#FFF7ED] px-4 py-3 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#171717]"
      >
        <div>
          <span className="inline-block bg-[#F47721] text-white font-bold uppercase tracking-wider px-2 py-0.5 mr-2.5">
            {activeMission.isDemonstration ? 'DEMONSTRATION DATA' : 'PLANNING DRAFT'}
          </span>
          <span className="font-semibold">{riskAssessment.safetyDisclaimer}</span>
        </div>
        {saveNotice && (
          <span className="font-semibold text-[#0057B8] shrink-0">{saveNotice}</span>
        )}
      </div>

      {/* Mission Telemetry Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="border border-[#D9DDE2] bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-[#4B5563] mb-1">Mission Name</p>
          <p className="text-sm font-bold text-[#171717] truncate" title={activeMission.name}>
            {activeMission.name}
          </p>
          <p className="text-xs text-[#0057B8] mt-1 font-semibold">
            {activeMission.isDemonstration ? 'DEMONSTRATION DATA' : 'USER PLAN'}
          </p>
        </div>

        <div className="border border-[#D9DDE2] bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-[#4B5563] mb-1">
            Starting Coordinates
          </p>
          <p className="text-sm font-bold text-[#171717] font-mono tabular-nums">
            {startWp ? formatMarsCoords(startWp.lat, startWp.lng) : 'Not set'}
          </p>
          <p className="text-xs text-[#4B5563] truncate mt-1">
            {startWp ? startWp.name : 'Click map to place start'}
          </p>
        </div>

        <div className="border border-[#D9DDE2] bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-[#4B5563] mb-1">
            Destination Coordinates
          </p>
          <p className="text-sm font-bold text-[#171717] font-mono tabular-nums">
            {endWp ? formatMarsCoords(endWp.lat, endWp.lng) : 'Not set'}
          </p>
          <p className="text-xs text-[#4B5563] truncate mt-1">
            {endWp ? endWp.name : 'Add destination waypoint'}
          </p>
        </div>

        <div className="border border-[#D9DDE2] bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-[#4B5563] mb-1">Route Distance</p>
          <p className="text-lg font-bold text-[#171717] font-mono tabular-nums">
            {riskAssessment.totalDistanceKm.toFixed(2)} km
          </p>
          <p className="text-xs text-[#4B5563] font-mono tabular-nums mt-0.5">
            {activeMission.waypoints.length} waypoints · {segments.length} legs
          </p>
        </div>

        <div className="border border-[#D9DDE2] bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-[#4B5563] mb-1">
            Estimated Duration
          </p>
          <p className="text-lg font-bold text-[#171717] font-mono tabular-nums">
            {riskAssessment.estimatedHours.toFixed(2)} hrs
          </p>
          <p className="text-xs text-[#4B5563] font-mono tabular-nums mt-0.5">
            Assuming {activeMission.walkingSpeedKmH.toFixed(1)} km/h EVA pace
          </p>
        </div>
      </section>

      {/* Main Split Planner Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mission Configuration Form */}
          <section className="border border-[#D9DDE2] bg-white p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717] border-b border-[#D9DDE2] pb-2">
              Mission Parameters
            </h2>

            <div>
              <label
                htmlFor="planner-region"
                className="block text-xs font-semibold text-[#171717] mb-1"
              >
                Exploration Region
              </label>
              <select
                id="planner-region"
                value={selectedRegion.id}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full border border-[#D9DDE2] bg-white px-3 py-2 text-sm text-[#171717]"
              >
                {MARS_REGIONS.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="planner-mission-name"
                className="block text-xs font-semibold text-[#171717] mb-1"
              >
                Mission Name
              </label>
              <input
                id="planner-mission-name"
                type="text"
                value={activeMission.name}
                onChange={(e) => updateMission({ name: e.target.value, isDemonstration: false })}
                className="w-full border border-[#D9DDE2] px-3 py-2 text-sm text-[#171717]"
              />
            </div>

            <div>
              <label
                htmlFor="planner-objective"
                className="block text-xs font-semibold text-[#171717] mb-1"
              >
                Scientific Objective
              </label>
              <textarea
                id="planner-objective"
                rows={3}
                value={activeMission.scientificObjective}
                onChange={(e) =>
                  updateMission({ scientificObjective: e.target.value, isDemonstration: false })
                }
                className="w-full border border-[#D9DDE2] px-3 py-2 text-sm text-[#171717]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="planner-walking-speed"
                  className="block text-xs font-semibold text-[#171717] mb-1"
                >
                  Walking Speed Assumption (km/h)
                </label>
                <input
                  id="planner-walking-speed"
                  type="number"
                  min={0.5}
                  max={15}
                  step={0.5}
                  value={activeMission.walkingSpeedKmH}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isFinite(val) && val > 0) {
                      updateMission({ walkingSpeedKmH: val, isDemonstration: false });
                    }
                  }}
                  className="w-full border border-[#D9DDE2] px-3 py-2 text-sm font-mono tabular-nums text-[#171717]"
                />
              </div>

              <div>
                <label
                  htmlFor="planner-basemap"
                  className="block text-xs font-semibold text-[#171717] mb-1"
                >
                  Planning Base Layer
                </label>
                <select
                  id="planner-basemap"
                  value={activeLayerId}
                  onChange={(e) => onSelectLayerId(e.target.value as MarsLayerCategory)}
                  className="w-full border border-[#D9DDE2] bg-white px-3 py-2 text-sm text-[#171717]"
                >
                  {MARS_MAP_LAYERS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Add Waypoint By Coordinate */}
          <section className="border border-[#D9DDE2] bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717] border-b border-[#D9DDE2] pb-2 mb-3">
              Add Coordinate Waypoint
            </h2>
            <form onSubmit={handleManualAddWaypoint} className="space-y-3">
              <div>
                <label
                  htmlFor="wp-name-input"
                  className="block text-xs font-semibold text-[#171717] mb-1"
                >
                  Waypoint Name
                </label>
                <input
                  id="wp-name-input"
                  type="text"
                  placeholder="e.g., Sulfate Outcrop Alpha"
                  value={newWpName}
                  onChange={(e) => setNewWpName(e.target.value)}
                  className="w-full border border-[#D9DDE2] px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="wp-lat-input"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Latitude (-90 to +90)
                  </label>
                  <input
                    id="wp-lat-input"
                    type="number"
                    step="0.0001"
                    placeholder="-4.6500"
                    value={newWpLat}
                    onChange={(e) => setNewWpLat(e.target.value)}
                    className="w-full border border-[#D9DDE2] px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="wp-lng-input"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Longitude (-180 to +180)
                  </label>
                  <input
                    id="wp-lng-input"
                    type="number"
                    step="0.0001"
                    placeholder="137.4500"
                    value={newWpLng}
                    onChange={(e) => setNewWpLng(e.target.value)}
                    className="w-full border border-[#D9DDE2] px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>
              {formError && (
                <p role="alert" className="text-xs font-semibold text-[#B91C1C]">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Waypoint</span>
              </button>
            </form>
          </section>

          {/* Waypoint Sequence List */}
          <section className="border border-[#D9DDE2] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#D9DDE2] pb-2 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
                Route Waypoints ({activeMission.waypoints.length})
              </h2>
              <button
                type="button"
                onClick={handleClearWaypoints}
                className="text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
              >
                Clear Route
              </button>
            </div>

            {activeMission.waypoints.length === 0 ? (
              <p className="text-xs text-[#4B5563] py-4">
                No waypoints placed. Click anywhere on the Mars map to add a starting location and
                scientific targets.
              </p>
            ) : (
              <ol className="space-y-2">
                {activeMission.waypoints.map((wp, idx) => (
                  <li
                    key={wp.id}
                    className="border border-[#D9DDE2] p-3 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#171717] shrink-0">{idx + 1}.</span>
                        <input
                          type="text"
                          aria-label={`Waypoint ${idx + 1} name`}
                          value={wp.name}
                          onChange={(e) => handleRenameWaypoint(wp.id, e.target.value)}
                          className="w-full font-bold text-[#171717] bg-transparent border-b border-transparent hover:border-[#D9DDE2] focus:border-[#0057B8] focus:outline-none py-0.5"
                        />
                      </div>
                      <p className="font-mono tabular-nums text-[#4B5563] mt-0.5">
                        {formatMarsCoords(wp.lat, wp.lng, 4)}
                      </p>
                      {idx > 0 && segments[idx - 1] && (
                        <p className="text-[#0057B8] font-mono tabular-nums mt-0.5">
                          +{segments[idx - 1].distanceKm.toFixed(2)} km from previous waypoint
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveWaypoint(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Move ${wp.name} up`}
                        className="p-1.5 border border-[#D9DDE2] hover:bg-[#F3F4F6] disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveWaypoint(idx, 1)}
                        disabled={idx === activeMission.waypoints.length - 1}
                        aria-label={`Move ${wp.name} down`}
                        className="p-1.5 border border-[#D9DDE2] hover:bg-[#F3F4F6] disabled:opacity-40 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWaypoint(wp.id)}
                        aria-label={`Remove ${wp.name}`}
                        className="p-1.5 border border-[#D9DDE2] text-[#B91C1C] hover:bg-[#FEE2E2] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Feature 5: Scientific Target Identification */}
          <section className="border border-[#D9DDE2] bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#D9DDE2] pb-2">
              <FlaskConical className="w-4 h-4 text-[#0057B8]" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
                Scientific Target Identification ({activeMission.scientificTargets.length})
              </h2>
            </div>

            <form onSubmit={handleManualAddTarget} className="space-y-3">
              <div>
                <label
                  htmlFor="target-name-input"
                  className="block text-xs font-semibold text-[#171717] mb-1"
                >
                  Target Name
                </label>
                <input
                  id="target-name-input"
                  type="text"
                  placeholder="e.g., Lacustrine Mudstone Contact"
                  value={newTargetName}
                  onChange={(e) => setNewTargetName(e.target.value)}
                  className="w-full border border-[#D9DDE2] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="target-category-select"
                  className="block text-xs font-semibold text-[#171717] mb-1"
                >
                  Geological Formation / Category
                </label>
                <select
                  id="target-category-select"
                  value={newTargetCategory}
                  onChange={(e) =>
                    setNewTargetCategory(e.target.value as ScientificTargetCategory)
                  }
                  className="w-full border border-[#D9DDE2] bg-white px-3 py-2 text-sm text-[#171717]"
                >
                  {TARGET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="target-lat-input"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Target Latitude
                  </label>
                  <input
                    id="target-lat-input"
                    type="number"
                    step="0.0001"
                    placeholder="-4.6900"
                    value={newTargetLat}
                    onChange={(e) => setNewTargetLat(e.target.value)}
                    className="w-full border border-[#D9DDE2] px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="target-lng-input"
                    className="block text-xs font-semibold text-[#171717] mb-1"
                  >
                    Target Longitude
                  </label>
                  <input
                    id="target-lng-input"
                    type="number"
                    step="0.0001"
                    placeholder="137.4300"
                    value={newTargetLng}
                    onChange={(e) => setNewTargetLng(e.target.value)}
                    className="w-full border border-[#D9DDE2] px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="target-desc-input"
                  className="block text-xs font-semibold text-[#171717] mb-1"
                >
                  Scientific Description &amp; Observation Goal
                </label>
                <textarea
                  id="target-desc-input"
                  rows={2}
                  placeholder="Describe mineral signatures, strata, or crater features to sample..."
                  value={newTargetDesc}
                  onChange={(e) => setNewTargetDesc(e.target.value)}
                  className="w-full border border-[#D9DDE2] px-3 py-2 text-sm"
                />
              </div>

              {targetError && (
                <p role="alert" className="text-xs font-semibold text-[#B91C1C]">
                  {targetError}
                </p>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#0057B8] bg-white text-[#0057B8] text-xs font-semibold uppercase tracking-wide hover:bg-[#0057B8] hover:text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Add Scientific Target</span>
              </button>
            </form>

            {activeMission.scientificTargets.length > 0 && (
              <ul className="space-y-2 pt-3 border-t border-[#D9DDE2]">
                {activeMission.scientificTargets.map((tgt, idx) => (
                  <li
                    key={tgt.id}
                    className="border border-[#D9DDE2] bg-[#F9FAFB] p-3 text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-[#171717]">
                        T{idx + 1}. {tgt.name}
                      </p>
                      <p className="text-[#0057B8] font-semibold mt-0.5">{tgt.category}</p>
                      <p className="font-mono text-[#4B5563] mt-0.5">
                        {formatMarsCoords(tgt.lat, tgt.lng, 4)}
                      </p>
                      {tgt.description && (
                        <p className="text-[#374151] mt-1 leading-relaxed">{tgt.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTarget(tgt.id)}
                      aria-label={`Remove target ${tgt.name}`}
                      className="p-1.5 border border-[#D9DDE2] bg-white text-[#B91C1C] hover:bg-[#FEE2E2] shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right Map, Route Risk Analysis, Recharts Elevation Profile, Segment Chart, and Saved Missions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Map Click Mode Switcher */}
          <div className="border border-[#D9DDE2] bg-[#F3F4F6] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#171717]">
              Map Click Action:
            </span>
            <div className="flex items-center gap-2" role="group" aria-label="Map click mode">
              <button
                type="button"
                aria-pressed={mapClickMode === 'waypoint'}
                onClick={() => setMapClickMode('waypoint')}
                className={`px-3 py-1.5 font-semibold uppercase border cursor-pointer ${
                  mapClickMode === 'waypoint'
                    ? 'bg-[#0057B8] text-white border-[#0057B8]'
                    : 'bg-white text-[#171717] border-[#D9DDE2] hover:bg-[#E5E7EB]'
                }`}
              >
                Place Waypoint
              </button>
              <button
                type="button"
                aria-pressed={mapClickMode === 'target'}
                onClick={() => setMapClickMode('target')}
                className={`px-3 py-1.5 font-semibold uppercase border cursor-pointer ${
                  mapClickMode === 'target'
                    ? 'bg-[#0057B8] text-white border-[#0057B8]'
                    : 'bg-white text-[#171717] border-[#D9DDE2] hover:bg-[#E5E7EB]'
                }`}
              >
                Place Scientific Target
              </button>
            </div>
          </div>

          <MarsMap
            layer={activeLayer}
            regions={MARS_REGIONS}
            selectedRegion={selectedRegion}
            onSelectRegion={onSelectRegion}
            waypoints={activeMission.waypoints}
            scientificTargets={activeMission.scientificTargets}
            onMapClick={handleMapClick}
            plannerMode
            clickModeLabel={
              mapClickMode === 'target'
                ? 'Click map to place scientific target'
                : 'Click map to add waypoint'
            }
            fitRouteKey={activeMission.id}
            heightClassName="h-[460px]"
          />

          {/* Feature 2: Route Terrain Risk Assessment */}
          <section
            aria-labelledby="route-risk-heading"
            className="border border-[#D9DDE2] bg-white p-5 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#D9DDE2]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8]">
                  Terrain Difficulty &amp; Safety Classification
                </p>
                <h2 id="route-risk-heading" className="text-base font-bold text-[#171717]">
                  Route Terrain Risk Analysis
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {riskAssessment.isPreliminary && (
                  <span className="bg-[#F47721] text-white text-[11px] font-bold uppercase px-2.5 py-1">
                    PRELIMINARY ASSESSMENT
                  </span>
                )}
                <span className={`${riskBadgeBg} text-white text-xs font-bold uppercase px-3 py-1`}>
                  {riskAssessment.category}
                </span>
              </div>
            </div>

            {riskAssessment.isPreliminary && riskAssessment.preliminaryReason && (
              <div className="border border-[#F47721] bg-[#FFF7ED] p-3 text-xs text-[#171717] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#F47721] shrink-0 mt-0.5" />
                <span>{riskAssessment.preliminaryReason}</span>
              </div>
            )}

            <div className="space-y-2 text-xs text-[#374151]">
              <p className="font-bold uppercase tracking-wider text-[#171717]">
                Assessed Terrain &amp; Mobility Factors
              </p>
              <ul className="list-disc pl-5 space-y-1">
                {riskAssessment.riskFactors.map((factor) => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>
            </div>

            {riskAssessment.obstacleAlerts.length > 0 && (
              <div className="border border-[#B91C1C] bg-[#FEF2F2] p-3 text-xs text-[#171717] space-y-1">
                <p className="font-bold uppercase text-[#B91C1C]">
                  Potential Obstacles Detected in Route Corridor
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {riskAssessment.obstacleAlerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-[#4B5563] border-t border-[#D9DDE2] pt-3">
              {riskAssessment.safetyDisclaimer}
            </p>
          </section>

          {/* Feature 3: Recharts Elevation Profile Visualization */}
          <TerrainProfileChart
            profileResponse={profileResponse}
            metrics={profileMetrics}
            loading={profileLoading}
            onRetry={analyzeRouteProfile}
          />

          {/* Version 4: AI Mission Advisor */}
          <MissionAdvisorPanel
            region={selectedRegion}
            activeLayer={activeLayer}
            mission={activeMission}
            profileResponse={profileResponse}
            profileMetrics={profileMetrics}
            riskAssessment={riskAssessment}
            insightData={insightData}
            onOpenAiAssistant={onNavigate ? () => onNavigate('ai-assistant') : undefined}
            onNavigate={onNavigate}
          />

          {/* Segment Distance Visualization */}
          <section className="border border-[#D9DDE2] bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
                  Traverse Leg Distances (km)
                </h2>
                <p className="text-xs text-[#4B5563]">
                  Spherical Martian great-circle distance per waypoint segment
                </p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#0057B8]">
                {segments.length} legs · {riskAssessment.totalDistanceKm.toFixed(2)} km
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="leg" tick={{ fontSize: 12, fill: '#374151' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#374151' }} unit=" km" />
                    <Tooltip
                      formatter={(value) => [`${value} km`, 'Segment Distance']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#D9DDE2',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="distanceKm" fill="#0057B8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-[#4B5563] py-6">
                Add at least two waypoints to visualize segment distances.
              </p>
            )}
          </section>

          {/* Locally Saved Missions */}
          <section className="border border-[#D9DDE2] bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717] border-b border-[#D9DDE2] pb-2 mb-3">
              Saved Mission Plans (LocalStorage)
            </h2>
            <div className="space-y-2.5">
              {savedMissions.map((mission) => {
                const isActive = mission.id === activeMission.id;
                return (
                  <div
                    key={mission.id}
                    className={`border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      isActive ? 'border-[#0057B8] bg-[#F3F4F6]' : 'border-[#D9DDE2] bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#171717]">{mission.name}</span>
                        {mission.isDemonstration && (
                          <span className="bg-[#F47721] text-white font-bold uppercase px-1.5 py-0.5 text-[10px]">
                            DEMONSTRATION DATA
                          </span>
                        )}
                      </div>
                      <p className="text-[#4B5563] mt-0.5">
                        {mission.regionName} · {mission.waypoints.length} waypoints ·{' '}
                        {mission.scientificTargets.length} targets · {mission.walkingSpeedKmH} km/h
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onChangeActiveMission(mission);
                          const reg = MARS_REGIONS.find((r) => r.id === mission.regionId);
                          if (reg) onSelectRegion(reg);
                        }}
                        className="px-3 py-1.5 border border-[#0057B8] text-[#0057B8] font-semibold uppercase hover:bg-[#0057B8] hover:text-white cursor-pointer"
                      >
                        Load Plan
                      </button>
                      {!mission.isDemonstration && (
                        <button
                          type="button"
                          onClick={() => onDeleteMission(mission.id)}
                          aria-label={`Delete saved mission ${mission.name}`}
                          className="px-2.5 py-1.5 border border-[#D9DDE2] text-[#B91C1C] hover:bg-[#FEE2E2] cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Feature 6: Printable / PDF Mission Report Modal */}
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
        recommendations={reportRecommendations}
      />
    </div>
  );
}

