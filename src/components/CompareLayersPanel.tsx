import L from 'leaflet';
import { ArrowLeftRight, Compass } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MARS_MAP_LAYERS } from '../data/marsLayers';
import type {
  ComparisonPresetId,
  MarsLayerCategory,
  MarsMapLayer,
  MarsRegion,
  Waypoint,
} from '../types/mars';
import { formatMarsCoords, normalizeLongitude180 } from '../utils/marsGeo';
import { COMPARISON_PRESETS, getLayerComparisonInsight } from '../utils/missionIntelligence';

interface CompareLayersPanelProps {
  selectedRegion: MarsRegion;
  waypoints: Waypoint[];
  onInspectCoordinate?: (lat: number, lng: number) => void;
}

function buildLeafletLayer(cfg: MarsMapLayer): L.TileLayer {
  if (cfg.serviceType === 'wms' && cfg.wmsLayers) {
    return L.tileLayer.wms(cfg.url, {
      layers: cfg.wmsLayers,
      format: 'image/jpeg',
      transparent: false,
      version: '1.1.1',
      attribution: cfg.attribution,
      maxNativeZoom: cfg.maxNativeZoom,
      maxZoom: 13,
      noWrap: true,
    });
  }

  return L.tileLayer(cfg.url, {
    attribution: cfg.attribution,
    maxNativeZoom: cfg.maxNativeZoom,
    maxZoom: 13,
    zoomOffset: cfg.zoomOffset ?? 0,
    tileSize: cfg.tileSize ?? 256,
    noWrap: true,
    bounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
  });
}

