import L from 'leaflet';
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MarsMapLayer, MarsRegion, ScientificTarget, Waypoint } from '../types/mars';
import { formatMarsCoords, normalizeLongitude180 } from '../utils/marsGeo';

interface MarsMapProps {
  layer: MarsMapLayer;
  overlayLayer?: MarsMapLayer | null;
  overlayOpacity?: number;
  regions: MarsRegion[];
  selectedRegion: MarsRegion;
  onSelectRegion?: (region: MarsRegion) => void;
  waypoints?: Waypoint[];
  scientificTargets?: ScientificTarget[];
  analysisPin?: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  plannerMode?: boolean;
  clickModeLabel?: string;
  fitRouteKey?: string;
  heightClassName?: string;
}

export function MarsMap({
  layer,
  overlayLayer = null,
  overlayOpacity = 0.65,
  regions,
  selectedRegion,
  onSelectRegion,
  waypoints = [],
  scientificTargets = [],
  analysisPin = null,
  onMapClick,
  plannerMode = false,
  clickModeLabel = 'Click map to add waypoint',
  fitRouteKey,
  heightClassName = 'h-[540px]',
}: MarsMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const regionalGroupRef = useRef<L.LayerGroup | null>(null);
  const overlayLayerRef = useRef<L.TileLayer | null>(null);
  const regionGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);
  const targetGroupRef = useRef<L.LayerGroup | null>(null);
  const analysisPinGroupRef = useRef<L.LayerGroup | null>(null);

  const onMapClickRef = useRef(onMapClick);
  const onSelectRegionRef = useRef(onSelectRegion);
  onMapClickRef.current = onMapClick;
  onSelectRegionRef.current = onSelectRegion;

  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({
    lat: selectedRegion.lat,
    lng: selectedRegion.lng,
  });
  const [zoomLevel, setZoomLevel] = useState<number>(selectedRegion.zoom);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tileStatus, setTileStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Initialize Leaflet Map once using EPSG:4326 (Mars Equirectangular)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;

    const bounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));
    const map = L.map(container, {
      crs: L.CRS.EPSG4326,
      center: [selectedRegion.lat, selectedRegion.lng],
      zoom: selectedRegion.zoom,
      minZoom: 1,
      maxZoom: 13,
      maxBounds: bounds,
      maxBoundsViscosity: 0.9,
      worldCopyJump: false,
      zoomControl: true,
    });

    const regionalGroup = L.layerGroup().addTo(map);
    const regionGroup = L.layerGroup().addTo(map);
    const routeGroup = L.layerGroup().addTo(map);
    const targetGroup = L.layerGroup().addTo(map);
    const analysisPinGroup = L.layerGroup().addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: e.latlng.lat,
        lng: normalizeLongitude180(e.latlng.lng),
      });
    });

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(Math.max(-89.9, Math.min(89.9, e.latlng.lat)).toFixed(4));
      const lng = Number(normalizeLongitude180(e.latlng.lng).toFixed(4));
      setCursorCoords({ lat, lng });
      if (onMapClickRef.current) {
        onMapClickRef.current(lat, lng);
      }
    });

    mapRef.current = map;
    regionalGroupRef.current = regionalGroup;
    regionGroupRef.current = regionGroup;
    routeGroupRef.current = routeGroup;
    targetGroupRef.current = targetGroup;
    analysisPinGroupRef.current = analysisPinGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      regionalGroupRef.current = null;
      overlayLayerRef.current = null;
      regionGroupRef.current = null;
      routeGroupRef.current = null;
      targetGroupRef.current = null;
      analysisPinGroupRef.current = null;
    };
  }, []);

  // Build Leaflet TileLayer from MarsMapLayer descriptor
  const buildTileLayer = (cfg: MarsMapLayer, opacity = 1): L.TileLayer => {
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
        opacity,
      });
    }

    return L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxNativeZoom: cfg.maxNativeZoom,
      maxZoom: 13,
      zoomOffset: cfg.zoomOffset ?? 0,
      tileSize: cfg.tileSize ?? 256,
      noWrap: true,
      opacity,
      bounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
    });
  };

  // Switch Base Layer + Optional Targeted Regional Overlays (e.g., HiRISE Jezero)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }
    if (regionalGroupRef.current) {
      regionalGroupRef.current.clearLayers();
    }

    setTileStatus('loading');
    const nextLayer = buildTileLayer(layer, 1);

    let loadedAny = false;
    nextLayer.on('tileload', () => {
      loadedAny = true;
      setTileStatus('ready');
    });
    nextLayer.on('load', () => {
      if (loadedAny) {
        setTileStatus('ready');
      }
    });
    nextLayer.on('tileerror', () => {
      if (!loadedAny) {
        setTileStatus('error');
      }
    });

    nextLayer.addTo(map);
    baseLayerRef.current = nextLayer;

    if (layer.regionalOverlays && regionalGroupRef.current) {
      layer.regionalOverlays.forEach((ov) => {
        const bounds = L.latLngBounds(L.latLng(ov.bounds[0][0], ov.bounds[0][1]), L.latLng(ov.bounds[1][0], ov.bounds[1][1]));
        L.tileLayer(ov.url, {
          maxNativeZoom: ov.maxNativeZoom,
          maxZoom: 13,
          noWrap: true,
          bounds,
        }).addTo(regionalGroupRef.current!);
        L.rectangle(bounds, {
          color: '#0057B8',
          weight: 1.5,
          fill: false,
          dashArray: '4 4',
          interactive: false,
        }).addTo(regionalGroupRef.current!);
      });
    }
  }, [layer]);

  // Switch Optional Overlay Layer (e.g., Geology SIM 3292 over MOLA)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    if (overlayLayer) {
      const nextOverlay = buildTileLayer(overlayLayer, overlayOpacity);
      nextOverlay.addTo(map);
      overlayLayerRef.current = nextOverlay;
    }
  }, [overlayLayer, overlayOpacity]);

  // Pan/Zoom to selected region or route bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (plannerMode && waypoints.length >= 2) {
      const bounds = L.latLngBounds(waypoints.map((w) => L.latLng(w.lat, w.lng)));
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 11, animate: false });
      setZoomLevel(map.getZoom());
      setCursorCoords({ lat: bounds.getCenter().lat, lng: bounds.getCenter().lng });
      return;
    }

    map.setView([selectedRegion.lat, selectedRegion.lng], selectedRegion.zoom, {
      animate: true,
    });
    setCursorCoords({ lat: selectedRegion.lat, lng: selectedRegion.lng });
  }, [selectedRegion, plannerMode, fitRouteKey]);

  // Render Region Landmarks
  useEffect(() => {
    const group = regionGroupRef.current;
    if (!group) return;
    group.clearLayers();

    regions.forEach((region) => {
      const isSelected = region.id === selectedRegion.id;
      const marker = L.circleMarker([region.lat, region.lng], {
        radius: isSelected ? 7 : 5,
        color: isSelected ? '#0057B8' : '#171717',
        weight: 2,
        fillColor: isSelected ? '#F47721' : '#FFFFFF',
        fillOpacity: 0.95,
        interactive: !plannerMode,
      });

      if (!plannerMode) {
        marker.bindTooltip(`${region.name} (${formatMarsCoords(region.lat, region.lng)})`, {
          direction: 'top',
          offset: [0, -6],
        });

        marker.on('click', () => {
          if (onSelectRegionRef.current) {
            onSelectRegionRef.current(region);
          }
        });
      }

      marker.addTo(group);
    });
  }, [regions, selectedRegion, plannerMode]);

  // Render Mission Route & Waypoints
  useEffect(() => {
    const group = routeGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (waypoints.length === 0) return;

    const latLngs = waypoints.map((wp) => L.latLng(wp.lat, wp.lng));
    if (latLngs.length >= 2) {
      L.polyline(latLngs, {
        color: '#0057B8',
        weight: 3,
        dashArray: '6 4',
      }).addTo(group);
    }

    waypoints.forEach((wp, index) => {
      const isStart = index === 0;
      const isEnd = index === waypoints.length - 1 && waypoints.length > 1;
      const bg = isStart ? '#0057B8' : isEnd ? '#F47721' : '#171717';

      const icon = L.divIcon({
        className: 'marscope-wp-icon',
        html: `<div style="width:22px;height:22px;background:${bg};color:#ffffff;border:2px solid #ffffff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.35);">${
          index + 1
        }</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([wp.lat, wp.lng], { icon })
        .bindTooltip(`WP ${index + 1}: ${wp.name} (${formatMarsCoords(wp.lat, wp.lng)})`, {
          direction: 'top',
        })
        .addTo(group);
    });
  }, [waypoints]);

  // Render Scientific Exploration Targets
  useEffect(() => {
    const group = targetGroupRef.current;
    if (!group) return;
    group.clearLayers();

    scientificTargets.forEach((tgt, idx) => {
      const icon = L.divIcon({
        className: 'marscope-target-icon',
        html: `<div style="width:22px;height:22px;background:#ffffff;color:#0057B8;border:2px solid #0057B8;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);">T${
          idx + 1
        }</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([tgt.lat, tgt.lng], { icon })
        .bindTooltip(
          `Target T${idx + 1}: ${tgt.name} (${tgt.category} · ${formatMarsCoords(
            tgt.lat,
            tgt.lng
          )})`,
          { direction: 'top' }
        )
        .addTo(group);
    });
  }, [scientificTargets]);

  // Render Point Terrain Analysis Pin (Mars Explorer coordinate query)
  useEffect(() => {
    const group = analysisPinGroupRef.current;
    if (!group) return;
    group.clearLayers();
    if (!analysisPin) return;

    L.circleMarker([analysisPin.lat, analysisPin.lng], {
      radius: 9,
      color: '#0057B8',
      weight: 2.5,
      fillColor: '#FFFFFF',
      fillOpacity: 0.35,
      interactive: false,
    }).addTo(group);

    L.circleMarker([analysisPin.lat, analysisPin.lng], {
      radius: 3,
      color: '#0057B8',
      weight: 2,
      fillColor: '#0057B8',
      fillOpacity: 1,
      interactive: false,
    }).addTo(group);
  }, [analysisPin]);

  // Handle Fullscreen (CSS fallback for iframe sandboxes + native Fullscreen API)
  const toggleFullscreen = async () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    if (!isFullscreen) {
      try {
        if (wrapper.requestFullscreen) {
          await wrapper.requestFullscreen();
        }
      } catch {
        // Fallback to CSS fixed fullscreen inside sandboxed iframe
      }
      setIsFullscreen(true);
    } else {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch {
        // Ignore
      }
      setIsFullscreen(false);
    }

    setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 150);
  };

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
        setTimeout(() => mapRef.current?.invalidateSize(), 120);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isFullscreen]);

  const handleResetView = () => {
    const map = mapRef.current;
    if (!map) return;
    if (plannerMode && waypoints.length >= 2) {
      const bounds = L.latLngBounds(waypoints.map((w) => L.latLng(w.lat, w.lng)));
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 11 });
      setZoomLevel(map.getZoom());
      setCursorCoords({ lat: bounds.getCenter().lat, lng: bounds.getCenter().lng });
      return;
    }
    map.setView([selectedRegion.lat, selectedRegion.lng], selectedRegion.zoom);
    setZoomLevel(selectedRegion.zoom);
    setCursorCoords({ lat: selectedRegion.lat, lng: selectedRegion.lng });
  };

  return (
    <div
      ref={wrapperRef}
      data-testid="mars-map-wrapper"
      className={
        isFullscreen
          ? 'fixed inset-0 z-[1500] bg-white flex flex-col'
          : 'relative border border-[#D9DDE2] bg-white flex flex-col'
      }
    >
      {/* Map Top Utility Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 py-2 bg-[#F3F4F6] border-b border-[#D9DDE2] text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-[#0057B8] uppercase tracking-wider whitespace-nowrap">
            {layer.shortLabel}
          </span>
          <span aria-hidden="true" className="text-[#9CA3AF]">
            ·
          </span>
          <span className="text-[#374151] truncate">
            {layer.resolution}
          </span>
          {plannerMode ? (
            <span className="hidden xl:inline font-semibold text-[#F47721] whitespace-nowrap ml-2">
              {clickModeLabel}
            </span>
          ) : onMapClick ? (
            <span className="hidden xl:inline font-semibold text-[#0057B8] whitespace-nowrap ml-2">
              Click map to inspect DEM elevation & slope
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono tabular-nums text-[#374151] px-2 py-1 bg-white border border-[#D9DDE2] whitespace-nowrap">
            Zoom {zoomLevel}
          </span>
          <button
            type="button"
            onClick={handleResetView}
            aria-label="Reset map view to selected region"
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#D9DDE2] text-[#171717] hover:bg-[#E5E7EB] whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen map' : 'Open fullscreen map'}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#D9DDE2] text-[#171717] hover:bg-[#E5E7EB] whitespace-nowrap cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Exit</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Leaflet Viewport */}
      <div className="relative flex-1">
        <div
          ref={mapContainerRef}
          data-testid="leaflet-mars-map"
          className={`w-full ${isFullscreen ? 'h-[calc(100vh-88px)]' : heightClassName} ${
            plannerMode ? 'cursor-crosshair' : ''
          }`}
        />

        {/* Tile Service Fallback / Loading Notice */}
        {tileStatus === 'error' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-white border border-[#F47721] px-4 py-2 text-xs text-[#171717] shadow-sm">
            <span className="font-semibold text-[#F47721] mr-2">TILE SERVICE NOTICE:</span>
            External NASA/USGS tile server did not respond for current view.{' '}
            <a
              href={layer.officialSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#0057B8] underline font-semibold"
            >
              Open {layer.officialSourceLabel}
            </a>
          </div>
        )}

        {/* Coordinate Readout HUD */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 border border-[#D9DDE2] px-3 py-1.5 text-xs">
          <span className="text-[#4B5563] mr-2">Martian Coordinates:</span>
          <span className="font-mono tabular-nums font-semibold text-[#171717]">
            {formatMarsCoords(cursorCoords.lat, cursorCoords.lng)}
          </span>
        </div>
      </div>
    </div>
  );
}
