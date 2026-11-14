import { AlertTriangle, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MSL_RAD_REFERENCE_RECORDS, TERRAIN_HAZARD_GUIDELINES } from '../data/safetyReference';
import type {
  InSightApiResponse,
  MarsMapLayer,
  MarsRegion,
  MissionPlan,
  PageId,
} from '../types/mars';
import { assessRouteMobility } from '../utils/marsGeo';

interface AstronautSafetyPageProps {
  selectedRegion: MarsRegion;
  activeLayer: MarsMapLayer;
  activeMission: MissionPlan;
  onNavigate: (page: PageId) => void;
}

export function AstronautSafetyPage({
  selectedRegion,
  activeLayer,
  activeMission,
  onNavigate,
}: AstronautSafetyPageProps) {
  const [insightData, setInsightData] = useState<InSightApiResponse | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);

  const mobility = assessRouteMobility(
    activeMission.waypoints,
    activeMission.walkingSpeedKmH
  );

  const loadInsightWeather = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch('/api/nasa/insight');
      const data = (await res.json()) as InSightApiResponse;
      setInsightData(data);
    } catch {
      setInsightData({
        status: 'DATA NOT CONNECTED',
        source: 'NASA InSight Mars Weather Service (api.nasa.gov)',
        error: 'Network error communicating with backend NASA API proxy.',
        sols: [],
      });
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    loadInsightWeather();
  }, []);

  const thermalChartData = (insightData?.sols ?? []).map((s) => ({
    sol: `Sol ${s.sol}`,
    minC: s.tempMinC,
    avgC: s.tempAvgC,
    maxC: s.tempMaxC,
  }));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-[#D9DDE2] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1.5">
            Surface Risk & Environmental Briefing
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#171717]">
            Astronaut Safety Center
          </h1>
          <p className="text-sm text-[#4B5563] mt-1.5 max-w-3xl">
            Empirical planetary hazard guidelines, historical lander thermal logs, documented surface
            radiation baselines, and EVA route mobility evaluations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('explorer')}
            className="px-4 py-2 border border-[#D9DDE2] bg-white text-[#171717] text-xs font-semibold uppercase tracking-wide hover:bg-[#F3F4F6] cursor-pointer"
          >
            Inspect THEMIS / CTX Map
          </button>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] cursor-pointer"
          >
            Edit Mission Route
          </button>
        </div>
      </div>

      {/* Transparency & Data Limitation Notice */}
      <div className="border border-[#F47721] bg-[#FFF7ED] p-4 text-xs text-[#171717] flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#F47721] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="font-bold uppercase tracking-wider text-[#F47721] mb-1">
            REAL-TIME SURFACE TELEMETRY: DATA NOT CONNECTED (HISTORICAL & ORBITAL ARCHIVES ONLY)
          </p>
          <p className="leading-relaxed">
            MARSCOPE does not fabricate live meteorological, radiation, or slope telemetry. All
            numerical environmental records below come strictly from documented NASA historical
            archives (InSight APSS and MSL RAD) with explicit observation dates and site limits.
          </p>
        </div>
      </div>

      {/* Mission Overview Dashboard Cards */}
      <section aria-labelledby="safety-dashboard-heading">
        <h2
          id="safety-dashboard-heading"
          className="text-lg font-bold text-[#171717] mb-4"
        >
          Mission Safety Dashboard Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-[#D9DDE2] bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-[#4B5563] mb-1">
              Selected Martian Region
            </p>
            <p className="text-sm font-bold text-[#171717]">{selectedRegion.name}</p>
            <p className="text-xs text-[#4B5563] mt-1">{selectedRegion.terrainNotice}</p>
          </div>

          <div className="border border-[#D9DDE2] bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-[#4B5563] mb-1">
              Active Map Context
            </p>
            <p className="text-sm font-bold text-[#171717]">{activeLayer.shortLabel}</p>
            <p className="text-xs text-[#4B5563] mt-1">{activeLayer.missionSource}</p>
          </div>

          <div className="border border-[#D9DDE2] bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-[#4B5563] mb-1">
              Active Mission Route
            </p>
            <p className="text-sm font-bold text-[#171717] truncate">{activeMission.name}</p>
            <p className="text-xs font-mono tabular-nums text-[#4B5563] mt-1">
              {mobility.totalDistanceKm.toFixed(2)} km · {mobility.waypointCount} waypoints
            </p>
          </div>

          <div className="border border-[#D9DDE2] bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-[#4B5563] mb-1">
              Safety Analysis Status
            </p>
            <p className="text-xs font-bold uppercase text-[#F47721] mt-1">
              DEMONSTRATION / UNCERTIFIED
            </p>
            <p className="text-xs text-[#4B5563] mt-1">
              {mobility.evaRangeClassification}
            </p>
          </div>
        </div>
      </section>

      {/* Feature 4: Astronaut Environmental Information Matrix */}
      <section aria-labelledby="env-info-matrix-heading" className="border-t border-[#D9DDE2] pt-8">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
            Integrated Environmental Context &amp; Data Classification
          </p>
          <h2 id="env-info-matrix-heading" className="text-xl font-bold text-[#171717]">
            ASTRONAUT ENVIRONMENTAL INFORMATION
          </h2>
          <p className="text-sm text-[#4B5563] mt-1 max-w-3xl">
            Every environmental indicator explicitly displays its source mission, instrument,
            observation date, spatial resolution, and coverage class.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-[#0057B8]">
                  1. Surface Temperature Context
                </span>
                <span className="bg-[#0057B8] text-white text-[10px] font-bold uppercase px-2 py-0.5">
                  GLOBAL / REGIONAL MOSAIC
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#171717] mb-1.5">
                2001 Mars Odyssey THEMIS IR
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Daytime &amp; Nighttime Band 9 infrared mosaics distinguish warm rocky outcrops
                (high nighttime thermal inertia) from cold unconsolidated dust.
              </p>
            </div>
            <dl className="mt-3 pt-2 border-t border-[#D9DDE2] text-[11px] text-[#4B5563] space-y-0.5">
              <div>
                <dt className="font-semibold text-[#171717] inline">Source / Date: </dt>
                <dd className="inline">NASA Trek / ASU / USGS (Oct 2018 Mosaic)</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#171717] inline">Resolution: </dt>
                <dd className="inline font-mono">100 m/pixel</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#F47721] inline">Limitation: </dt>
                <dd className="inline">Relative radiance mosaic, not live local air temperature.</dd>
              </div>
            </dl>
          </article>

          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-[#0057B8]">
                  2. Terrain &amp; Elevation Context
                </span>
                <span className="bg-[#0057B8] text-white text-[10px] font-bold uppercase px-2 py-0.5">
                  GLOBAL &amp; REGIONAL DEM
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#171717] mb-1.5">
                MGS MOLA &amp; Mars Express HRSC
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Global 200 m/px blended DEM plus regional 1 m/px HRSC/CTX/HiRISE Gale DEM for
                real-time route elevation profiling and macro-slope analysis.
              </p>
            </div>
            <dl className="mt-3 pt-2 border-t border-[#D9DDE2] text-[11px] text-[#4B5563] space-y-0.5">
              <div>
                <dt className="font-semibold text-[#171717] inline">Source / Mission: </dt>
                <dd className="inline">MGS MOLA (1997–2001) + ESA HRSC</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#171717] inline">Resolution: </dt>
                <dd className="inline font-mono">200–463 m/px global; 1 m/px Gale</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#F47721] inline">Limitation: </dt>
                <dd className="inline">Regional 1 m/px DEMs exist only at select landing sites.</dd>
              </div>
            </dl>
          </article>

          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-[#0057B8]">
                  3. High-Res Surface Imagery
                </span>
                <span className="bg-[#F47721] text-white text-[10px] font-bold uppercase px-2 py-0.5">
                  REGIONAL / PARTIAL COVERAGE
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#171717] mb-1.5">
                MRO HiRISE &amp; Context Camera (CTX)
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Continuous 5 m/px CTX global mosaic paired with 25 cm/px Jezero HiRISE mosaic and
                targeted PDS strip links to inspect meter-scale boulder fields.
              </p>
            </div>
            <dl className="mt-3 pt-2 border-t border-[#D9DDE2] text-[11px] text-[#4B5563] space-y-0.5">
              <div>
                <dt className="font-semibold text-[#171717] inline">Source / Team: </dt>
                <dd className="inline">Caltech Murray Lab &amp; UArizona HiRISE</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#171717] inline">Resolution: </dt>
                <dd className="inline font-mono">5 m/px CTX; 0.25–0.30 m/px HiRISE</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#F47721] inline">Limitation: </dt>
                <dd className="inline">HiRISE covers ~5% of Mars; global continuity relies on CTX.</dd>
              </div>
            </dl>
          </article>

          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-[#0057B8]">
                  4. Surface Radiation Baseline
                </span>
                <span className="bg-[#F47721] text-white text-[10px] font-bold uppercase px-2 py-0.5">
                  HISTORICAL MEASUREMENTS
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#171717] mb-1.5">
                Curiosity (MSL) RAD Instrument
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Quiet-solar Gale Crater baseline: ~0.21 mGy/day absorbed dose rate (~0.64 mSv/day
                dose equivalent) from cosmic ray bombardment under thin atmosphere.
              </p>
            </div>
            <dl className="mt-3 pt-2 border-t border-[#D9DDE2] text-[11px] text-[#4B5563] space-y-0.5">
              <div>
                <dt className="font-semibold text-[#171717] inline">Observation Window: </dt>
                <dd className="inline">Aug 2012–Jun 2013 (Hassler et al., Science 2014)</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#F47721] inline">Live Status: </dt>
                <dd className="inline font-semibold">UNAVAILABLE DATA (no real-time radiation stream)</dd>
              </div>
            </dl>
          </article>

          <article className="border border-[#D9DDE2] bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-[#0057B8]">
                  5. Atmospheric Observations
                </span>
                <span
                  className={`text-white text-[10px] font-bold uppercase px-2 py-0.5 ${
                    insightData?.status === 'HISTORICAL DATA' ? 'bg-[#0057B8]' : 'bg-[#F47721]'
                  }`}
                >
                  {insightData?.status === 'HISTORICAL DATA'
                    ? 'HISTORICAL MEASUREMENTS'
                    : 'UNAVAILABLE DATA'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#171717] mb-1.5">
                InSight APSS / TWINS &amp; Pathfinder Context
              </h3>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Archived surface pressure (~600–1,000 Pa), temperature swings (&gt;80°C diurnal
                range), and horizontal wind speed from Elysium Planitia (Oct 2020 Sols 675–681).
              </p>
            </div>
            <dl className="mt-3 pt-2 border-t border-[#D9DDE2] text-[11px] text-[#4B5563] space-y-0.5">
              <div>
                <dt className="font-semibold text-[#171717] inline">Source / Date: </dt>
                <dd className="inline">NASA api.nasa.gov (Concluded Dec 2022)</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#F47721] inline">Limitation: </dt>
                <dd className="inline">Single plain site; regional dust storms not live-monitored.</dd>
              </div>
            </dl>
          </article>

          <article className="border border-[#D9DDE2] bg-[#FFF7ED] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase text-[#F47721]">
                  6. Demonstration &amp; Telemetry Notice
                </span>
                <span className="bg-[#F47721] text-white text-[10px] font-bold uppercase px-2 py-0.5">
                  DEMONSTRATION DATA
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#171717] mb-1.5">
                Sample Traverse Routes vs. Real Observations
              </h3>
              <p className="text-xs text-[#374151] leading-relaxed">
                Default Gale Crater routes and target descriptions are sample demonstration scenarios.
                DEM elevation, USGS dune polygons, and InSight weather records reflect real NASA
                archives only.
              </p>
            </div>
            <p className="mt-3 pt-2 border-t border-[#F47721]/40 text-[11px] font-semibold text-[#B45309]">
              Simulated live telemetry is strictly prohibited in MARSCOPE.
            </p>
          </article>
        </div>
      </section>

      {/* Section 1: TERRAIN HAZARDS */}
      <section aria-labelledby="terrain-hazards-heading" className="border-t border-[#D9DDE2] pt-8">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
            01 · Surface Trafficability
          </p>
          <h2 id="terrain-hazards-heading" className="text-xl font-bold text-[#171717]">
            TERRAIN HAZARDS
          </h2>
          <p className="text-sm text-[#4B5563] mt-1">
            Key physical terrain threats identified across orbital imagery and past rover traverses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TERRAIN_HAZARD_GUIDELINES.map((hazard) => (
            <article key={hazard.id} className="border border-[#D9DDE2] bg-white p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-base font-bold text-[#171717]">{hazard.title}</h3>
                <span className="inline-flex items-center gap-1 bg-[#F47721] text-white text-[11px] font-bold uppercase px-2 py-0.5 shrink-0">
                  <ShieldAlert className="w-3 h-3" aria-hidden="true" />
                  <span>{hazard.severity}</span>
                </span>
              </div>
              <dl className="space-y-2 text-xs text-[#4B5563] mt-3">
                <div>
                  <dt className="font-semibold text-[#171717] inline">Hazard Indicators: </dt>
                  <dd className="inline">{hazard.indicators}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#171717] inline">Detection Datasets: </dt>
                  <dd className="inline">{hazard.detectionDatasets}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#171717] inline">Mitigation Guidance: </dt>
                  <dd className="inline">{hazard.mitigationNotes}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      {/* Section 2: THERMAL CONDITIONS */}
      <section aria-labelledby="thermal-conditions-heading" className="border-t border-[#D9DDE2] pt-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
              02 · Surface Temperature & Thermal Inertia
            </p>
            <h2 id="thermal-conditions-heading" className="text-xl font-bold text-[#171717]">
              THERMAL CONDITIONS
            </h2>
            <p className="text-sm text-[#4B5563] mt-1 max-w-3xl">
              Martian thin CO2 atmosphere (~600–1,000 Pa) produces extreme diurnal temperature swings.
              Compare daytime vs. nighttime THEMIS infrared imagery to distinguish bedrock from dust.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 text-xs font-bold uppercase text-white ${
                insightData?.status === 'HISTORICAL DATA' ? 'bg-[#0057B8]' : 'bg-[#F47721]'
              }`}
            >
              {insightLoading
                ? 'CONNECTING...'
                : insightData?.status ?? 'DATA NOT CONNECTED'}
            </span>
            <button
              type="button"
              onClick={loadInsightWeather}
              aria-label="Refresh InSight weather archive"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D9DDE2] bg-white text-xs font-semibold hover:bg-[#F3F4F6] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 border border-[#D9DDE2] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#D9DDE2]">
              <div>
                <h3 className="text-sm font-bold text-[#171717]">
                  InSight Lander Surface Air Temperature Archive (Elysium Planitia)
                </h3>
                <p className="text-xs text-[#4B5563]">
                  {insightData?.note ??
                    'Archived meteorological observations from NASA Open APIs (api.nasa.gov).'}
                </p>
              </div>
              <a
                href="https://api.nasa.gov/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0057B8] hover:underline"
              >
                <span>api.nasa.gov</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>

            {insightLoading ? (
              <div className="py-12 text-center text-xs text-[#4B5563]">
                Fetching archived InSight meteorological sols...
              </div>
            ) : insightData?.status === 'HISTORICAL DATA' && thermalChartData.length > 0 ? (
              <>
                <div className="h-64 w-full mb-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={thermalChartData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="sol" tick={{ fontSize: 12, fill: '#374151' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#374151' }} unit="°C" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#D9DDE2',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="maxC"
                        name="Daytime Max (°C)"
                        stroke="#F47721"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgC"
                        name="Sol Average (°C)"
                        stroke="#171717"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="minC"
                        name="Nighttime Min (°C)"
                        stroke="#0057B8"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#D9DDE2] bg-[#F3F4F6] text-[#171717]">
                        <th className="py-2 px-3 font-semibold">Sol</th>
                        <th className="py-2 px-3 font-semibold">UTC Date</th>
                        <th className="py-2 px-3 font-semibold">Min Temp</th>
                        <th className="py-2 px-3 font-semibold">Avg Temp</th>
                        <th className="py-2 px-3 font-semibold">Max Temp</th>
                        <th className="py-2 px-3 font-semibold">Pressure</th>
                        <th className="py-2 px-3 font-semibold">Mean Wind</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insightData.sols.map((s) => (
                        <tr key={s.sol} className="border-b border-[#D9DDE2]">
                          <td className="py-2 px-3 font-mono font-semibold tabular-nums">
                            Sol {s.sol}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-[#4B5563]">
                            {s.firstUtc ? s.firstUtc.slice(0, 10) : '—'}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-[#0057B8]">
                            {s.tempMinC !== null ? `${s.tempMinC} °C` : '—'}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums">
                            {s.tempAvgC !== null ? `${s.tempAvgC} °C` : '—'}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums text-[#F47721]">
                            {s.tempMaxC !== null ? `${s.tempMaxC} °C` : '—'}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums">
                            {s.pressureAvgPa !== null ? `${s.pressureAvgPa} Pa` : '—'}
                          </td>
                          <td className="py-2 px-3 font-mono tabular-nums">
                            {s.windAvgMs !== null ? `${s.windAvgMs} m/s` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-6 text-xs text-[#374151]">
                <p className="font-bold text-[#F47721] uppercase mb-1">DATA NOT CONNECTED</p>
                <p>
                  {insightData?.error ??
                    'NASA InSight meteorological archive could not be retrieved right now.'}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 border border-[#D9DDE2] bg-white p-5 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#171717] border-b border-[#D9DDE2] pb-2">
              Daytime vs. Nighttime Thermal Context
            </h3>
            <div className="text-xs text-[#4B5563] space-y-3 leading-relaxed">
              <p>
                <span className="font-semibold text-[#171717] block mb-0.5">
                  Daytime Heating (THEMIS Day IR)
                </span>
                Dark basaltic plains absorb solar radiation and heat rapidly during midday hours,
                whereas bright dust mantles reflect sunlight and stay cooler.
              </p>
              <p>
                <span className="font-semibold text-[#171717] block mb-0.5">
                  Nighttime Cooling (THEMIS Night IR)
                </span>
                Fine dust loses heat within hours after sunset (appearing dark), while exposed
                bedrock and dense boulder fields retain thermal energy overnight (appearing bright).
              </p>
              <p>
                <span className="font-semibold text-[#171717] block mb-0.5">
                  Suit & Hardware Implication
                </span>
                Diurnal swings exceeding 80°C at the surface require closed-loop EVA suit thermal
                regulation and limit battery efficiency during early-morning or dusk traverses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: RADIATION ENVIRONMENT */}
      <section aria-labelledby="radiation-env-heading" className="border-t border-[#D9DDE2] pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
              03 · Galactic Cosmic Rays & Solar Energetic Particles
            </p>
            <h2 id="radiation-env-heading" className="text-xl font-bold text-[#171717]">
              RADIATION ENVIRONMENT
            </h2>
          </div>
          <span className="bg-[#F47721] text-white text-xs font-bold uppercase px-2.5 py-1">
            HISTORICAL DATA · LIVE TELEMETRY NOT CONNECTED
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {MSL_RAD_REFERENCE_RECORDS.map((rec) => (
            <article key={rec.parameter} className="border border-[#D9DDE2] bg-white p-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
                  {rec.parameter}
                </p>
                <p className="text-xl font-bold text-[#171717] font-mono tabular-nums mb-3">
                  {rec.measuredValue}
                </p>
                <dl className="space-y-2 text-xs text-[#4B5563] border-t border-[#D9DDE2] pt-3">
                  <div>
                    <dt className="font-semibold text-[#171717] inline">Source: </dt>
                    <dd className="inline">{rec.missionSource}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#171717] inline">Observation Window: </dt>
                    <dd className="inline">{rec.observationPeriod}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#F47721] inline">Data Limitations: </dt>
                    <dd className="inline">{rec.limitations}</dd>
                  </div>
                </dl>
              </div>
              <a
                href={rec.citationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0057B8] hover:underline mt-4 pt-3 border-t border-[#D9DDE2]"
              >
                <span>Inspect NASA PDS Archive</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* Section 4: MISSION MOBILITY */}
      <section aria-labelledby="mission-mobility-heading" className="border-t border-[#D9DDE2] pt-8">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
            04 · Active Route Geometry Assessment
          </p>
          <h2 id="mission-mobility-heading" className="text-xl font-bold text-[#171717]">
            MISSION MOBILITY
          </h2>
        </div>

        <div className="border border-[#D9DDE2] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#D9DDE2]">
            <div>
              <h3 className="text-base font-bold text-[#171717]">{activeMission.name}</h3>
              <p className="text-xs text-[#4B5563]">
                {activeMission.regionName} · {activeMission.status}
              </p>
            </div>
            <span className="bg-[#F47721] text-white text-xs font-bold uppercase px-2.5 py-1">
              {mobility.evaRangeClassification}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="border border-[#D9DDE2] p-3 bg-[#F3F4F6]">
              <p className="text-xs text-[#4B5563]">Route Length</p>
              <p className="text-lg font-bold font-mono tabular-nums text-[#171717]">
                {mobility.totalDistanceKm.toFixed(2)} km
              </p>
            </div>
            <div className="border border-[#D9DDE2] p-3 bg-[#F3F4F6]">
              <p className="text-xs text-[#4B5563]">Mean Waypoint Spacing</p>
              <p className="text-lg font-bold font-mono tabular-nums text-[#171717]">
                {mobility.meanSegmentKm.toFixed(2)} km
              </p>
            </div>
            <div className="border border-[#D9DDE2] p-3 bg-[#F3F4F6]">
              <p className="text-xs text-[#4B5563]">Longest Segment</p>
              <p className="text-lg font-bold font-mono tabular-nums text-[#171717]">
                {mobility.maxSegmentKm.toFixed(2)} km
              </p>
            </div>
            <div className="border border-[#D9DDE2] p-3 bg-[#F3F4F6]">
              <p className="text-xs text-[#4B5563]">
                Duration ({activeMission.walkingSpeedKmH.toFixed(1)} km/h)
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-[#171717]">
                {mobility.estimatedHours.toFixed(2)} hrs
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[#374151]">
            <p className="font-bold text-[#F47721] uppercase">
              Mobility & Equipment Considerations
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              {mobility.cautionNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
              <li>
                {mobility.safetyCertification}
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
