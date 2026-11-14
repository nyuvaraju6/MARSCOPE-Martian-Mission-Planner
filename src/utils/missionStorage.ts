import type { MissionPlan } from '../types/mars';

const STORAGE_KEY = 'marscope_saved_missions_v1';
const ACTIVE_MISSION_ID_KEY = 'marscope_active_mission_id_v1';

export const DEFAULT_GALE_DEMO_MISSION: MissionPlan = {
  id: 'demo-gale-mount-sharp',
  name: 'Gale Crater – Mount Sharp Foothills Traverse',
  regionId: 'gale-crater',
  regionName: 'Gale Crater (Aeolis Palus & Mount Sharp)',
  scientificObjective:
    'Inspect exposed clay-bearing and sulfate-bearing sedimentary strata along the lower flank of Aeolis Mons (Mount Sharp) to evaluate ancient lacustrine habitability.',
  walkingSpeedKmH: 2.0,
  status: 'DEMONSTRATION DATA — Unverified for Human Crew Traverse',
  isDemonstration: true,
  updatedAt: '2026-10-01T00:00:00.000Z',
  waypoints: [
    {
      id: 'wp-bradbury',
      name: 'Aeolis Palus Base (Near Bradbury Landing)',
      lat: -4.5895,
      lng: 137.4417,
      notes: 'Alluvial fan and conglomerate plain reference origin.',
    },
    {
      id: 'wp-glenelg',
      name: 'Yellowknife Bay / Glenelg Junction',
      lat: -4.602,
      lng: 137.466,
      notes: 'Fractured mudstone geological contact zone.',
    },
    {
      id: 'wp-vera-rubin',
      name: 'Vera Rubin Ridge Approach',
      lat: -4.675,
      lng: 137.432,
      notes: 'Hematite-bearing ridge transition before Mount Sharp slopes.',
    },
    {
      id: 'wp-mount-sharp',
      name: 'Mount Sharp Lower Sulfate Unit Target',
      lat: -4.718,
      lng: 137.418,
      notes: 'Primary stratigraphic sampling destination (requires HiRISE slope audit).',
    },
  ],
  scientificTargets: [
    {
      id: 'tgt-glenelg-mudstone',
      name: 'Yellowknife Bay Fluvial-Lacustrine Mudstone',
      category: 'Layered sedimentary formations',
      lat: -4.6015,
      lng: 137.4655,
      description:
        'Sample demonstration target: Fine-grained laminated mudstones indicative of ancient freshwater lakebed deposition.',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'tgt-glen-torridon-clay',
      name: 'Glen Torridon Clay-Bearing Trough',
      category: 'Clay-bearing deposits',
      lat: -4.689,
      lng: 137.428,
      description:
        'Sample demonstration target: Phyllosilicate-rich strata mapped by MRO CRISM south of Vera Rubin Ridge.',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'tgt-sulfate-transition',
      name: 'Mount Sharp Lower Sulfate Facies',
      category: 'Sulfate-bearing deposits',
      lat: -4.718,
      lng: 137.418,
      description:
        'Sample demonstration target: Layered sulfate-bearing unit recording ancient Martian climatic aridification.',
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  ],
};

function normalizeMission(m: MissionPlan): MissionPlan {
  return {
    ...m,
    scientificTargets: Array.isArray(m.scientificTargets) ? m.scientificTargets : [],
  };
}

export function loadSavedMissions(): MissionPlan[] {
  if (typeof window === 'undefined') return [DEFAULT_GALE_DEMO_MISSION];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [DEFAULT_GALE_DEMO_MISSION];
    const parsed = JSON.parse(raw) as MissionPlan[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_GALE_DEMO_MISSION];
    }
    const normalized = parsed.map(normalizeMission);
    const hasDemo = normalized.some((m) => m.id === DEFAULT_GALE_DEMO_MISSION.id);
    return hasDemo ? normalized : [DEFAULT_GALE_DEMO_MISSION, ...normalized];
  } catch {
    return [DEFAULT_GALE_DEMO_MISSION];
  }
}

export function loadActiveMission(missions: MissionPlan[]): MissionPlan {
  if (typeof window === 'undefined') return missions[0] ?? DEFAULT_GALE_DEMO_MISSION;
  try {
    const activeId = window.localStorage.getItem(ACTIVE_MISSION_ID_KEY);
    if (activeId) {
      const found = missions.find((m) => m.id === activeId);
      if (found) return normalizeMission(found);
    }
  } catch {
    // Ignore storage errors
  }
  const fallback =
    missions.find((m) => m.id === DEFAULT_GALE_DEMO_MISSION.id) ??
    missions[0] ??
    DEFAULT_GALE_DEMO_MISSION;
  return normalizeMission(fallback);
}

export function saveActiveMissionId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_MISSION_ID_KEY, id);
  } catch {
    // Ignore
  }
}

export function saveMissionsList(missions: MissionPlan[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
