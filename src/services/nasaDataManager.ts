import { MSL_RAD_REFERENCE_RECORDS } from '../data/safetyReference';
import type {
  DatasetProvenanceRecord,
  GeologyPointRecord,
  InSightApiResponse,
  MarsRegion,
  NasaDataModuleMetadata,
  NasaModuleAvailability,
  NasaModuleId,
  NasaServicesStatusResponse,
  PointTerrainAnalysis,
  RouteTerrainAnalysisResponse,
  Waypoint,
} from '../types/mars';

/**
 * Independent metadata registry for the six core NASA/USGS scientific data modules
 * plus regional geology and historical meteorology integrations.
 */
export const NASA_DATA_MODULES: Record<NasaModuleId, NasaDataModuleMetadata> = {
  MOLA: {
    id: 'MOLA',
    datasetName: 'MOLA & HRSC Blended Digital Elevation Model (DEM)',
    mission: 'Mars Global Surveyor (MGS) & ESA Mars Express',
    instrument: 'MOLA Laser Altimeter + HRSC Stereo Camera',
    provider: 'NASA GSFC / USGS Astrogeology / ESA / NASA Mars Trek',
    observationDate: '1997–2001 (MGS MOLA) · 2004–Present (HRSC Blend)',
    isHistoricalOnly: false,
    spatialResolution: '200 m/px (Blend) · 463 m/px (MOLA MEGDR) · 1 m/px (Gale SMG)',
    coverage: 'Global 90° N–90° S (Gale 1 m/px regional footprint)',
    sourceUrl: 'https://pds-geosciences.wustl.edu/missions/mgs/mola.html',
    endpointLabel: 'NASA Mars Trek Elevation ImageServer',
    scientificPurpose:
      'Provides calibrated surface elevation relative to the Martian areoid, slope stencils, and crater/depression relief metrics.',
    limitationNote:
      '200–463 m/px global DEMs cannot resolve meter-scale boulders or narrow cliff overhangs without targeted HiRISE stereo DTMs.',
  },
  THEMIS: {
    id: 'THEMIS',
    datasetName: 'THEMIS Daytime & Nighttime Infrared Controlled Mosaics',
    mission: '2001 Mars Odyssey',
    instrument: 'Thermal Emission Imaging System (THEMIS Band 9, 12.57 µm)',
    provider: 'Arizona State University (ASU) / USGS Astrogeology / NASA Mars Trek',
    observationDate: 'Oct 2018 Controlled Mosaic Release (2002–2018 acquisitions)',
    isHistoricalOnly: false,
    spatialResolution: '100 m/pixel',
    coverage: 'Controlled equatorial and mid-latitude mosaics (polar gaps exist)',
    sourceUrl: 'https://themis.asu.edu/',
    endpointLabel: 'NASA Mars Trek THEMIS Day/Night IR WMTS',
    scientificPurpose:
      'Nighttime IR isolates thermal inertia (bright exposed bedrock/boulders vs. dark loose dust/sand); Daytime IR shows insolation and albedo.',
    limitationNote:
      'Depicts archived mosaic brightness radiance rather than real-time surface temperature telemetry.',
  },
  HiRISE: {
    id: 'HiRISE',
    datasetName: 'HiRISE High-Resolution Surface Imagery & Targeted DTMs',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'High Resolution Imaging Science Experiment (HiRISE)',
    provider: 'University of Arizona LPL / NASA PDS',
    observationDate: '2006–Present (Targeted Strip Acquisitions)',
    isHistoricalOnly: false,
    spatialResolution: '0.25–0.30 m/pixel (imagery) · 1 m/px (site DTMs)',
    coverage: 'Targeted regional strips (~4–5% of Mars; Jezero 25cm & Gale 1m live)',
    sourceUrl: 'https://www.uahirise.org/catalog/',
    endpointLabel: 'UArizona HiRISE PDS Catalog & Trek Regional Overlays',
    scientificPurpose:
      'Resolves rover- and astronaut-scale boulders, dune ripples, outcrop layering, and steep scarp geometry.',
    limitationNote:
      'No continuous global HiRISE tile stream exists; targeted strip verification is required outside mapped landing sites.',
  },
  CTX: {
    id: 'CTX',
    datasetName: 'MRO Context Camera (CTX) Global Optical Mosaic',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'Context Camera (CTX)',
    provider: 'The Murray Lab (Caltech) / NASA JPL / MSSS',
    observationDate: '2006–2023 Compiled Global Mosaic (v01)',
    isHistoricalOnly: false,
    spatialResolution: '5 m/pixel',
    coverage: 'Near-global (>99% between ±88° latitude)',
    sourceUrl: 'https://murray-lab.caltech.edu/CTX/',
    endpointLabel: 'Caltech / Esri Astro OnMars CTX MapServer',
    scientificPurpose:
      'Bridges coarse regional topography and targeted HiRISE strips for continuous crater rim, ejecta, and channel tracing.',
    limitationNote:
      'Uncontrolled mosaic seams can introduce tens of meters of local positional offset.',
  },
  CRISM: {
    id: 'CRISM',
    datasetName: 'CRISM & OMEGA Hydrous Mineral & Spectral Detections',
    mission: 'Mars Reconnaissance Orbiter (CRISM) & Mars Express (OMEGA)',
    instrument: 'Compact Reconnaissance Imaging Spectrometer for Mars / OMEGA',
    provider: 'JHU APL / NASA PDS Geosciences Node / NASA Mars Trek',
    observationDate: '2006–2022 (CRISM Targeted Observations)',
    isHistoricalOnly: true,
    spatialResolution: '18–200 m/pixel (targeted cubes & point index)',
    coverage: 'Targeted science footprints and mapped hydrous mineral localities',
    sourceUrl: 'https://pds-geosciences.wustl.edu/missions/mro/crism.htm',
    endpointLabel: 'NASA Trek OMEGA/CRISM Hydrous Mineral MapServer',
    scientificPurpose:
      'Identifies phyllosilicates (clays), sulfates, carbonates, and hydrated silica indicative of past aqueous alteration and ISRU targets.',
    limitationNote:
      'CRISM cryocooler ended operations in 2022 and hyperspectral cubes are targeted rather than globally continuous.',
  },
  RAD: {
    id: 'RAD',
    datasetName: 'Curiosity RAD Surface Radiation Measurements',
    mission: 'Mars Science Laboratory (Curiosity)',
    instrument: 'Radiation Assessment Detector (RAD)',
    provider: 'Southwest Research Institute (SwRI) / NASA PDS PPI',
    observationDate: 'Sol 0–300 (Aug 2012 – Jun 2013, Hassler et al., Science 2014)',
    isHistoricalOnly: true,
    spatialResolution: 'Point rover traverse record (Gale Crater, -4.5 km elevation)',
    coverage: 'Gale Crater floor and lower Mount Sharp traverse',
    sourceUrl: 'https://pds-ppi.igpp.ucla.edu/mission/MSL',
    endpointLabel: 'Curated Peer-Reviewed Historical Baseline (Offline Reference)',
    scientificPurpose:
      'Establishes empirical surface Galactic Cosmic Ray (~0.21 mGy/day, ~0.64 mSv/day) baseline for EVA dose budgeting.',
    limitationNote:
      'Historical Gale Crater baseline only; live surface radiation and solar energetic particle (SEP) alerts are NOT connected.',
  },
};

