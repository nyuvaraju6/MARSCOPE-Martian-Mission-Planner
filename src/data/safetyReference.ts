export interface RadiationReferenceRecord {
  parameter: string;
  measuredValue: string;
  missionSource: string;
  observationPeriod: string;
  limitations: string;
  citationUrl: string;
}

export const MSL_RAD_REFERENCE_RECORDS: RadiationReferenceRecord[] = [
  {
    parameter: 'Average Surface Absorbed Dose Rate (GCR)',
    measuredValue: '~0.21 mGy/day (Gale Crater baseline)',
    missionSource: 'Mars Science Laboratory (Curiosity) — RAD Instrument',
    observationPeriod: 'Sol 0–300 (Aug 2012 – Jun 2013, Solar Cycle 24)',
    limitations:
      'Measured under ~8.5 g/cm² vertical CO2 column depth at Gale Crater (-4.5 km elevation). Higher-elevation plateaus experience reduced atmospheric shielding.',
    citationUrl: 'https://pds-ppi.igpp.ucla.edu/mission/MSL',
  },
  {
    parameter: 'Average Surface Dose Equivalent Rate',
    measuredValue: '~0.64 mSv/day (quiet solar conditions)',
    missionSource: 'Mars Science Laboratory (Curiosity) — RAD Instrument',
    observationPeriod: 'Hassler et al., Science 343 (2014)',
    limitations:
      'Excludes episodic Solar Energetic Particle (SEP) events, which can cause acute short-term spikes requiring storm-shelter shielding.',
    citationUrl: 'https://science.nasa.gov/mission/msl-curiosity/',
  },
  {
    parameter: 'Solar Energetic Particle (SEP) Contingency',
    measuredValue: 'Variable episodic spikes (site & solar-cycle dependent)',
    missionSource: 'MSL RAD & MRO / Odyssey Orbital Monitors',
    observationPeriod: 'Historical multi-year monitoring (2012–2024)',
    limitations:
      'Real-time surface radiation telemetry is NOT connected in this portal. Future crew EVAs require continuous orbital space-weather alerts.',
    citationUrl: 'https://pds-ppi.igpp.ucla.edu/mission/MSL',
  },
];

export interface TerrainHazardCategory {
  id: string;
  title: string;
  severity: 'HIGH CAUTION' | 'MODERATE CAUTION';
  indicators: string;
  detectionDatasets: string;
  mitigationNotes: string;
}

export const TERRAIN_HAZARD_GUIDELINES: TerrainHazardCategory[] = [
  {
    id: 'steep-slopes',
    title: 'Steep Slopes & Escarpments',
    severity: 'HIGH CAUTION',
    indicators:
      'Crater walls, canyon scarps (Valles Marineris), and layered Mount Sharp flanks exceeding 15°–20° incline.',
    detectionDatasets: 'MOLA 463 m/px (regional) + HiRISE 1 m/px stereo DTMs (local verification required).',
    mitigationNotes:
      'Limit unassisted EVA traverses to slopes below 15°; verify local contour gradients using HiRISE stereo terrain models prior to route commitment.',
  },
  {
    id: 'large-rocks',
    title: 'Boulder Fields & Impact Ejecta',
    severity: 'HIGH CAUTION',
    indicators:
      'High nighttime thermal inertia bright zones in THEMIS Night IR and dense rocky ejecta blankets around fresh craters.',
    detectionDatasets: 'THEMIS Nighttime IR (100 m/px) + HiRISE (0.3 m/px) + CTX (5 m/px).',
    mitigationNotes:
      'Cross-reference bright THEMIS Night IR signatures with CTX/HiRISE imagery to identify rock-strewn fields hazardous to suit boots and rover wheels.',
  },
  {
    id: 'craters-rims',
    title: 'Secondary Craters & Unstable Rims',
    severity: 'MODERATE CAUTION',
    indicators:
      'Clustered secondary impact craters and unconsolidated rim talus prone to downslope slumping.',
    detectionDatasets: 'MRO CTX 5 m/px Global Mosaic & HiRISE targeted observations.',
    mitigationNotes:
      'Maintain standoff distance from sharp crater rims and route traverses across compacted intercrater plains.',
  },
  {
    id: 'uneven-sand',
    title: 'Loose Aeolian Sand & Dust Mantles',
    severity: 'MODERATE CAUTION',
    indicators:
      'Dark rippled dune fields (e.g., Bagnold Dunes) and low-thermal-inertia dust pockets capable of causing wheel sinkage.',
    detectionDatasets: 'THEMIS Nighttime IR dark zones + CTX / HiRISE dune ripple identification.',
    mitigationNotes:
      'Avoid traversing active dune crests; prefer exposed indurated bedrock benches documented in rover pathfinding.',
  },
];
