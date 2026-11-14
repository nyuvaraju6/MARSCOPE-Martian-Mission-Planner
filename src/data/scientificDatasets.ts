import type { ScientificDataset } from '../types/mars';

export const SCIENTIFIC_DATASETS: ScientificDataset[] = [
  // OPTICAL DATA
  {
    id: 'hirise-optical',
    category: 'OPTICAL DATA',
    name: 'HiRISE High-Resolution Orbital Imagery',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'High Resolution Imaging Science Experiment (HiRISE)',
    scientificPurpose:
      'Identifies meter-scale boulders, steep scarps, dune ripples, and layered sedimentary outcrops essential for landing site safety and traverse engineering.',
    dataType: 'Optical RGB / Red-Channel GeoTIFF & JP2 (~0.25–0.30 m/pixel)',
    coverage: 'Targeted regional strips (~4–5% of Martian surface)',
    sourceUrl: 'https://www.uahirise.org/catalog/',
    sourceName: 'University of Arizona / NASA PDS HiRISE',
    availabilityStatus: 'PUBLIC ARCHIVE',
  },
  {
    id: 'ctx-optical',
    category: 'OPTICAL DATA',
    name: 'MRO Context Camera (CTX) Global Mosaic',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'Context Camera (CTX)',
    scientificPurpose:
      'Provides continuous 5 m/pixel panchromatic surface imagery bridging regional topography and targeted HiRISE strips across crater rims and valley networks.',
    dataType: 'XYZ Raster Tile Mosaic (5 m/pixel)',
    coverage: 'Near-global (>99% between ±88° latitude)',
    sourceUrl: 'https://murray-lab.caltech.edu/CTX/',
    sourceName: 'Caltech Murray Lab / NASA JPL',
    availabilityStatus: 'DIRECT MAP LAYER',
  },
  {
    id: 'viking-mdim21',
    category: 'OPTICAL DATA',
    name: 'Viking Orbiter MDIM 2.1 Color Global Mosaic',
    mission: 'Viking Orbiters 1 & 2',
    instrument: 'Visual Imaging Subsystem (VIS)',
    scientificPurpose:
      'Establishes the foundational geodetic true-color global mosaic for regional albedo features and planetary nomenclature reference.',
    dataType: 'WMTS Tile Layer (232 m/pixel)',
    coverage: 'Global (100%)',
    sourceUrl: 'https://trek.nasa.gov/mars/',
    sourceName: 'NASA Mars Trek / USGS Astrogeology',
    availabilityStatus: 'DIRECT MAP LAYER',
  },

  // THERMAL DATA
  {
    id: 'themis-day-ir',
    category: 'THERMAL DATA',
    name: 'THEMIS Daytime Infrared Controlled Mosaic (Oct 2018)',
    mission: '2001 Mars Odyssey',
    instrument: 'Thermal Emission Imaging System (THEMIS)',
    scientificPurpose:
      'Maps daytime 12.57 µm infrared brightness variations to reveal topographic shading, surface albedo contrasts, and solar heating patterns.',
    dataType: 'WMTS Tile Layer (100 m/pixel · NASA Mars Trek)',
    coverage: 'Controlled equatorial & mid-latitude mosaic',
    sourceUrl: 'https://astrogeology.usgs.gov/search/map/Mars/Odyssey/THEMIS-IR-Mosaic-Global',
    sourceName: 'NASA Mars Trek / USGS Astrogeology / ASU',
    availabilityStatus: 'DIRECT MAP LAYER',
  },
  {
    id: 'themis-night-ir',
    category: 'THERMAL DATA',
    name: 'THEMIS Nighttime Infrared Controlled Mosaic (Oct 2018)',
    mission: '2001 Mars Odyssey',
    instrument: 'Thermal Emission Imaging System (THEMIS)',
    scientificPurpose:
      'Isolates surface thermal inertia: exposed bedrock and rocky ejecta retain heat longer into the Martian night than fine, loose dust.',
    dataType: 'WMTS Tile Layer (100 m/pixel · NASA Mars Trek)',
    coverage: 'Controlled partial global coverage (mid-latitudes)',
    sourceUrl: 'https://themis.asu.edu/',
    sourceName: 'NASA Mars Trek / ASU THEMIS / USGS',
    availabilityStatus: 'DIRECT MAP LAYER',
  },

  // TOPOGRAPHIC DATA
  {
    id: 'mola-hrsc-blend',
    category: 'TOPOGRAPHIC DATA',
    name: 'MOLA & HRSC Blended Digital Elevation & Hillshade',
    mission: 'Mars Global Surveyor & ESA Mars Express',
    instrument: 'MOLA Laser Altimeter + HRSC Stereo Camera',
    scientificPurpose:
      'Combines global laser altimetry accuracy with stereo photogrammetry to visualize basin depths, volcanic heights, and regional drainage networks.',
    dataType: 'WMTS Colorized Shaded Relief (200 m/pixel)',
    coverage: 'Global',
    sourceUrl: 'https://trek.nasa.gov/mars/',
    sourceName: 'NASA Mars Trek / ESA Mars Express',
    availabilityStatus: 'DIRECT MAP LAYER',
  },
  {
    id: 'mola-global-dem',
    category: 'TOPOGRAPHIC DATA',
    name: 'MGS MOLA Global Color Shaded Relief & MEGDR',
    mission: 'Mars Global Surveyor (MGS)',
    instrument: 'Mars Orbiter Laser Altimeter (MOLA)',
    scientificPurpose:
      'Provides calibrated planetary elevation reference relative to the Martian equipotential surface (geoid/areoid) for regional slope planning.',
    dataType: 'WMTS Shaded Relief & PDS MEGDR Gridded DEM (463 m/pixel)',
    coverage: 'Global (100%)',
    sourceUrl: 'https://pds-geosciences.wustl.edu/missions/mgs/mola.html',
    sourceName: 'NASA PDS Geosciences Node',
    availabilityStatus: 'DIRECT MAP LAYER',
  },

  // SPECTRAL DATA
  {
    id: 'crism-spectral',
    category: 'SPECTRAL DATA',
    name: 'CRISM Hyperspectral Mineralogical Observations',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'Compact Reconnaissance Imaging Spectrometer for Mars (CRISM)',
    scientificPurpose:
      'Detects phyllosilicates (clays), sulfates, carbonates, and hydrated silica minerals indicating past liquid water environments and ISRU potential.',
    dataType: 'VNIR / IR Hyperspectral Cubes & Browse Products (18–200 m/pixel)',
    coverage: 'Targeted science sites & multispectral mapping strips',
    sourceUrl: 'https://pds-geosciences.wustl.edu/missions/mro/crism.htm',
    sourceName: 'NASA PDS / JHU APL CRISM Team',
    availabilityStatus: 'PUBLIC ARCHIVE',
  },

  // GEOLOGICAL DATA
  {
    id: 'usgs-sim-3292',
    category: 'GEOLOGICAL DATA',
    name: 'Geologic Map of Mars (USGS SIM 3292)',
    mission: 'USGS / NASA Planetary Geologic Mapping Program',
    instrument: 'Synthesized MOLA, THEMIS, and Viking Stratigraphy',
    scientificPurpose:
      'Classifies 44 global geological units across Noachian, Hesperian, and Amazonian epochs, mapping volcanic, impact, tectonic, and polar formations.',
    dataType: 'WMTS Cartographic Overlay & GIS Shapefile (1:20,000,000)',
    coverage: 'Global (100%)',
    sourceUrl: 'https://pubs.usgs.gov/sim/3292/',
    sourceName: 'USGS Astrogeology Science Center / NASA Mars Trek',
    availabilityStatus: 'DIRECT MAP LAYER',
  },

  // ATMOSPHERIC AND RADIATION DATA
  {
    id: 'insight-twins-weather',
    category: 'ATMOSPHERIC AND RADIATION DATA',
    name: 'InSight Elysium Planitia Meteorological Archive',
    mission: 'InSight Mars Lander',
    instrument: 'Auxiliary Payload Sensor Suite (APSS / TWINS)',
    scientificPurpose:
      'Provides high-cadence diurnal surface air temperature, barometric pressure, and horizontal wind speed measurements at an equatorial plain.',
    dataType: 'JSON Time-Series (Historical Sols 675–681 via api.nasa.gov)',
    coverage: 'Single landing site (4.5° N, 135.6° E · Archived Oct 2020)',
    sourceUrl: 'https://api.nasa.gov/',
    sourceName: 'NASA Open APIs / JPL InSight Archive',
    availabilityStatus: 'HISTORICAL API',
  },
  {
    id: 'msl-rad-radiation',
    category: 'ATMOSPHERIC AND RADIATION DATA',
    name: 'Curiosity RAD Surface Radiation Measurements',
    mission: 'Mars Science Laboratory (Curiosity)',
    instrument: 'Radiation Assessment Detector (RAD)',
    scientificPurpose:
      'Quantifies Galactic Cosmic Ray (GCR) and Solar Energetic Particle (SEP) absorbed dose and dose equivalent directly on the Martian surface.',
    dataType: 'PDS Time-Series & Peer-Reviewed Dose Rate Records',
    coverage: 'Gale Crater (5.4° S, 137.8° E · 2012–Present)',
    sourceUrl: 'https://pds-ppi.igpp.ucla.edu/mission/MSL',
    sourceName: 'NASA PDS Planetary Plasma Interactions / SwRI',
    availabilityStatus: 'PUBLIC ARCHIVE',
  },
];