interface ClientCacheEntry<T> {
  expiresAt: number;
  retrievedAt: string;
  data: T;
}

const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;
const clientCache = new Map<string, ClientCacheEntry<unknown>>();

function getClientCached<T>(key: string): { data: T; retrievedAt: string } | null {
  const entry = clientCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    clientCache.delete(key);
    return null;
  }
  return { data: entry.data as T, retrievedAt: entry.retrievedAt };
}

function setClientCached<T>(key: string, data: T): string {
  const retrievedAt = new Date().toISOString();
  if (clientCache.size > 100) {
    const oldest = clientCache.keys().next().value;
    if (oldest) clientCache.delete(oldest);
  }
  clientCache.set(key, {
    expiresAt: Date.now() + CLIENT_CACHE_TTL_MS,
    retrievedAt,
    data,
  });
  return retrievedAt;
}

export function clearNasaClientCache(): void {
  clientCache.clear();
}

/**
 * Module: Service Health Verification
 */
export async function verifyAllNasaServices(
  forceRefresh = false
): Promise<NasaServicesStatusResponse> {
  const cacheKey = 'services_status';
  if (!forceRefresh) {
    const hit = getClientCached<NasaServicesStatusResponse>(cacheKey);
    if (hit) return { ...hit.data, cached: true };
  }

  try {
    const url = forceRefresh ? '/api/nasa/services/status?refresh=1' : '/api/nasa/services/status';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as NasaServicesStatusResponse;
    setClientCached(cacheKey, data);
    return data;
  } catch (error) {
    const now = new Date().toISOString();
    return {
      checkedAt: now,
      cached: false,
      services: [
        {
          id: 'MOLA',
          label: 'MOLA + HRSC Elevation ImageServer',
          status: 'UNAVAILABLE',
          httpStatus: null,
          latencyMs: null,
          checkedAt: now,
          message: error instanceof Error ? error.message : 'Service verification failed',
          cached: false,
        },
      ],
    };
  }
}

