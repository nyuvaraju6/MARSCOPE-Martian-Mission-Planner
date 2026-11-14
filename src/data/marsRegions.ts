import type { MarsRegion } from '../types/mars';

export const MARS_REGIONS: MarsRegion[] = [
  {
    id: 'gale-crater',
    name: 'Gale Crater (Mount Sharp)',
    quadrangle: 'Aeolis Quadrangle (MC-23)',
    lat: -4.59,
    lng: 137.44,
    zoom: 7,
    elevationSummary: '-4,500 m crater floor to +5,500 m Aeolis Mons peak',
    missionHistory: 'Curiosity Rover (MSL) — Landed August 2012 (Active)',
    scientificInterest:
      '5.5 km central stratified peak preserving clay-to-sulfate mineral transitions indicative of ancient lakes and climate shift.',
    terrainNotice:
      'Steep gullied flanks on Mount Sharp and dark active basaltic sand fields (Bagnold Dunes) constrain traverse corridors.',
  },
  {
    id: 'jezero-crater',
    name: 'Jezero Crater',
    quadrangle: 'Syrtis Major Quadrangle (MC-13)',
    lat: 18.38,
    lng: 77.58,
    zoom: 7,
    elevationSummary: '-2,569 m landing ellipse floor',
    missionHistory: 'Perseverance Rover & Ingenuity Helicopter (Mars 2020) — Active',
    scientificInterest:
      'Ancient river delta fan deposits, lacustrine carbonates, and potential biosignature preservation targets.',
    terrainNotice:
      'Sharp fractured bedrock outcrops, delta scarp cliffs, and dune ripples require local high-resolution slope checks.',
  },
  {
    id: 'elysium-planitia',
    name: 'Elysium Planitia (InSight)',
    quadrangle: 'Elysium Quadrangle (MC-15)',
    lat: 4.5,
    lng: 135.62,
    zoom: 6,
    elevationSummary: '-2,655 m volcanic plains',
    missionHistory: 'InSight Lander (2018–2022) · Viking / Odyssey Context',
    scientificInterest:
      'Smooth equatorial volcanic plain ideal for seismic monitoring, thermal flux measurements, and baseline meteorological archives.',
    terrainNotice:
      'Relatively flat terrain with sparse boulders and shallow impact craters, though fine dust cover reduces thermal inertia.',
  },
  {
    id: 'valles-marineris',
    name: 'Valles Marineris (Coprates Chasma)',
    quadrangle: 'Coprates Quadrangle (MC-18)',
    lat: -13.9,
    lng: -59.2,
    zoom: 5,
    elevationSummary: 'Up to 7,000 m canyon depth below surrounding plateau',
    missionHistory: 'Orbital Survey Only (MRO, Mars Express, Odyssey, MGS)',
    scientificInterest:
      'Exposes kilometers of layered Martian crust, tectonic fault scarps, and seasonal slope streak phenomena.',
    terrainNotice:
      'Extreme cliff gradients (>30°), massive landslide aprons, and shadowed canyon floors pose severe traverse hazards.',
  },
  {
    id: 'olympus-mons',
    name: 'Olympus Mons',
    quadrangle: 'Amazonis / Tharsis (MC-08 / MC-09)',
    lat: 18.65,
    lng: -133.8,
    zoom: 5,
    elevationSummary: '+21,229 m above Martian datum',
    missionHistory: 'Orbital Reconnaissance Only (Viking, MGS, MRO, HRSC)',
    scientificInterest:
      'Largest shield volcano in the Solar System; basal scarp up to 8 km high and nested summit calderas.',
    terrainNotice:
      'High-elevation thin atmosphere reduces aerobraking and increases radiation exposure; basal escarpment blocks direct surface ascent.',
  },
  {
    id: 'hellas-planitia',
    name: 'Hellas Planitia',
    quadrangle: 'Hellas Quadrangle (MC-28)',
    lat: -42.4,
    lng: 70.5,
    zoom: 5,
    elevationSummary: '-7,152 m basin floor (highest surface pressure on Mars)',
    missionHistory: 'Orbital Reconnaissance Only (MRO, Mars Express, Odyssey)',
    scientificInterest:
      '2,300 km impact basin hosting higher atmospheric pressure (~1,155 Pa) and ancient glacial/lacustrine landforms.',
    terrainNotice:
      'Seasonal dust storm activity and southern winter CO2 frost accumulation impact thermal and visibility conditions.',
  },
];
