import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  checkGeminiStatus,
  GeminiServiceError,
  runAiChat,
  runGeologicalInterpreter,
  runMissionAdvisor,
  runTerrainIntelligence,
} from './src/server/geminiService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface InSightSolRaw {
  AT?: { av?: number; mn?: number; mx?: number; ct?: number };
  PRE?: { av?: number; mn?: number; mx?: number; ct?: number };
  HWS?: { av?: number; mn?: number; mx?: number; ct?: number };
  First_UTC?: string;
  Last_UTC?: string;
  Season?: string;
  Northern_season?: string;
  Southern_season?: string;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Server-side TTL cache for external NASA/USGS responses
  const apiCache = new Map<string, { expiresAt: number; payload: unknown }>();
  function readCache<T>(key: string): T | null {
    const entry = apiCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      apiCache.delete(key);
      return null;
    }
    return entry.payload as T;
  }
  function writeCache(key: string, payload: unknown, ttlMs: number): void {
    if (apiCache.size > 200) {
      const oldestKey = apiCache.keys().next().value;
      if (oldestKey) apiCache.delete(oldestKey);
    }
    apiCache.set(key, { expiresAt: Date.now() + ttlMs, payload });
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'marscope-backend' });
  });

  // Server-side proxy for NASA InSight Mars Weather API (historical Elysium Planitia archive)
  app.get('/api/nasa/insight', async (req, res) => {
    const forceRefresh = req.query.refresh === '1';
    const cacheKey = 'insight_weather';
    if (!forceRefresh) {
      const cached = readCache<Record<string, unknown>>(cacheKey);
      if (cached) {
        res.json({ ...cached, cached: true });
        return;
      }
    }
    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    const url = `https://api.nasa.gov/insight_weather/?api_key=${encodeURIComponent(
      apiKey
    )}&feedtype=json&ver=1.0`;

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        res.status(200).json({
          status: 'DATA NOT CONNECTED',
          source: 'NASA InSight Mars Weather Service (api.nasa.gov)',
          error: `Upstream NASA API returned HTTP ${response.status}`,
          sols: [],
        });
        return;
      }

      const raw = (await response.json()) as Record<string, unknown>;
      const solKeys = Array.isArray(raw.sol_keys) ? (raw.sol_keys as string[]) : [];

      const sols = solKeys
        .map((sol) => {
          const entry = raw[sol] as InSightSolRaw | undefined;
          if (!entry) return null;
          return {
            sol,
            firstUtc: entry.First_UTC ?? null,
            lastUtc: entry.Last_UTC ?? null,
            season: entry.Season ?? entry.Northern_season ?? null,
            tempAvgC: typeof entry.AT?.av === 'number' ? Number(entry.AT.av.toFixed(1)) : null,
            tempMinC: typeof entry.AT?.mn === 'number' ? Number(entry.AT.mn.toFixed(1)) : null,
            tempMaxC: typeof entry.AT?.mx === 'number' ? Number(entry.AT.mx.toFixed(1)) : null,
            pressureAvgPa:
              typeof entry.PRE?.av === 'number' ? Number(entry.PRE.av.toFixed(1)) : null,
            windAvgMs: typeof entry.HWS?.av === 'number' ? Number(entry.HWS.av.toFixed(2)) : null,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const payload = {
        status: sols.length > 0 ? 'HISTORICAL DATA' : 'DATA NOT CONNECTED',
        source: 'NASA InSight Lander — Elysium Planitia (4.5° N, 135.6° E)',
        sourceUrl: 'https://api.nasa.gov/',
        note: 'InSight mission concluded December 2022. Returned records represent archived historical sols from October 2020.',
        sols,
        retrievedAt: new Date().toISOString(),
        cached: false,
      };
      if (sols.length > 0) {
        writeCache(cacheKey, payload, 5 * 60 * 1000);
      }
      res.json(payload);
    } catch (error) {
      res.status(200).json({
        status: 'DATA NOT CONNECTED',
        source: 'NASA InSight Mars Weather Service (api.nasa.gov)',
        error: error instanceof Error ? error.message : 'Unable to reach NASA API',
        sols: [],
      });
    }
  });

  // Server-side proxy for NASA Mars Trek Solar System Treks catalog search
  app.get('/api/nasa/trek/search', async (req, res) => {
    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const firstWord = rawQ.split(/\s+/)[0] || '';
    const rows = Math.min(Number(req.query.rows) || 24, 40);
    const cacheKey = `trek_search:${firstWord.toLowerCase()}:${rows}`;
    if (req.query.refresh !== '1') {
      const cached = readCache<Record<string, unknown>>(cacheKey);
      if (cached) {
        res.json({ ...cached, cached: true });
        return;
      }
    }

    const params = new URLSearchParams({
      rows: String(rows),
      wt: 'json',
    });
    if (firstWord && firstWord !== '*:*') {
      params.set('key', firstWord);
    }

    const trekUrl = `https://trek.nasa.gov/mars/TrekServices/ws/index/eq/searchItems?${params.toString()}`;

    try {
      const response = await fetch(trekUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        res.status(200).json({
          status: 'UNAVAILABLE',
          error: `NASA Mars Trek returned HTTP ${response.status}`,
          items: [],
        });
        return;
      }

      const data = (await response.json()) as {
        response?: {
          numFound?: number;
          docs?: Array<{
            itemType?: string;
            productLabel?: string;
            title?: string;
            mission?: string;
            instrument?: string;
            productType?: string;
            productCat1?: string;
            resolution?: number | string;
            bbox?: string;
            description?: string;
          }>;
        };
      };

      const docs = (data.response?.docs ?? []).filter((doc) => doc.itemType === 'product');
      const items = docs.slice(0, 8).map((doc) => ({
        id: doc.productLabel ?? doc.title ?? 'unknown',
        title: doc.title ?? doc.productLabel ?? 'Untitled NASA Trek Product',
        mission: doc.mission ?? 'NASA Mars Reconnaissance / Orbital Program',
        instrument: doc.instrument ?? 'Orbital Science Instrument',
        productType: doc.productType ?? doc.productCat1 ?? 'Geospatial Product',
        resolution:
          typeof doc.resolution === 'number'
            ? `${doc.resolution.toFixed(2)} m/px`
            : doc.resolution ?? 'Regional / Global',
        bbox: doc.bbox ?? null,
        description: doc.description ?? null,
      }));

      const payload = {
        status: 'AVAILABLE',
        totalFound: docs.length,
        items,
        retrievedAt: new Date().toISOString(),
        cached: false,
      };
      writeCache(cacheKey, payload, 10 * 60 * 1000);
      res.json(payload);
    } catch (error) {
      res.status(200).json({
        status: 'UNAVAILABLE',
        error: error instanceof Error ? error.message : 'Unable to query NASA Mars Trek',
        items: [],
      });
    }
  });

  // Helper utilities for live NASA Mars Trek DEM & Feature MapServer queries
  const TREK_ARCGIS_BASE = 'https://trek.nasa.gov/mars/trekarcgis/rest/services';
  const GALE_DEM_EXTENT = {
    xmin: 137.1225,
    xmax: 137.7298,
    ymin: -4.9255,
    ymax: -4.249,
  };

  const isInsideGaleDem = (lat: number, lng: number) =>
    lat >= GALE_DEM_EXTENT.ymin &&
    lat <= GALE_DEM_EXTENT.ymax &&
    lng >= GALE_DEM_EXTENT.xmin &&
    lng <= GALE_DEM_EXTENT.xmax;

  async function queryTrekDemSamples(
    serviceName: string,
    coords: Array<{ lat: number; lng: number }>
  ): Promise<Array<number | null>> {
    if (coords.length === 0) return [];
    const result: Array<number | null> = new Array(coords.length).fill(null);
    const CHUNK_SIZE = 20;

    for (let offset = 0; offset < coords.length; offset += CHUNK_SIZE) {
      const slice = coords.slice(offset, offset + CHUNK_SIZE);
      const geometry = JSON.stringify({
        points: slice.map((c) => [Number(c.lng.toFixed(5)), Number(c.lat.toFixed(5))]),
        spatialReference: { wkid: 104905 },
      });
      const params = new URLSearchParams({
        geometry,
        geometryType: 'esriGeometryMultipoint',
        returnFirstValueOnly: 'true',
        f: 'json',
      });

      const url = `${TREK_ARCGIS_BASE}/${serviceName}/ImageServer/getSamples?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(9000),
      });

      if (!response.ok) {
        throw new Error(`NASA Trek ${serviceName} HTTP ${response.status}`);
      }

      const json = (await response.json()) as {
        samples?: Array<{ locationId?: number; value?: string | number }>;
        error?: { message?: string };
      };
      if (json.error) {
        throw new Error(json.error.message || `NASA Trek ${serviceName} query error`);
      }

      for (const s of json.samples ?? []) {
        const localIdx = typeof s.locationId === 'number' ? s.locationId : -1;
        const globalIdx = offset + localIdx;
        if (localIdx >= 0 && localIdx < slice.length && globalIdx < coords.length) {
          const parsed = typeof s.value === 'number' ? s.value : Number(s.value);
          result[globalIdx] = Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
        }
      }
    }

    return result;
  }

  async function queryTrekMapFeatures(
    bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number },
    refLat: number,
    refLng: number
  ) {
    const geomStr = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
    const common = `geometry=${encodeURIComponent(
      geomStr
    )}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;

    const [nomRes, duneRes, minRes] = await Promise.allSettled([
      fetch(`${TREK_ARCGIS_BASE}/combinedNom/MapServer/0/query?${common}`, {
        signal: AbortSignal.timeout(7000),
      }).then((r) => r.json()),
      fetch(`${TREK_ARCGIS_BASE}/Dune_Field/MapServer/0/query?${common}`, {
        signal: AbortSignal.timeout(7000),
      }).then((r) => r.json()),
      fetch(
        `${TREK_ARCGIS_BASE}/Hydrous_Mineral_Detections_OMEGA_CRISM_clon0/MapServer/0/query?${common}`,
        { signal: AbortSignal.timeout(7000) }
      ).then((r) => r.json()),
    ]);

    const { calculateMarsDistanceKm, normalizeLongitude180 } = await import(
      './src/utils/marsGeo.js'
    ).catch(() => import('./src/utils/marsGeo'));

    const nearbyFeatures =
      nomRes.status === 'fulfilled' && Array.isArray(nomRes.value?.features)
        ? nomRes.value.features
            .map((f: { attributes?: Record<string, unknown> }) => {
              const a = f.attributes ?? {};
              const lat = Number(a.center_lat);
              const lng = normalizeLongitude180(Number(a.center_lon));
              const dist =
                Number.isFinite(lat) && Number.isFinite(lng)
                  ? Number(calculateMarsDistanceKm(refLat, refLng, lat, lng).toFixed(2))
                  : 0;
              return {
                name: String(a.clean_name || a.name || 'Unnamed Feature'),
                type: String(a.type || 'Planetary Feature'),
                diameterKm:
                  typeof a.diameter === 'number' && Number.isFinite(a.diameter)
                    ? Number(a.diameter.toFixed(2))
                    : null,
                distanceKm: dist,
                lat: Number.isFinite(lat) ? lat : refLat,
                lng: Number.isFinite(lng) ? lng : refLng,
                link: typeof a.link === 'string' ? a.link : undefined,
              };
            })
            .sort((x: { distanceKm: number }, y: { distanceKm: number }) => x.distanceKm - y.distanceKm)
            .slice(0, 8)
        : [];

    const nearbyDuneFields =
      duneRes.status === 'fulfilled' && Array.isArray(duneRes.value?.features)
        ? duneRes.value.features.slice(0, 5).map((f: { attributes?: Record<string, unknown> }) => {
            const a = f.attributes ?? {};
            return {
              duneId: String(a.Dune_ID || a.FID || 'Unknown'),
              duneType: String(a.Dune_Type || 'Sand Dune Field'),
              avgElevationM:
                typeof a.Avg_El === 'number' && Number.isFinite(a.Avg_El) ? a.Avg_El : null,
              meanHeightM:
                typeof a.MDHeight === 'number' && Number.isFinite(a.MDHeight) ? a.MDHeight : null,
              areaKm2:
                typeof a.Area_sinu_ === 'number' && Number.isFinite(a.Area_sinu_)
                  ? Number(a.Area_sinu_.toFixed(2))
                  : null,
              comments: typeof a.Comments_1 === 'string' ? a.Comments_1 : undefined,
            };
          })
        : [];

    const nearbyMineralDetections =
      minRes.status === 'fulfilled' && Array.isArray(minRes.value?.features)
        ? minRes.value.features.slice(0, 6).map((f: { attributes?: Record<string, unknown> }) => {
            const a = f.attributes ?? {};
            return {
              type: String(a.Type || 'Hydrous Mineral Detection'),
              instrument: String(a.Instrument || 'OMEGA / CRISM'),
              lat: Number(a.Latitude ?? refLat),
              lng: Number(a.Long_East ?? a.Longitude ?? refLng),
            };
          })
        : [];

    return { nearbyFeatures, nearbyDuneFields, nearbyMineralDetections };
  }

  // Point Terrain & Slope Analysis using live NASA Mars Trek MOLA/HRSC & Gale 1m DEMs
  app.post('/api/nasa/terrain/point', async (req, res) => {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      res.status(400).json({ error: 'Valid Martian coordinates (lat, lng) are required.' });
      return;
    }

    const cacheKey = `terrain_pt:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = readCache<Record<string, unknown>>(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    try {
      const { computeStencilSlopeAndMorphology, metersToMarsDegreeStep } = await import(
        './src/utils/terrainAnalysis.js'
      ).catch(() => import('./src/utils/terrainAnalysis'));

      const useGaleHiRes = isInsideGaleDem(lat, lng);
      const globalStepM = 200; // Matches 200 m/px MOLA+HRSC blend grid spacing
      const hiResStepM = 25; // 25 m baseline over 1 m/px Gale SMG DEM
      const gStep = metersToMarsDegreeStep(lat, globalStepM);
      const hStep = metersToMarsDegreeStep(lat, hiResStepM);

      const globalStencil = [
        { lat, lng },
        { lat: Math.min(89.9, lat + gStep.dLat), lng },
        { lat: Math.max(-89.9, lat - gStep.dLat), lng },
        { lat, lng: lng + gStep.dLng },
        { lat, lng: lng - gStep.dLng },
      ];

      const hiResStencil = [
        { lat, lng },
        { lat: Math.min(89.9, lat + hStep.dLat), lng },
        { lat: Math.max(-89.9, lat - hStep.dLat), lng },
        { lat, lng: lng + hStep.dLng },
        { lat, lng: lng - hStep.dLng },
      ];

      const [molaHrscRes, molaGlobalRes, galeHiRes, featuresRes] = await Promise.allSettled([
        queryTrekDemSamples('Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw', globalStencil),
        queryTrekDemSamples('mola128_mola64_merge_90Nto90S_SimpleC_clon0', [{ lat, lng }]),
        useGaleHiRes
          ? queryTrekDemSamples('Gale_DEM_SMG_1m', hiResStencil)
          : Promise.resolve([null, null, null, null, null]),
        queryTrekMapFeatures(
          {
            minLng: lng - 0.55,
            minLat: lat - 0.55,
            maxLng: lng + 0.55,
            maxLat: lat + 0.55,
          },
          lat,
          lng
        ),
      ]);

      const molaHrscVals =
        molaHrscRes.status === 'fulfilled' ? molaHrscRes.value : [null, null, null, null, null];
      const molaGlobalVal =
        molaGlobalRes.status === 'fulfilled' ? molaGlobalRes.value[0] : null;
      const galeVals =
        galeHiRes.status === 'fulfilled' ? galeHiRes.value : [null, null, null, null, null];

      const hasHiResValid = galeVals[0] !== null;
      const hasGlobalValid = molaHrscVals[0] !== null;

      const activeStencil = hasHiResValid
        ? {
            center: galeVals[0],
            north: galeVals[1],
            south: galeVals[2],
            east: galeVals[3],
            west: galeVals[4],
            stepMeters: hiResStepM,
            highResScale: true,
          }
        : {
            center: molaHrscVals[0],
            north: molaHrscVals[1],
            south: molaHrscVals[2],
            east: molaHrscVals[3],
            west: molaHrscVals[4],
            stepMeters: globalStepM,
            highResScale: false,
          };

      const morph = computeStencilSlopeAndMorphology(activeStencil);
      const features =
        featuresRes.status === 'fulfilled'
          ? featuresRes.value
          : { nearbyFeatures: [], nearbyDuneFields: [], nearbyMineralDetections: [] };

      const dataAvailability = hasHiResValid
        ? 'HIGH-RES REGIONAL DEM'
        : hasGlobalValid
        ? 'GLOBAL MOLA+HRSC DEM'
        : 'UNAVAILABLE';

      const payload = {
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
        primaryElevationM: hasHiResValid ? galeVals[0] : molaHrscVals[0] ?? molaGlobalVal,
        primaryDemName: hasHiResValid
          ? 'Gale Crater High-Res Blended DEM (HRSC/CTX/HiRISE)'
          : 'MGS MOLA & Mars Express HRSC Global Blended DEM',
        primaryDemInstrument: hasHiResValid
          ? 'MRO HiRISE + CTX + Mars Express HRSC'
          : 'Mars Global Surveyor MOLA + Mars Express HRSC',
        primaryDemResolution: hasHiResValid ? '1 m/pixel (25 m slope stencil)' : '200 m/pixel',
        primaryDemSourceUrl: 'https://trek.nasa.gov/mars/',
        molaGlobalElevationM: molaGlobalVal,
        molaHrscElevationM: molaHrscVals[0],
        regionalHiResElevationM: galeVals[0],
        regionalHiResDemName: useGaleHiRes ? 'Gale_DEM_SMG_1m (NASA Mars Trek)' : undefined,
        regionalHiResResolution: useGaleHiRes ? '1 m/pixel' : undefined,
        slopeDeg: morph.slopeDeg,
        slopePercent: morph.slopePercent,
        aspectLabel: morph.aspectLabel,
        slopeCategory: morph.slopeCategory,
        isSteepSlope: morph.isSteepSlope,
        morphologyLabel: morph.morphologyLabel,
        relativeReliefM: morph.relativeReliefM,
        nearbyFeatures: features.nearbyFeatures,
        nearbyDuneFields: features.nearbyDuneFields,
        nearbyMineralDetections: features.nearbyMineralDetections,
        dataAvailability,
        limitationNote: hasHiResValid
          ? 'Sampled on NASA Trek 1 m/px Gale Crater SMG DEM using a 25 m finite-difference stencil; sub-meter boulders and overhangs still require visual HiRISE inspection.'
          : hasGlobalValid
          ? 'Sampled on NASA Trek 200 m/px global MOLA+HRSC DEM; meter-scale boulders, narrow gullies, and local scarps (<200 m) cannot be resolved without targeted HiRISE stereo DTMs.'
          : 'NASA Mars Trek DEM elevation service did not return valid elevation pixels for this coordinate.',
        queriedAt: new Date().toISOString(),
        cached: false,
      };
      if (dataAvailability !== 'UNAVAILABLE') {
        writeCache(cacheKey, payload, 10 * 60 * 1000);
      }
      res.json(payload);
    } catch (error) {
      res.status(200).json({
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
        limitationNote: 'Unable to reach NASA Mars Trek elevation ImageServer right now.',
        queriedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Terrain query failed',
      });
    }
  });

  // Route Elevation Profile & Obstacle Analysis along a multi-waypoint route
  app.post('/api/nasa/terrain/profile', async (req, res) => {
    const waypoints = Array.isArray(req.body?.waypoints) ? req.body.waypoints : [];
    if (waypoints.length < 2) {
      res.status(400).json({ error: 'At least two waypoints are required for a route terrain profile.' });
      return;
    }

    try {
      const { interpolateRoutePoints, enrichProfileSamplesWithSlope } = await import(
        './src/utils/terrainAnalysis.js'
      ).catch(() => import('./src/utils/terrainAnalysis'));

      const interpolated = interpolateRoutePoints(waypoints, 20);
      const allInsideGale = interpolated.every((pt: { lat: number; lng: number }) =>
        isInsideGaleDem(pt.lat, pt.lng)
      );

      let demName = 'MGS MOLA & Mars Express HRSC Global Blended DEM';
      let demInstrument = 'Mars Global Surveyor MOLA + Mars Express HRSC';
      let demResolution = '200 m/pixel';
      let demCoverageNote =
        'Global 200 m/px blended DEM; meter-scale boulders and sharp scarps (<200 m) require targeted HiRISE stereo verification.';

      let elevations: Array<number | null> = [];
      let globalFallbackUsed = false;

      if (allInsideGale) {
        try {
          const galeElevs = await queryTrekDemSamples('Gale_DEM_SMG_1m', interpolated);
          const validCount = galeElevs.filter((v) => v !== null).length;
          if (validCount >= Math.max(2, Math.floor(interpolated.length * 0.7))) {
            elevations = galeElevs;
            demName = 'Gale Crater High-Res Blended DEM (Gale_DEM_SMG_1m)';
            demInstrument = 'MRO HiRISE + CTX + Mars Express HRSC';
            demResolution = '1 m/pixel';
            demCoverageNote =
              'High-resolution 1 m/px Gale Crater regional DEM mosaic; inspect optical HiRISE/CTX imagery alongside elevation profile for loose sand and boulder hazards.';
          }
        } catch {
          // Fall through to global MOLA+HRSC blend
        }
      }

      if (elevations.length === 0) {
        globalFallbackUsed = true;
        elevations = await queryTrekDemSamples(
          'Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw',
          interpolated
        );
      }

      // Compute bounding box for obstacle & nomenclature features along route
      const lats = interpolated.map((p: { lat: number }) => p.lat);
      const lngs = interpolated.map((p: { lng: number }) => p.lng);
      const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      const features = await queryTrekMapFeatures(
        {
          minLng: Math.min(...lngs) - 0.35,
          minLat: Math.min(...lats) - 0.35,
          maxLng: Math.max(...lngs) + 0.35,
          maxLat: Math.max(...lats) + 0.35,
        },
        midLat,
        midLng
      ).catch(() => ({ nearbyFeatures: [], nearbyDuneFields: [], nearbyMineralDetections: [] }));

      const rawSamples = interpolated.map(
        (pt: { distanceKm: number; lat: number; lng: number; waypointName?: string }, idx: number) => ({
          distanceKm: pt.distanceKm,
          lat: pt.lat,
          lng: pt.lng,
          elevationM: elevations[idx] ?? null,
          waypointName: pt.waypointName,
        })
      );

      const samples = enrichProfileSamplesWithSlope(rawSamples);
      const validCount = samples.filter((s) => s.elevationM !== null).length;
      const status =
        validCount === 0
          ? 'UNAVAILABLE'
          : validCount < samples.length
          ? 'PARTIAL'
          : 'COMPLETE';

      res.json({
        status,
        demName,
        demInstrument,
        demResolution,
        demSourceUrl: 'https://trek.nasa.gov/mars/',
        demCoverageNote:
          globalFallbackUsed && allInsideGale
            ? `Fallback to 200 m/px global MOLA+HRSC blend because regional 1 m/px Gale DEM returned partial or unavailable samples.`
            : demCoverageNote,
        samples,
        nearbyFeatures: features.nearbyFeatures,
        nearbyDuneFields: features.nearbyDuneFields,
        nearbyMineralDetections: features.nearbyMineralDetections,
        queriedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(200).json({
        status: 'UNAVAILABLE',
        demName: 'MGS MOLA & Mars Express HRSC Global Blended DEM',
        demInstrument: 'MOLA + HRSC',
        demResolution: 'Unavailable',
        demSourceUrl: 'https://trek.nasa.gov/mars/',
        demCoverageNote: 'NASA Mars Trek DEM service unreachable.',
        samples: [],
        nearbyFeatures: [],
        nearbyDuneFields: [],
        nearbyMineralDetections: [],
        queriedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unable to sample NASA Trek route profile',
      });
    }
  });

  // USGS SIM 3292 Global Geology unit query at coordinate
  app.get('/api/nasa/geology/point', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      res.status(400).json({ error: 'Valid Martian coordinates (lat, lng) are required.' });
      return;
    }

    const cacheKey = `geology:${lat.toFixed(3)}:${lng.toFixed(3)}`;
    if (req.query.refresh !== '1') {
      const cached = readCache<Record<string, unknown>>(cacheKey);
      if (cached) {
        res.json({ ...cached, cached: true });
        return;
      }
    }

    const url = `${TREK_ARCGIS_BASE}/SIM3292_Global_Geology/MapServer/0/query?geometry=${encodeURIComponent(
      `${lng.toFixed(4)},${lat.toFixed(4)}`
    )}&geometryType=esriGeometryPoint&inSR=104905&spatialRel=esriSpatialRelIntersects&outFields=Unit,UnitDesc,SphArea_km&returnGeometry=false&f=json`;

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) {
        throw new Error(`USGS SIM 3292 MapServer HTTP ${response.status}`);
      }
      const data = (await response.json()) as {
        features?: Array<{ attributes?: { Unit?: string; UnitDesc?: string; SphArea_km?: number } }>;
      };
      const attr = data.features?.[0]?.attributes;
      const payload = {
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
        unitCode: attr?.Unit ?? null,
        unitDescription: attr?.UnitDesc ?? null,
        areaKm2:
          typeof attr?.SphArea_km === 'number' && Number.isFinite(attr.SphArea_km)
            ? Number(attr.SphArea_km.toFixed(1))
            : null,
        sourceName: 'USGS SIM 3292 Global Geologic Map via NASA Mars Trek',
        sourceUrl: 'https://pubs.usgs.gov/sim/3292/',
        availability: attr?.Unit ? 'AVAILABLE' : 'UNAVAILABLE',
        retrievedAt: new Date().toISOString(),
        cached: false,
      };
      if (payload.availability === 'AVAILABLE') {
        writeCache(cacheKey, payload, 15 * 60 * 1000);
      }
      res.json(payload);
    } catch (error) {
      res.status(200).json({
        lat: Number(lat.toFixed(4)),
        lng: Number(lng.toFixed(4)),
        unitCode: null,
        unitDescription: null,
        areaKm2: null,
        sourceName: 'USGS SIM 3292 Global Geologic Map via NASA Mars Trek',
        sourceUrl: 'https://pubs.usgs.gov/sim/3292/',
        availability: 'UNAVAILABLE',
        retrievedAt: new Date().toISOString(),
        cached: false,
        error: error instanceof Error ? error.message : 'Geology service unavailable',
      });
    }
  });

  // NASA Data Integration Manager: verify live service endpoints & report latency/status
  app.get('/api/nasa/services/status', async (req, res) => {
    const cacheKey = 'nasa_services_status';
    if (req.query.refresh !== '1') {
      const cached = readCache<Record<string, unknown>>(cacheKey);
      if (cached) {
        res.json({ ...cached, cached: true });
        return;
      }
    }

    async function checkEndpoint(
      id: string,
      label: string,
      url: string,
      availableStatus: 'AVAILABLE' | 'PARTIAL COVERAGE' | 'HISTORICAL ARCHIVE',
      successMsg: string
    ) {
      const started = Date.now();
      try {
        const resp = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(5500),
        });
        const latencyMs = Date.now() - started;
        return {
          id,
          label,
          status: resp.ok ? availableStatus : 'UNAVAILABLE',
          httpStatus: resp.status,
          latencyMs,
          checkedAt: new Date().toISOString(),
          message: resp.ok ? successMsg : `Endpoint returned HTTP ${resp.status}`,
          cached: false,
        };
      } catch (err) {
        return {
          id,
          label,
          status: 'UNAVAILABLE',
          httpStatus: null,
          latencyMs: Date.now() - started,
          checkedAt: new Date().toISOString(),
          message: err instanceof Error ? err.message : 'Connection timeout',
          cached: false,
        };
      }
    }

    const services = await Promise.all([
      checkEndpoint(
        'MOLA',
        'MOLA + HRSC Elevation ImageServer',
        `${TREK_ARCGIS_BASE}/Mars_MOLA_blend200ppx_HRSC_DEM_clon0dd_200mpp_lzw/ImageServer?f=json`,
        'AVAILABLE',
        'Global 200 m/px MOLA+HRSC elevation service online.'
      ),
      checkEndpoint(
        'THEMIS',
        'THEMIS Controlled Day/Night IR WMTS',
        'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml',
        'PARTIAL COVERAGE',
        '100 m/px Oct 2018 controlled mosaic WMTS online (equatorial/mid-latitudes).'
      ),
      checkEndpoint(
        'HiRISE',
        'HiRISE Jezero 25cm WMTS & Gale 1m DEM',
        `${TREK_ARCGIS_BASE}/Gale_DEM_SMG_1m/ImageServer?f=json`,
        'PARTIAL COVERAGE',
        'Targeted regional HiRISE mosaics & 1 m/px Gale DEM online (~5% global coverage).'
      ),
      checkEndpoint(
        'CTX',
        'MRO CTX 5 m/px Global Mosaic MapServer',
        'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=json',
        'AVAILABLE',
        'Caltech Murray Lab 5 m/px CTX tile service online.'
      ),
      checkEndpoint(
        'CRISM',
        'OMEGA / CRISM Hydrous Mineral MapServer',
        `${TREK_ARCGIS_BASE}/Hydrous_Mineral_Detections_OMEGA_CRISM_clon0/MapServer?f=json`,
        'PARTIAL COVERAGE',
        'Targeted OMEGA/CRISM hydrous mineral detection feature layer online.'
      ),
      checkEndpoint(
        'GEOLOGY',
        'USGS SIM 3292 Global Geology MapServer',
        `${TREK_ARCGIS_BASE}/SIM3292_Global_Geology/MapServer?f=json`,
        'AVAILABLE',
        'USGS 1:20M Global Geologic Unit query & WMTS service online.'
      ),
      checkEndpoint(
        'INSIGHT',
        'NASA InSight Weather Archive API',
        `https://api.nasa.gov/insight_weather/?api_key=${encodeURIComponent(
          process.env.NASA_API_KEY || 'DEMO_KEY'
        )}&feedtype=json&ver=1.0`,
        'HISTORICAL ARCHIVE',
        'Historical Oct 2020 meteorological archive reachable.'
      ),
      Promise.resolve({
        id: 'RAD',
        label: 'Curiosity MSL RAD Peer-Reviewed Baseline',
        status: 'HISTORICAL ARCHIVE' as const,
        httpStatus: 200,
        latencyMs: 0,
        checkedAt: new Date().toISOString(),
        message: 'Verified Sol 0–300 baseline (Hassler et al., Science 2014); live PDS PPI stream not connected.',
        cached: false,
      }),
    ]);

    const payload = {
      checkedAt: new Date().toISOString(),
      cached: false,
      services,
    };
    writeCache(cacheKey, payload, 5 * 60 * 1000);
    res.json(payload);
  });

  // ==================================================
  // VERSION 4: SERVER-SIDE GEMINI AI ASSISTANT ENDPOINTS
  // ==================================================

  app.get('/api/ai/status', async (req, res) => {
    const probe = req.query.probe === '1';
    const status = await checkGeminiStatus(probe);
    res.json(status);
  });

  app.post('/api/ai/chat', async (req, res) => {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const context = req.body?.context;

    if (!question) {
      res.status(400).json({ error: 'A non-empty scientific question is required.' });
      return;
    }
    if (!context || typeof context !== 'object') {
      res.status(400).json({ error: 'MARSCOPE application context snapshot is required.' });
      return;
    }

    try {
      const result = await runAiChat({ question, history, context });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ status: 'UNAVAILABLE', error: error.message });
        return;
      }
      res.status(502).json({
        status: 'UNAVAILABLE',
        error: error instanceof Error ? error.message : 'Unable to reach Gemini AI service.',
      });
    }
  });

  app.post('/api/ai/geology-interpret', async (req, res) => {
    const observation =
      typeof req.body?.observation === 'string' ? req.body.observation.trim() : '';
    const spectralEvidenceProvided = Boolean(req.body?.spectralEvidenceProvided);
    const context = req.body?.context;

    if (!observation) {
      res.status(400).json({ error: 'Provide a geological observation or select a preset.' });
      return;
    }
    if (!context || typeof context !== 'object') {
      res.status(400).json({ error: 'MARSCOPE application context snapshot is required.' });
      return;
    }

    try {
      const result = await runGeologicalInterpreter({
        observation,
        spectralEvidenceProvided,
        context,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ status: 'UNAVAILABLE', error: error.message });
        return;
      }
      res.status(502).json({
        status: 'UNAVAILABLE',
        error: error instanceof Error ? error.message : 'Geological Interpreter request failed.',
      });
    }
  });

  app.post('/api/ai/terrain-interpret', async (req, res) => {
    const context = req.body?.context;
    if (!context || typeof context !== 'object') {
      res.status(400).json({ error: 'MARSCOPE terrain context snapshot is required.' });
      return;
    }

    try {
      const result = await runTerrainIntelligence({ context });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ status: 'UNAVAILABLE', error: error.message });
        return;
      }
      res.status(502).json({
        status: 'UNAVAILABLE',
        error: error instanceof Error ? error.message : 'Terrain Intelligence request failed.',
      });
    }
  });

  app.post('/api/ai/mission-advisor', async (req, res) => {
    const context = req.body?.context;
    if (!context || typeof context !== 'object') {
      res.status(400).json({ error: 'Active Mission Planner context snapshot is required.' });
      return;
    }

    try {
      const result = await runMissionAdvisor({ context });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ status: 'UNAVAILABLE', error: error.message });
        return;
      }
      res.status(502).json({
        status: 'UNAVAILABLE',
        error: error instanceof Error ? error.message : 'AI Mission Advisor request failed.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MARSCOPE server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer();
