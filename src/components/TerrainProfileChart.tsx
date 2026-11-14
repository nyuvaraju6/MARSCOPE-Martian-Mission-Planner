import { ExternalLink, RefreshCw } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RouteTerrainAnalysisResponse, TerrainProfileMetrics } from '../types/mars';

interface TerrainProfileChartProps {
  profileResponse: RouteTerrainAnalysisResponse | null;
  metrics: TerrainProfileMetrics;
  loading: boolean;
  onRetry?: () => void;
  title?: string;
}

export function TerrainProfileChart({
  profileResponse,
  metrics,
  loading,
  onRetry,
  title = 'Elevation Profile Along Route (MOLA / HRSC DEM)',
}: TerrainProfileChartProps) {
  const validSamples = (profileResponse?.samples ?? []).filter(
    (s): s is typeof s & { elevationM: number } =>
      s.elevationM !== null && Number.isFinite(s.elevationM)
  );

  const chartData = validSamples.map((s) => ({
    distanceKm: Number(s.distanceKm.toFixed(2)),
    elevationM: Number(s.elevationM.toFixed(1)),
    slopeDeg: s.segmentSlopeDeg,
    isSteep: s.isSteep,
    waypointName: s.waypointName,
    coords: `${s.lat.toFixed(4)}°, ${s.lng.toFixed(4)}°`,
  }));

  const steepDots = chartData.filter((d) => d.slopeDeg !== null && d.slopeDeg >= 8);

  return (
    <section className="border border-[#D9DDE2] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 mb-4 border-b border-[#D9DDE2]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8]">
            Orbital Topographic Cross-Section
          </p>
          <h2 className="text-base font-bold text-[#171717]">{title}</h2>
          {profileResponse && (
            <p className="text-xs text-[#4B5563] mt-0.5">
              Source: {profileResponse.demName} · {profileResponse.demInstrument} · Resolution:{' '}
              <span className="font-mono font-semibold text-[#171717]">
                {profileResponse.demResolution}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {profileResponse && (
            <span
              className={`px-2 py-1 text-[11px] font-bold uppercase text-white ${
                profileResponse.status === 'COMPLETE' ? 'bg-[#0057B8]' : 'bg-[#F47721]'
              }`}
            >
              {profileResponse.status === 'COMPLETE'
                ? 'GLOBAL / REGIONAL DEM'
                : profileResponse.status === 'PARTIAL'
                ? 'PARTIAL COVERAGE'
                : 'UNAVAILABLE DATA'}
            </span>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={loading}
              aria-label="Refresh DEM elevation profile"
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#D9DDE2] bg-white text-xs font-semibold hover:bg-[#F3F4F6] disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Analyze DEM</span>
            </button>
          )}
        </div>
      </div>

      {/* Elevation Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
          <p className="text-[11px] uppercase tracking-wider text-[#4B5563]">Highest Point</p>
          <p className="text-base font-bold font-mono tabular-nums text-[#171717]">
            {metrics.highestPointM !== null ? `${metrics.highestPointM.toFixed(1)} m` : '—'}
          </p>
        </div>
        <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
          <p className="text-[11px] uppercase tracking-wider text-[#4B5563]">Lowest Point</p>
          <p className="text-base font-bold font-mono tabular-nums text-[#171717]">
            {metrics.lowestPointM !== null ? `${metrics.lowestPointM.toFixed(1)} m` : '—'}
          </p>
        </div>
        <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
          <p className="text-[11px] uppercase tracking-wider text-[#4B5563]">Elevation Difference</p>
          <p className="text-base font-bold font-mono tabular-nums text-[#171717]">
            {metrics.elevationDifferenceM !== null
              ? `${metrics.elevationDifferenceM.toFixed(1)} m`
              : '—'}
          </p>
        </div>
        <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
          <p className="text-[11px] uppercase tracking-wider text-[#4B5563]">Steep Sections</p>
          <p className="text-base font-bold font-mono tabular-nums text-[#F47721]">
            {metrics.maxSlopeDeg !== null
              ? `${metrics.steepSections.length} (Max ${metrics.maxSlopeDeg.toFixed(1)}°)`
              : 'Unavailable'}
          </p>
        </div>
      </div>

      {/* Chart Area */}
      {loading && chartData.length === 0 ? (
        <div className="py-10 text-center text-xs text-[#4B5563] border border-[#D9DDE2] bg-[#F3F4F6]">
          Querying NASA Mars Trek MOLA/HRSC Digital Elevation Model along route...
        </div>
      ) : chartData.length >= 2 ? (
        <>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 4, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="distanceKm"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 11, fill: '#374151' }}
                  unit=" km"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#374151' }}
                  unit=" m"
                  width={68}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#D9DDE2',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => {
                    if (name === 'elevationM') return [`${value} m`, 'Elevation (Areoid)'];
                    return [String(value), String(name)];
                  }}
                  labelFormatter={(label, payload) => {
                    const pt = payload?.[0]?.payload as (typeof chartData)[number] | undefined;
                    const slopeText =
                      pt?.slopeDeg !== null && pt?.slopeDeg !== undefined
                        ? ` · Local Slope: ${pt.slopeDeg.toFixed(1)}°`
                        : '';
                    const wpText = pt?.waypointName ? ` (${pt.waypointName})` : '';
                    return `Distance: ${label} km${slopeText}${wpText}`;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="elevationM"
                  stroke="#0057B8"
                  strokeWidth={2}
                  fill="#0057B8"
                  fillOpacity={0.14}
                  isAnimationActive={false}
                />
                {steepDots.map((dot) => (
                  <ReferenceDot
                    key={`${dot.distanceKm}-${dot.elevationM}`}
                    x={dot.distanceKm}
                    y={dot.elevationM}
                    r={5}
                    fill={dot.isSteep ? '#B91C1C' : '#F47721'}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[#4B5563]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#0057B8] inline-block" aria-hidden="true" />
              <span>Route Elevation (m)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F47721] inline-block" aria-hidden="true" />
              <span>Caution Slope (8°–15°)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B91C1C] inline-block" aria-hidden="true" />
              <span>Steep Section (&gt;=15°)</span>
            </span>
            {metrics.totalElevationGainM !== null && metrics.totalElevationLossM !== null && (
              <span className="font-mono tabular-nums text-[#171717] ml-auto">
                Gain: +{metrics.totalElevationGainM.toFixed(1)} m · Loss: -
                {metrics.totalElevationLossM.toFixed(1)} m
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="border border-[#F47721] bg-[#FFF7ED] p-4 text-xs text-[#171717]">
          <p className="font-bold uppercase text-[#F47721] mb-1">
            ELEVATION PROFILE UNAVAILABLE / PRELIMINARY
          </p>
          <p>
            {profileResponse?.error ||
              'Place at least two waypoints and ensure outbound access to NASA Mars Trek to retrieve elevation samples.'}
          </p>
        </div>
      )}

      {/* Identified Steep Sections */}
      {metrics.steepSections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#D9DDE2]">
          <p className="text-xs font-bold uppercase tracking-wider text-[#F47721] mb-2">
            Identified Steep / Sloping Sections (&gt;=8°)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {metrics.steepSections.slice(0, 6).map((sec) => (
              <div
                key={sec.legLabel}
                className="border border-[#D9DDE2] bg-[#FFF7ED] px-3 py-2 flex items-center justify-between gap-2"
              >
                <span className="font-mono font-semibold text-[#171717]">{sec.legLabel}</span>
                <span
                  className={`font-mono font-bold ${
                    sec.slopeDeg >= 15 ? 'text-[#B91C1C]' : 'text-[#F47721]'
                  }`}
                >
                  {sec.slopeDeg.toFixed(1)}° ({sec.elevationDeltaM >= 0 ? '+' : ''}
                  {sec.elevationDeltaM.toFixed(0)} m)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source & Coverage Limitations */}
      {profileResponse && (
        <div className="mt-4 pt-3 border-t border-[#D9DDE2] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#4B5563]">
          <span>
            <strong className="text-[#171717]">Data Limitation:</strong>{' '}
            {profileResponse.demCoverageNote}
          </span>
          <a
            href={profileResponse.demSourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#0057B8] hover:underline shrink-0"
          >
            <span>NASA Mars Trek DEM</span>
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      )}
    </section>
  );
}