export function CompareLayersPanel({
  selectedRegion,
  waypoints,
  onInspectCoordinate,
}: CompareLayersPanelProps) {
  const [activePreset, setActivePreset] = useState<ComparisonPresetId | 'custom'>(
    'elevation-vs-thermal'
  );
  const [leftLayerId, setLeftLayerId] = useState<MarsLayerCategory>('terrain');
  const [rightLayerId, setRightLayerId] = useState<MarsLayerCategory>('thermal_night');
  const [syncCoords, setSyncCoords] = useState<{ lat: number; lng: number }>({
    lat: selectedRegion.lat,
    lng: selectedRegion.lng,
  });
  const [syncZoom, setSyncZoom] = useState<number>(selectedRegion.zoom);

  const leftContainerRef = useRef<HTMLDivElement | null>(null);
  const rightContainerRef = useRef<HTMLDivElement | null>(null);
  const leftMapRef = useRef<L.Map | null>(null);
  const rightMapRef = useRef<L.Map | null>(null);
  const leftTileRef = useRef<L.TileLayer | null>(null);
  const rightTileRef = useRef<L.TileLayer | null>(null);
  const leftOverlayRef = useRef<L.LayerGroup | null>(null);
  const rightOverlayRef = useRef<L.LayerGroup | null>(null);
  const isSyncingRef = useRef(false);
  const onInspectRef = useRef(onInspectCoordinate);
  onInspectRef.current = onInspectCoordinate;

  const leftLayer = MARS_MAP_LAYERS.find((l) => l.id === leftLayerId) ?? MARS_MAP_LAYERS[0];
  const rightLayer = MARS_MAP_LAYERS.find((l) => l.id === rightLayerId) ?? MARS_MAP_LAYERS[2];
  const insight = getLayerComparisonInsight(leftLayerId, rightLayerId);

  // Initialize synchronized dual Leaflet maps
  useEffect(() => {
    const lc = leftContainerRef.current;
    const rc = rightContainerRef.current;
    if (!lc || !rc || leftMapRef.current || rightMapRef.current) return;

    const bounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));
    const mapOpts: L.MapOptions = {
      crs: L.CRS.EPSG4326,
      center: [selectedRegion.lat, selectedRegion.lng],
      zoom: selectedRegion.zoom,
      minZoom: 1,
      maxZoom: 13,
      maxBounds: bounds,
      maxBoundsViscosity: 0.9,
      worldCopyJump: false,
      zoomControl: true,
    };

    const leftMap = L.map(lc, mapOpts);
    const rightMap = L.map(rc, mapOpts);

    const leftOv = L.layerGroup().addTo(leftMap);
    const rightOv = L.layerGroup().addTo(rightMap);

    const syncFromTo = (src: L.Map, dst: L.Map) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const center = src.getCenter();
      const zoom = src.getZoom();
      dst.setView(center, zoom, { animate: false });
      setSyncCoords({
        lat: Number(center.lat.toFixed(4)),
        lng: Number(normalizeLongitude180(center.lng).toFixed(4)),
      });
      setSyncZoom(zoom);
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    leftMap.on('move', () => syncFromTo(leftMap, rightMap));
    rightMap.on('move', () => syncFromTo(rightMap, leftMap));

    const handlePointerMove = (e: L.LeafletMouseEvent) => {
      setSyncCoords({
        lat: Number(e.latlng.lat.toFixed(4)),
        lng: Number(normalizeLongitude180(e.latlng.lng).toFixed(4)),
      });
    };
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const lat = Number(Math.max(-89.9, Math.min(89.9, e.latlng.lat)).toFixed(4));
      const lng = Number(normalizeLongitude180(e.latlng.lng).toFixed(4));
      setSyncCoords({ lat, lng });
      if (onInspectRef.current) onInspectRef.current(lat, lng);
    };

    leftMap.on('mousemove', handlePointerMove);
    rightMap.on('mousemove', handlePointerMove);
    leftMap.on('click', handleMapClick);
    rightMap.on('click', handleMapClick);

    leftMapRef.current = leftMap;
    rightMapRef.current = rightMap;
    leftOverlayRef.current = leftOv;
    rightOverlayRef.current = rightOv;

    return () => {
      leftMap.remove();
      rightMap.remove();
      leftMapRef.current = null;
      rightMapRef.current = null;
      leftTileRef.current = null;
      rightTileRef.current = null;
      leftOverlayRef.current = null;
      rightOverlayRef.current = null;
    };
  }, []);

  // Re-center both maps when selectedRegion changes
  useEffect(() => {
    const lm = leftMapRef.current;
    const rm = rightMapRef.current;
    if (!lm || !rm) return;
    isSyncingRef.current = true;
    lm.setView([selectedRegion.lat, selectedRegion.lng], selectedRegion.zoom, { animate: false });
    rm.setView([selectedRegion.lat, selectedRegion.lng], selectedRegion.zoom, { animate: false });
    setSyncCoords({ lat: selectedRegion.lat, lng: selectedRegion.lng });
    setSyncZoom(selectedRegion.zoom);
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, [selectedRegion]);

  // Swap tile layers dynamically
  useEffect(() => {
    const lm = leftMapRef.current;
    if (!lm) return;
    if (leftTileRef.current) {
      lm.removeLayer(leftTileRef.current);
      leftTileRef.current = null;
    }
    const layer = buildLeafletLayer(leftLayer);
    layer.addTo(lm);
    leftTileRef.current = layer;
  }, [leftLayer]);

  useEffect(() => {
    const rm = rightMapRef.current;
    if (!rm) return;
    if (rightTileRef.current) {
      rm.removeLayer(rightTileRef.current);
      rightTileRef.current = null;
    }
    const layer = buildLeafletLayer(rightLayer);
    layer.addTo(rm);
    rightTileRef.current = layer;
  }, [rightLayer]);

  // Draw active mission route & region marker on both synchronized maps
  useEffect(() => {
    [leftOverlayRef.current, rightOverlayRef.current].forEach((group) => {
      if (!group) return;
      group.clearLayers();
      L.circleMarker([selectedRegion.lat, selectedRegion.lng], {
        radius: 6,
        color: '#0057B8',
        weight: 2,
        fillColor: '#F47721',
        fillOpacity: 0.9,
      }).addTo(group);

      if (waypoints.length >= 2) {
        L.polyline(
          waypoints.map((w) => L.latLng(w.lat, w.lng)),
          { color: '#0057B8', weight: 3, dashArray: '6 4' }
        ).addTo(group);
      }
      waypoints.forEach((wp, idx) => {
        L.circleMarker([wp.lat, wp.lng], {
          radius: 5,
          color: '#FFFFFF',
          weight: 1.5,
          fillColor: idx === 0 ? '#0057B8' : '#F47721',
          fillOpacity: 1,
        })
          .bindTooltip(`${idx + 1}. ${wp.name}`)
          .addTo(group);
      });
    });
  }, [selectedRegion, waypoints]);

  const handleSelectPreset = (presetId: ComparisonPresetId) => {
    const preset = COMPARISON_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setLeftLayerId(preset.leftLayerId);
    setRightLayerId(preset.rightLayerId);
  };

  return (
    <section
      id="compare-scientific-layers"
      aria-labelledby="compare-layers-heading"
      className="border border-[#D9DDE2] bg-white p-6 space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-[#D9DDE2]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
            Synchronized Dual-Instrument Analysis
          </p>
          <h2 id="compare-layers-heading" className="text-xl font-bold text-[#171717]">
            COMPARE SCIENTIFIC LAYERS
          </h2>
          <p className="text-xs text-[#4B5563] mt-1 max-w-3xl">
            Pan, zoom, or click either map viewport to inspect identical Martian coordinates side by
            side across two NASA/USGS datasets with active mission route overlay.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono bg-[#F3F4F6] border border-[#D9DDE2] px-3 py-2">
          <Compass className="w-4 h-4 text-[#0057B8]" aria-hidden="true" />
          <span className="text-[#4B5563]">Synced Coords:</span>
          <strong className="text-[#171717]" data-testid="synced-compare-coords">
            {formatMarsCoords(syncCoords.lat, syncCoords.lng, 3)}
          </strong>
          <span className="text-[#9CA3AF]">|</span>
          <span className="text-[#0057B8] font-semibold">Zoom {syncZoom}</span>
        </div>
      </div>

      {/* Preset Comparison Pair Buttons */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Comparison presets">
        {COMPARISON_PRESETS.map((preset) => {
          const isSelected = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              aria-pressed={isSelected}
              className={`px-3 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#0057B8] text-white border-[#0057B8]'
                  : 'bg-white text-[#171717] border-[#D9DDE2] hover:bg-[#F3F4F6]'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Dual Dataset Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-[#D9DDE2] bg-[#F9FAFB] p-3">
          <label
            htmlFor="compare-left-layer"
            className="block text-[11px] font-bold uppercase tracking-wider text-[#0057B8] mb-1"
          >
            Dataset A (Left Viewport)
          </label>
          <select
            id="compare-left-layer"
            value={leftLayerId}
            onChange={(e) => {
              setActivePreset('custom');
              setLeftLayerId(e.target.value as MarsLayerCategory);
            }}
            className="w-full border border-[#D9DDE2] bg-white px-3 py-2 text-xs font-semibold text-[#171717]"
          >
            {MARS_MAP_LAYERS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}. {l.name} ({l.resolution})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#4B5563] mt-1.5">
            {leftLayer.missionSource} · {leftLayer.availabilityStatus}
          </p>
        </div>

        <div className="border border-[#D9DDE2] bg-[#F9FAFB] p-3">
          <label
            htmlFor="compare-right-layer"
            className="block text-[11px] font-bold uppercase tracking-wider text-[#0057B8] mb-1"
          >
            Dataset B (Right Viewport)
          </label>
          <select
            id="compare-right-layer"
            value={rightLayerId}
            onChange={(e) => {
              setActivePreset('custom');
              setRightLayerId(e.target.value as MarsLayerCategory);
            }}
            className="w-full border border-[#D9DDE2] bg-white px-3 py-2 text-xs font-semibold text-[#171717]"
          >
            {MARS_MAP_LAYERS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}. {l.name} ({l.resolution})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#4B5563] mt-1.5">
            {rightLayer.missionSource} · {rightLayer.availabilityStatus}
          </p>
        </div>
      </div>

      {/* Dual Synchronized Leaflet Viewports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-[#D9DDE2]">
          <div className="px-3 py-1.5 bg-[#F3F4F6] border-b border-[#D9DDE2] flex items-center justify-between text-xs">
            <span className="font-bold text-[#171717]">{leftLayer.shortLabel}</span>
            <span className="font-mono text-[#4B5563]">{leftLayer.resolution}</span>
          </div>
          <div ref={leftContainerRef} className="w-full h-[340px]" data-testid="compare-map-left" />
        </div>

        <div className="border border-[#D9DDE2]">
          <div className="px-3 py-1.5 bg-[#F3F4F6] border-b border-[#D9DDE2] flex items-center justify-between text-xs">
            <span className="font-bold text-[#171717]">{rightLayer.shortLabel}</span>
            <span className="font-mono text-[#4B5563]">{rightLayer.resolution}</span>
          </div>
          <div
            ref={rightContainerRef}
            className="w-full h-[340px]"
            data-testid="compare-map-right"
          />
        </div>
      </div>

      {/* Scientific Interpretation Box */}
      <div className="border border-[#0057B8] bg-[#F3F4F6] p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#0057B8]">
          <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
          <span>What This Comparison Reveals: {insight.headline}</span>
        </div>
        <p className="text-[#171717] leading-relaxed">{insight.scientificRevelation}</p>
        <p className="text-[#374151] pt-1 border-t border-[#D9DDE2]">
          <strong className="text-[#0057B8]">Astronaut Traverse Application: </strong>
          {insight.operationalCheck}
        </p>
      </div>
    </section>
  );
}