/**
 * Module: MOLA / HRSC Elevation & Slope Point Query
 */
export async function fetchMolaPointAnalysis(
  lat: number,
  lng: number,
  forceRefresh = false
): Promise<PointTerrainAnalysis> {
  const cacheKey = `mola_pt:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  if (!forceRefresh) {
    const hit = getClientCached<PointTerrainAnalysis>(cacheKey);
    if (hit) return hit.data;
  }

  const res = await fetch('/api/nasa/terrain/point', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
  });
  const data = (await res.json()) as PointTerrainAnalysis;
  if (data.dataAvailability !== 'UNAVAILABLE') {
    setClientCached(cacheKey, data);
  }
  return data;
}

/**
 * Module: MOLA / HRSC Route Elevation Profile
 */
export async function fetchMolaRouteProfile(
  waypoints: Waypoint[],
  forceRefresh = false
): Promise<RouteTerrainAnalysisResponse> {
  const sig = waypoints.map((w) => `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`).join('|');
  const cacheKey = `mola_route:${sig}`;
  if (!forceRefresh) {
    const hit = getClientCached<RouteTerrainAnalysisResponse>(cacheKey);
    if (hit) return hit.data;
  }

  const res = await fetch('/api/nasa/terrain/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ waypoints }),
  });
  const data = (await res.json()) as RouteTerrainAnalysisResponse;
  if (data.status !== 'UNAVAILABLE') {
    setClientCached(cacheKey, data);
  }
  return data;
}

/**
 * Module: USGS SIM 3292 Geologic Unit Query
 */
export async function fetchGeologyPoint(
  lat: number,
  lng: number,
  forceRefresh = false
): Promise<GeologyPointRecord> {
  const cacheKey = `geo:${lat.toFixed(3)}:${lng.toFixed(3)}`;
  if (!forceRefresh) {
    const hit = getClientCached<GeologyPointRecord>(cacheKey);
    if (hit) return { ...hit.data, cached: true };
  }

  try {
    const res = await fetch(
      `/api/nasa/geology/point?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}${
        forceRefresh ? '&refresh=1' : ''
      }`
    );
    const data = (await res.json()) as GeologyPointRecord;
    if (data.availability === 'AVAILABLE') {
      setClientCached(cacheKey, data);
    }
    return data;
  } catch (error) {
    return {
      lat,
      lng,
      unitCode: null,
      unitDescription: null,
      areaKm2: null,
      sourceName: 'USGS SIM 3292 Global Geologic Map via NASA Mars Trek',
      sourceUrl: 'https://pubs.usgs.gov/sim/3292/',
      availability: 'UNAVAILABLE',
      retrievedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Geology fetch failed',
    };
  }
}

/**
 * Module: InSight Historical Atmospheric Observations
 */
export async function fetchInSightHistory(forceRefresh = false): Promise<InSightApiResponse> {
  const cacheKey = 'insight_history';
  if (!forceRefresh) {
    const hit = getClientCached<InSightApiResponse>(cacheKey);
    if (hit) return hit.data;
  }
  try {
    const res = await fetch(forceRefresh ? '/api/nasa/insight?refresh=1' : '/api/nasa/insight');
    const data = (await res.json()) as InSightApiResponse;
    if (data.status === 'HISTORICAL DATA') {
      setClientCached(cacheKey, data);
    }
    return data;
  } catch (error) {
    return {
      status: 'DATA NOT CONNECTED',
      source: 'NASA InSight Mars Weather Service (api.nasa.gov)',
      error: error instanceof Error ? error.message : 'Unable to reach InSight proxy',
      sols: [],
    };
  }
}

/**
 * Module: Curiosity RAD Curated Historical Radiation Baseline
 */
export function getCuriosityRadBaseline() {
  return {
    module: NASA_DATA_MODULES.RAD,
    records: MSL_RAD_REFERENCE_RECORDS,
    status: 'HISTORICAL ARCHIVE' as NasaModuleAvailability,
    realTimeConnected: false,
  };
}

/**
 * Evaluates whether a given region currently has high-resolution local DEM/HiRISE coverage
 * inside MARSCOPE's integrated tile/DEM endpoints.
 */
export function checkHiRiseRegionalCoverage(region: MarsRegion): {
  hasDirectTileOrDem: boolean;
  coverageNote: string;
} {
  if (region.id === 'gale-crater') {
    return {
      hasDirectTileOrDem: true,
      coverageNote:
        '1 m/px Gale Crater SMG DEM active; optical HiRISE 0.3 m/px strips require UArizona PDS catalog inspection.',
    };
  }
  if (region.id === 'jezero-crater') {
    return {
      hasDirectTileOrDem: true,
      coverageNote:
        '25 cm/px Jezero Crater HiRISE Controlled Mosaic WMTS active over landing ellipse; surrounding rim uses 5 m/px CTX.',
    };
  }
  return {
    hasDirectTileOrDem: false,
    coverageNote: `No direct live HiRISE tile stream or 1 m/px DEM is connected for ${region.name}; rely on 5 m/px CTX mosaic and request targeted UArizona/NASA HiRISE strip inspection.`,
  };
}

/**
 * Builds complete Dataset Provenance records combining static metadata with live retrieval timestamps
 * and verified endpoint status.
 */
export function buildProvenanceLedger(params: {
  serviceStatus: NasaServicesStatusResponse | null;
  pointAnalysis: PointTerrainAnalysis | null;
  geologyRecord: GeologyPointRecord | null;
  insightData: InSightApiResponse | null;
}): DatasetProvenanceRecord[] {
  const { serviceStatus, pointAnalysis, geologyRecord, insightData } = params;
  const findHealth = (id: string) => serviceStatus?.services.find((s) => s.id === id);

  const molaHealth = findHealth('MOLA');
  const themisHealth = findHealth('THEMIS');
  const hiriseHealth = findHealth('HiRISE');
  const ctxHealth = findHealth('CTX');
  const crismHealth = findHealth('CRISM');
  const geoHealth = findHealth('GEOLOGY');
  const insightHealth = findHealth('INSIGHT');

  return [
    {
      id: 'prov-mola',
      moduleId: 'MOLA',
      datasetName: NASA_DATA_MODULES.MOLA.datasetName,
      nasaMission: NASA_DATA_MODULES.MOLA.mission,
      instrument: NASA_DATA_MODULES.MOLA.instrument,
      originalProvider: NASA_DATA_MODULES.MOLA.provider,
      observationDate: NASA_DATA_MODULES.MOLA.observationDate,
      temporalClass: 'Archived Mosaic / DEM',
      spatialResolution: NASA_DATA_MODULES.MOLA.spatialResolution,
      coverage: NASA_DATA_MODULES.MOLA.coverage,
      sourceUrl: NASA_DATA_MODULES.MOLA.sourceUrl,
      availabilityStatus:
        pointAnalysis?.dataAvailability === 'UNAVAILABLE'
          ? molaHealth?.status ?? 'UNAVAILABLE'
          : 'AVAILABLE',
      lastRetrievedAt: pointAnalysis?.queriedAt ?? molaHealth?.checkedAt ?? null,
    },
    {
      id: 'prov-themis',
      moduleId: 'THEMIS',
      datasetName: NASA_DATA_MODULES.THEMIS.datasetName,
      nasaMission: NASA_DATA_MODULES.THEMIS.mission,
      instrument: NASA_DATA_MODULES.THEMIS.instrument,
      originalProvider: NASA_DATA_MODULES.THEMIS.provider,
      observationDate: NASA_DATA_MODULES.THEMIS.observationDate,
      temporalClass: 'Archived Mosaic / DEM',
      spatialResolution: NASA_DATA_MODULES.THEMIS.spatialResolution,
      coverage: NASA_DATA_MODULES.THEMIS.coverage,
      sourceUrl: NASA_DATA_MODULES.THEMIS.sourceUrl,
      availabilityStatus: themisHealth?.status ?? 'PARTIAL COVERAGE',
      lastRetrievedAt: themisHealth?.checkedAt ?? null,
    },
    {
      id: 'prov-hirise',
      moduleId: 'HiRISE',
      datasetName: NASA_DATA_MODULES.HiRISE.datasetName,
      nasaMission: NASA_DATA_MODULES.HiRISE.mission,
      instrument: NASA_DATA_MODULES.HiRISE.instrument,
      originalProvider: NASA_DATA_MODULES.HiRISE.provider,
      observationDate: NASA_DATA_MODULES.HiRISE.observationDate,
      temporalClass: 'Catalog Index',
      spatialResolution: NASA_DATA_MODULES.HiRISE.spatialResolution,
      coverage: NASA_DATA_MODULES.HiRISE.coverage,
      sourceUrl: NASA_DATA_MODULES.HiRISE.sourceUrl,
      availabilityStatus: hiriseHealth?.status ?? 'PARTIAL COVERAGE',
      lastRetrievedAt: hiriseHealth?.checkedAt ?? null,
    },
    {
      id: 'prov-ctx',
      moduleId: 'CTX',
      datasetName: NASA_DATA_MODULES.CTX.datasetName,
      nasaMission: NASA_DATA_MODULES.CTX.mission,
      instrument: NASA_DATA_MODULES.CTX.instrument,
      originalProvider: NASA_DATA_MODULES.CTX.provider,
      observationDate: NASA_DATA_MODULES.CTX.observationDate,
      temporalClass: 'Archived Mosaic / DEM',
      spatialResolution: NASA_DATA_MODULES.CTX.spatialResolution,
      coverage: NASA_DATA_MODULES.CTX.coverage,
      sourceUrl: NASA_DATA_MODULES.CTX.sourceUrl,
      availabilityStatus: ctxHealth?.status ?? 'AVAILABLE',
      lastRetrievedAt: ctxHealth?.checkedAt ?? null,
    },
    {
      id: 'prov-crism',
      moduleId: 'CRISM',
      datasetName: NASA_DATA_MODULES.CRISM.datasetName,
      nasaMission: NASA_DATA_MODULES.CRISM.mission,
      instrument: NASA_DATA_MODULES.CRISM.instrument,
      originalProvider: NASA_DATA_MODULES.CRISM.provider,
      observationDate: NASA_DATA_MODULES.CRISM.observationDate,
      temporalClass: 'Historical Measurements',
      spatialResolution: NASA_DATA_MODULES.CRISM.spatialResolution,
      coverage: NASA_DATA_MODULES.CRISM.coverage,
      sourceUrl: NASA_DATA_MODULES.CRISM.sourceUrl,
      availabilityStatus: crismHealth?.status ?? 'PARTIAL COVERAGE',
      lastRetrievedAt: pointAnalysis?.queriedAt ?? crismHealth?.checkedAt ?? null,
    },
    {
      id: 'prov-geology',
      moduleId: 'USGS SIM 3292',
      datasetName: 'Geologic Map of Mars (USGS SIM 3292)',
      nasaMission: 'USGS / NASA Planetary Geologic Mapping Program',
      instrument: 'Synthesized MOLA, THEMIS & Viking Stratigraphy',
      originalProvider: 'USGS Astrogeology Science Center / NASA Mars Trek',
      observationDate: '2014 Peer-Reviewed Publication (Tanaka et al., 2014)',
      temporalClass: 'Archived Mosaic / DEM',
      spatialResolution: '1:20,000,000 Global Scale',
      coverage: 'Global (100%)',
      sourceUrl: 'https://pubs.usgs.gov/sim/3292/',
      availabilityStatus:
        geologyRecord?.availability === 'AVAILABLE'
          ? 'AVAILABLE'
          : geoHealth?.status ?? 'UNAVAILABLE',
      lastRetrievedAt: geologyRecord?.retrievedAt ?? geoHealth?.checkedAt ?? null,
    },
    {
      id: 'prov-insight',
      moduleId: 'InSight APSS',
      datasetName: 'InSight Elysium Planitia Meteorological Archive',
      nasaMission: 'NASA InSight Mars Lander',
      instrument: 'Auxiliary Payload Sensor Suite (APSS / TWINS)',
      originalProvider: 'NASA JPL / api.nasa.gov',
      observationDate: 'Oct 2020 (Sols 675–681 · Mission Concluded Dec 2022)',
      temporalClass: 'Historical Measurements',
      spatialResolution: 'Single Lander Station (4.5° N, 135.6° E)',
      coverage: 'Elysium Planitia Landing Site Only',
      sourceUrl: 'https://api.nasa.gov/',
      availabilityStatus:
        insightData?.status === 'HISTORICAL DATA'
          ? 'HISTORICAL ARCHIVE'
          : insightHealth?.status ?? 'UNAVAILABLE',
      lastRetrievedAt: insightHealth?.checkedAt ?? null,
    },
    {
      id: 'prov-rad',
      moduleId: 'RAD',
      datasetName: NASA_DATA_MODULES.RAD.datasetName,
      nasaMission: NASA_DATA_MODULES.RAD.mission,
      instrument: NASA_DATA_MODULES.RAD.instrument,
      originalProvider: NASA_DATA_MODULES.RAD.provider,
      observationDate: NASA_DATA_MODULES.RAD.observationDate,
      temporalClass: 'Historical Measurements',
      spatialResolution: NASA_DATA_MODULES.RAD.spatialResolution,
      coverage: NASA_DATA_MODULES.RAD.coverage,
      sourceUrl: NASA_DATA_MODULES.RAD.sourceUrl,
      availabilityStatus: 'HISTORICAL ARCHIVE',
      lastRetrievedAt: 'Peer-reviewed static archive (Hassler et al., 2014)',
    },
  ];
}
