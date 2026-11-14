import { AlertTriangle, ExternalLink, Layers, MapPin, Mountain, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { MARS_MAP_LAYERS } from '../data/marsLayers';
import { MARS_REGIONS } from '../data/marsRegions';
import type {
  MarsLayerCategory,
  MarsMapLayer,
  MarsRegion,
  MissionPlan,
  PageId,
  PointTerrainAnalysis,
  RouteTerrainAnalysisResponse,
} from '../types/mars';
import { formatMarsCoords } from '../utils/marsGeo';
import { computeTerrainProfileMetrics } from '../utils/terrainAnalysis';
import { MarsMap } from './MarsMap';
import { TerrainProfileChart } from './TerrainProfileChart';

interface TrekCatalogItem {
  id: string;
  title: string;
  mission: string;
  instrument: string;
  productType: string;
  resolution: string;
}

interface MarsExplorerPageProps {
  selectedRegion: MarsRegion;
  onSelectRegion: (region: MarsRegion) => void;
  activeLayerId: MarsLayerCategory;
  onSelectLayerId: (layerId: MarsLayerCategory) => void;
  activeMission: MissionPlan;
  onNavigate: (page: PageId) => void;
}

export function MarsExplorerPage({
  selectedRegion,
  onSelectRegion,
  activeLayerId,
  onSelectLayerId,
  activeMission,
  onNavigate,
}: MarsExplorerPageProps) {
  const [geologyOverlayEnabled, setGeologyOverlayEnabled] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);

  const [trekItems, setTrekItems] = useState<TrekCatalogItem[]>([]);
  const [trekStatus, setTrekStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [trekTotalFound, setTrekTotalFound] = useState<number>(0);

  const [analysisPin, setAnalysisPin] = useState<{ lat: number; lng: number }>({
    lat: selectedRegion.lat,
    lng: selectedRegion.lng,
  });
  const [pointAnalysis, setPointAnalysis] = useState<PointTerrainAnalysis | null>(null);
  const [pointLoading, setPointLoading] = useState(true);

  const [routeProfile, setRouteProfile] = useState<RouteTerrainAnalysisResponse | null>(null);
  const [routeProfileLoading, setRouteProfileLoading] = useState(false);

  const activeLayer: MarsMapLayer =
    MARS_MAP_LAYERS.find((l) => l.id === activeLayerId) ?? MARS_MAP_LAYERS[0];
  const geologyLayer = MARS_MAP_LAYERS.find((l) => l.id === 'geology') ?? null;

  const analyzeCoordinate = useCallback(async (lat: number, lng: number) => {
    setAnalysisPin({ lat, lng });
    setPointLoading(true);
    try {
      const res = await fetch('/api/nasa/terrain/point', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const data = (await res.json()) as PointTerrainAnalysis;
      setPointAnalysis(data);
    } catch {
      setPointAnalysis({
        lat,
        lng,
        primaryElevationM: null,
        primaryDemName: 'MGS MOLA & Mars Express HRSC Global Blended DEM',
        primaryDemInstrument: 'MOLA + HRSC',
        primaryDemResolution: 'Unavailable',
        primaryDemSourceUrl: 'https://trek.nasa.gov/mars/',
        molaGlobalElevationM: null,
        molaHrscElevationM: null,
        regionalHiResElevationM: null,
        slopeDeg: null,
        slopePercent: null,
        aspectLabel: null,
        slopeCategory: 'UNAVAILABLE',
        isSteepSlope: false,
        morphologyLabel: 'UNAVAILABLE',
        relativeReliefM: null,
        nearbyFeatures: [],
        nearbyDuneFields: [],
        nearbyMineralDetections: [],
        dataAvailability: 'UNAVAILABLE',
        limitationNote: 'Unable to contact backend NASA Mars Trek terrain proxy.',
        queriedAt: new Date().toISOString(),
        error: 'Network error fetching DEM sample',
      });
    } finally {
      setPointLoading(false);
    }
  }, []);

  const fetchRouteProfile = useCallback(async () => {
    if (activeMission.waypoints.length < 2) {
      setRouteProfile(null);
      return;
    }
    setRouteProfileLoading(true);
    try {
      const res = await fetch('/api/nasa/terrain/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints: activeMission.waypoints }),
      });
      const data = (await res.json()) as RouteTerrainAnalysisResponse;
      setRouteProfile(data);
    } catch {
      setRouteProfile(null);
    } finally {
      setRouteProfileLoading(false);
    }
  }, [activeMission.waypoints]);

  // Analyze selected region center automatically when region changes
  useEffect(() => {
    analyzeCoordinate(selectedRegion.lat, selectedRegion.lng);
  }, [selectedRegion.id, selectedRegion.lat, selectedRegion.lng, analyzeCoordinate]);

  // Load route profile for active mission route
  useEffect(() => {
    fetchRouteProfile();
  }, [fetchRouteProfile]);

  useEffect(() => {
    let cancelled = false;
    const queryTerm = selectedRegion.name.split('(')[0].trim();

    async function fetchTrekCatalog() {
      setTrekStatus('loading');
      try {
        const res = await fetch(
          `/api/nasa/trek/search?q=${encodeURIComponent(queryTerm)}&rows=8`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          status: string;
          totalFound?: number;
          items?: TrekCatalogItem[];
        };
        if (cancelled) return;
        if (data.status === 'AVAILABLE' && Array.isArray(data.items)) {
          setTrekItems(data.items);
          setTrekTotalFound(data.totalFound ?? data.items.length);
          setTrekStatus('ready');
        } else {
          setTrekStatus('error');
        }
      } catch {
        if (!cancelled) setTrekStatus('error');
      }
    }

    fetchTrekCatalog();
    return () => {
      cancelled = true;
    };
  }, [selectedRegion.id, selectedRegion.name]);

  const profileMetrics = computeTerrainProfileMetrics(routeProfile?.samples ?? []);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="pb-6 mb-6 border-b border-[#D9DDE2] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1.5">
            Interactive Geospatial Exploration &amp; Terrain Analysis
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#171717]">
            Interactive Mars Explorer
          </h1>
          <p className="text-sm text-[#4B5563] mt-1.5 max-w-3xl">
            Inspect NASA Mars Trek WMTS/DEM elevation, compute local slope and crater depression
            context at any clicked coordinate, and cross-reference orbital imagery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] cursor-pointer"
          >
            Plan Route in This Region
          </button>
          <button
            type="button"
            onClick={() => onNavigate('safety')}
            className="px-4 py-2 border border-[#D9DDE2] bg-white text-[#171717] text-xs font-semibold uppercase tracking-wide hover:bg-[#F3F4F6] cursor-pointer"
          >
            View Environmental &amp; Safety Brief
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Column */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Region Selector */}
          <section className="border border-[#D9DDE2] bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-[#0057B8]" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
                1. Martian Region Focus
              </h2>
            </div>
            <label htmlFor="explorer-region-select" className="sr-only">
              Select Martian Exploration Region
            </label>
            <select
              id="explorer-region-select"
              value={selectedRegion.id}
              onChange={(e) => {
                const found = MARS_REGIONS.find((r) => r.id === e.target.value);
                if (found) onSelectRegion(found);
              }}
              className="w-full border border-[#D9DDE2] bg-white px-3 py-2 text-sm text-[#171717] mb-4 focus:outline-2 focus:outline-[#0057B8]"
            >
              {MARS_REGIONS.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name} ({formatMarsCoords(region.lat, region.lng, 1)})
                </option>
              ))}
            </select>

            <div className="space-y-2 text-xs text-[#4B5563] border-t border-[#D9DDE2] pt-3">
              <p>
                <span className="font-semibold text-[#171717]">Quadrangle:</span>{' '}
                {selectedRegion.quadrangle}
              </p>
              <p>
                <span className="font-semibold text-[#171717]">Elevation:</span>{' '}
                {selectedRegion.elevationSummary}
              </p>
              <p>
                <span className="font-semibold text-[#171717]">Mission History:</span>{' '}
                {selectedRegion.missionHistory}
              </p>
              <p>
                <span className="font-semibold text-[#171717]">Science Interest:</span>{' '}
                {selectedRegion.scientificInterest}
              </p>
              <p className="text-[#B45309] font-medium pt-1">
                <span className="font-bold uppercase text-[#F47721]">Terrain Caution: </span>
                {selectedRegion.terrainNotice}
              </p>
            </div>
          </section>

          {/* Scientific Layer Selector */}
          <section className="border border-[#D9DDE2] bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-[#0057B8]" aria-hidden="true" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717]">
                2. Scientific Map Layers
              </h2>
            </div>

            <div className="space-y-2">
              {MARS_MAP_LAYERS.map((layer) => {
                const isSelected = layer.id === activeLayer.id;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => onSelectLayerId(layer.id)}
                    aria-pressed={isSelected}
                    className={`w-full text-left p-3 border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#0057B8] bg-[#F3F4F6]'
                        : 'border-[#D9DDE2] bg-white hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-[#171717]">
                        {layer.code}. {layer.shortLabel}
                      </span>
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wide ${
                          layer.availabilityStatus === 'LIVE TILES'
                            ? 'text-[#0057B8]'
                            : 'text-[#F47721]'
                        }`}
                      >
                        {layer.availabilityStatus}
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563]">
                      {layer.missionSource} · {layer.resolution}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Optional Geology Overlay Toggle */}
            {activeLayer.id !== 'geology' && geologyLayer && (
              <div className="mt-4 pt-4 border-t border-[#D9DDE2]">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-[#171717] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={geologyOverlayEnabled}
                    onChange={(e) => setGeologyOverlayEnabled(e.target.checked)}
                    className="w-4 h-4 accent-[#0057B8]"
                  />
                  <span>Overlay USGS SIM 3292 Geology Map</span>
                </label>
                {geologyOverlayEnabled && (
                  <div className="mt-2">
                    <label
                      htmlFor="geology-opacity"
                      className="block text-xs text-[#4B5563] mb-1"
                    >
                      Overlay Opacity: {Math.round(overlayOpacity * 100)}%
                    </label>
                    <input
                      id="geology-opacity"
                      type="range"
                      min={0.15}
                      max={0.9}
                      step={0.05}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                      className="w-full accent-[#0057B8]"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Map Legend & Scientific Limitations */}
          <section className="border border-[#D9DDE2] bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717] mb-3">
              3. Active Layer Legend &amp; Source
            </h2>
            <p className="text-xs font-semibold text-[#171717] mb-1">{activeLayer.name}</p>
            <p className="text-xs text-[#4B5563] leading-relaxed mb-4">
              {activeLayer.description}
            </p>

            <div className="space-y-2 mb-4">
              {activeLayer.legendItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-xs text-[#374151]">
                  <span
                    className="w-4 h-4 border border-[#9CA3AF] shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3 text-xs text-[#374151] mb-3">
              <span className="font-bold uppercase text-[#F47721] block mb-1">
                Dataset Coverage &amp; Limitation
              </span>
              {activeLayer.limitationNote}
            </div>

            <a
              href={activeLayer.officialSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0057B8] hover:underline"
            >
              <span>Official Source: {activeLayer.officialSourceLabel}</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </section>
        </aside>

        {/* Right Interactive Map, Point Terrain Analysis, Route Profile & Live Trek Query */}
        <div className="lg:col-span-8 space-y-6">
          <MarsMap
            layer={activeLayer}
            overlayLayer={
              geologyOverlayEnabled && activeLayer.id !== 'geology' ? geologyLayer : null
            }
            overlayOpacity={overlayOpacity}
            regions={MARS_REGIONS}
            selectedRegion={selectedRegion}
            onSelectRegion={onSelectRegion}
            analysisPin={analysisPin}
            onMapClick={(lat, lng) => analyzeCoordinate(lat, lng)}
            heightClassName="h-[520px] lg:h-[580px]"
          />

          {/* Feature 1: Coordinate DEM Terrain, Slope & Crater Awareness Panel */}
          <section
            aria-labelledby="terrain-point-analysis-heading"
            className="border border-[#D9DDE2] bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 mb-4 border-b border-[#D9DDE2]">
              <div className="flex items-start gap-2.5">
                <Mountain className="w-4 h-4 text-[#0057B8] mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8]">
                    Point DEM Inspection (MOLA + HRSC)
                  </p>
                  <h2
                    id="terrain-point-analysis-heading"
                    className="text-base font-bold text-[#171717]"
                  >
                    Terrain Analysis at {formatMarsCoords(analysisPin.lat, analysisPin.lng, 4)}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {pointAnalysis && (
                  <span
                    className={`px-2 py-1 text-[11px] font-bold uppercase text-white ${
                      pointAnalysis.dataAvailability === 'UNAVAILABLE'
                        ? 'bg-[#F47721]'
                        : 'bg-[#0057B8]'
                    }`}
                  >
                    {pointAnalysis.dataAvailability}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => analyzeCoordinate(selectedRegion.lat, selectedRegion.lng)}
                  className="px-2.5 py-1 border border-[#D9DDE2] bg-white text-xs font-semibold hover:bg-[#F3F4F6] cursor-pointer"
                >
                  Analyze Region Center
                </button>
              </div>
            </div>

            {pointLoading ? (
              <div className="flex items-center gap-2 text-xs text-[#4B5563] py-4">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0057B8]" aria-hidden="true" />
                <span>
                  Querying NASA Mars Trek DEM pixels and finite-difference slope stencil...
                </span>
              </div>
            ) : pointAnalysis ? (
              <div className="space-y-4">
                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-[#4B5563]">
                      Primary Elevation
                    </p>
                    <p className="text-lg font-bold font-mono tabular-nums text-[#171717] mt-0.5">
                      {pointAnalysis.primaryElevationM !== null
                        ? `${pointAnalysis.primaryElevationM.toFixed(1)} m`
                        : 'Unavailable'}
                    </p>
                    <p className="text-[11px] text-[#4B5563] mt-0.5">
                      {pointAnalysis.primaryDemResolution}
                    </p>
                  </div>

                  <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-[#4B5563]">
                      Computed Slope
                    </p>
                    <p
                      className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                        pointAnalysis.isSteepSlope ? 'text-[#B91C1C]' : 'text-[#171717]'
                      }`}
                    >
                      {pointAnalysis.slopeDeg !== null
                        ? `${pointAnalysis.slopeDeg.toFixed(2)}° (${pointAnalysis.slopePercent?.toFixed(
                            1
                          )}%)`
                        : 'Unavailable'}
                    </p>
                    <p
                      className={`text-[11px] font-semibold mt-0.5 ${
                        pointAnalysis.isSteepSlope ? 'text-[#B91C1C]' : 'text-[#0057B8]'
                      }`}
                    >
                      {pointAnalysis.slopeCategory}
                    </p>
                  </div>

                  <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-[#4B5563]">
                      Crater / Depression Relief
                    </p>
                    <p className="text-xs font-bold text-[#171717] mt-1">
                      {pointAnalysis.morphologyLabel}
                    </p>
                    <p className="text-[11px] font-mono text-[#4B5563] mt-0.5">
                      {pointAnalysis.relativeReliefM !== null
                        ? `Rel. relief: ${
                            pointAnalysis.relativeReliefM >= 0 ? '+' : ''
                          }${pointAnalysis.relativeReliefM} m`
                        : pointAnalysis.aspectLabel ?? '—'}
                    </p>
                  </div>

                  <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-[#4B5563]">
                      MOLA vs. MOLA+HRSC
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#171717] mt-1">
                      MOLA 463m:{' '}
                      {pointAnalysis.molaGlobalElevationM !== null
                        ? `${pointAnalysis.molaGlobalElevationM} m`
                        : '—'}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#4B5563] mt-0.5">
                      Blend 200m:{' '}
                      {pointAnalysis.molaHrscElevationM !== null
                        ? `${pointAnalysis.molaHrscElevationM} m`
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Steep Slope Alert Banner */}
                {pointAnalysis.isSteepSlope && (
                  <div className="border border-[#B91C1C] bg-[#FEF2F2] p-3 text-xs text-[#171717] flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase text-[#B91C1C] mr-1.5">
                        STEEP SLOPE DETECTED (&gt;=15°):
                      </span>
                      Measured incline ({pointAnalysis.slopeDeg?.toFixed(1)}°,{' '}
                      {pointAnalysis.aspectLabel}) exceeds unassisted suited EVA mobility limits.
                    </div>
                  </div>
                )}

                {/* Nearby Mapped Craters, Dune Fields & Mineral Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="border border-[#D9DDE2] p-3">
                    <p className="font-bold uppercase tracking-wider text-[#171717] mb-2">
                      Crater &amp; Nomenclature Awareness (USGS / IAU)
                    </p>
                    {pointAnalysis.nearbyFeatures.length > 0 ? (
                      <ul className="space-y-1.5 text-[#374151]">
                        {pointAnalysis.nearbyFeatures.slice(0, 5).map((feat) => (
                          <li
                            key={`${feat.name}-${feat.lat}`}
                            className="flex items-center justify-between gap-2 border-b border-[#F3F4F6] pb-1 last:border-b-0"
                          >
                            <span>
                              <strong className="text-[#171717]">{feat.name}</strong> ({feat.type}
                              {feat.diameterKm ? `, Ø ${feat.diameterKm} km` : ''})
                            </span>
                            <span className="font-mono text-[#0057B8] shrink-0">
                              {feat.distanceKm} km
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[#4B5563]">
                        No named IAU/USGS craters or valleys indexed within ±0.55° search box.
                      </p>
                    )}
                  </div>

                  <div className="border border-[#D9DDE2] p-3">
                    <p className="font-bold uppercase tracking-wider text-[#171717] mb-2">
                      Mapped Obstacles &amp; Mineral Indicators
                    </p>
                    {pointAnalysis.nearbyDuneFields.length === 0 &&
                    pointAnalysis.nearbyMineralDetections.length === 0 ? (
                      <p className="text-[#4B5563]">
                        No USGS Dune Fields or OMEGA hydrous mineral points indexed within ±0.55°
                        search box. Check CTX/HiRISE imagery for uncataloged micro-ripples.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 text-[#374151]">
                        {pointAnalysis.nearbyDuneFields.map((dune) => (
                          <li key={dune.duneId} className="text-[#B45309]">
                            <strong className="uppercase text-[#F47721]">Dune Hazard:</strong> ID{' '}
                            {dune.duneId} ({dune.duneType}
                            {dune.areaKm2 ? `, ${dune.areaKm2} km²` : ''})
                          </li>
                        ))}
                        {pointAnalysis.nearbyMineralDetections.slice(0, 3).map((min, i) => (
                          <li key={`${min.instrument}-${i}`}>
                            <strong className="text-[#0057B8]">{min.instrument}:</strong>{' '}
                            {min.type} at {formatMarsCoords(min.lat, min.lng, 2)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Source & Coverage Limitation Note */}
                <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3 text-[11px] text-[#374151]">
                  <strong className="text-[#171717]">Source &amp; Coverage Limit:</strong>{' '}
                  {pointAnalysis.primaryDemName} ({pointAnalysis.primaryDemInstrument},{' '}
                  {pointAnalysis.primaryDemResolution}). {pointAnalysis.limitationNote}
                </div>
              </div>
            ) : null}
          </section>

          {/* Terrain Profile Along Active Mission Route */}
          {activeMission.waypoints.length >= 2 && (
            <TerrainProfileChart
              profileResponse={routeProfile}
              metrics={profileMetrics}
              loading={routeProfileLoading}
              onRetry={fetchRouteProfile}
              title={`Active Mission Route Profile: ${activeMission.name}`}
            />
          )}

          {/* Live NASA Mars Trek Regional Catalog Query */}
          <section className="border border-[#D9DDE2] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#D9DDE2]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8]">
                  NASA Mars Trek Live Catalog Query
                </p>
                <h2 className="text-base font-bold text-[#171717]">
                  Indexed Orbital Products for {selectedRegion.name}
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#4B5563]">
                {trekStatus === 'ready'
                  ? `${trekTotalFound} matching products indexed`
                  : trekStatus === 'loading'
                  ? 'Querying trek.nasa.gov...'
                  : 'Trek index unavailable'}
              </span>
            </div>

            {trekStatus === 'loading' && (
              <div className="flex items-center gap-2 text-xs text-[#4B5563] py-4">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0057B8]" aria-hidden="true" />
                <span>Retrieving NASA Mars Trek product metadata...</span>
              </div>
            )}

            {trekStatus === 'error' && (
              <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-4 text-xs text-[#374151]">
                <span className="font-bold text-[#F47721] uppercase mr-2">
                  CATALOG UNAVAILABLE:
                </span>
                Could not reach NASA Mars Trek search service. Browse products directly at{' '}
                <a
                  href="https://trek.nasa.gov/mars/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0057B8] underline font-semibold"
                >
                  https://trek.nasa.gov/mars/
                </a>
                .
              </div>
            )}

            {trekStatus === 'ready' && trekItems.length === 0 && (
              <p className="text-xs text-[#4B5563] py-2">
                No regional catalog items matched this query. Inspect global mosaics in the layer
                selector or browse{' '}
                <a
                  href="https://trek.nasa.gov/mars/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0057B8] underline"
                >
                  NASA Mars Trek
                </a>
                .
              </p>
            )}

            {trekStatus === 'ready' && trekItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trekItems.map((item) => (
                  <div key={item.id} className="border border-[#D9DDE2] p-3 text-xs">
                    <p className="font-bold text-[#171717] mb-1">{item.title}</p>
                    <p className="text-[#4B5563]">
                      {item.mission} · {item.instrument}
                    </p>
                    <p className="text-[#4B5563] font-mono mt-1">
                      {item.productType} · {item.resolution}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

