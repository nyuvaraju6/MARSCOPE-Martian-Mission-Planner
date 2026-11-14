import { ArrowRight, Compass, Map as MapIcon, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { MarsMapLayer, MarsRegion, MissionPlan, PageId } from '../types/mars';
import { calculateRouteDistanceKm } from '../utils/marsGeo';
import { SCIENTIFIC_DATASETS } from '../data/scientificDatasets';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
  activeRegion: MarsRegion;
  activeLayer: MarsMapLayer;
  activeMission: MissionPlan;
}

export function HomePage({
  onNavigate,
  activeRegion,
  activeLayer,
  activeMission,
}: HomePageProps) {
  const [heroError, setHeroError] = useState(false);
  const [geologyError, setGeologyError] = useState(false);
  const [traverseError, setTraverseError] = useState(false);

  const routeDistanceKm = calculateRouteDistanceKm(activeMission.waypoints);

  return (
    <div className="bg-white">
      {/* Editorial Hero Section */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 border-b border-[#D9DDE2]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-3">
                Explore Mars. Navigate Safely. Discover Beyond.
              </p>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#171717] leading-[1.12] mb-5"
                style={{ textWrap: 'balance' }}
              >
                INTERPLANETARY SURVIVAL GUIDE:
                <br />
                MARTIAN MAP
              </h1>
              <p className="text-base sm:text-lg text-[#374151] leading-relaxed max-w-2xl mb-6">
                An integrated scientific exploration platform for understanding the Martian surface
                and planning safer human exploration missions.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => onNavigate('explorer')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0057B8] text-white text-sm font-semibold uppercase tracking-wide hover:bg-[#004494] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057B8]"
                >
                  <span>START EXPLORING MARS</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('planner')}
                  className="inline-flex items-center gap-2 px-5 py-3 border border-[#D9DDE2] bg-white text-[#171717] text-sm font-semibold uppercase tracking-wide hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                >
                  <span>OPEN MISSION PLANNER</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('intelligence')}
                  className="inline-flex items-center gap-2 px-5 py-3 border border-[#0057B8] bg-white text-[#0057B8] text-sm font-semibold uppercase tracking-wide hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                >
                  <span>MISSION INTELLIGENCE</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('ai-assistant')}
                  className="inline-flex items-center gap-2 px-5 py-3 border border-[#D9DDE2] bg-[#F3F4F6] text-[#171717] text-sm font-semibold uppercase tracking-wide hover:border-[#0057B8] hover:text-[#0057B8] transition-colors cursor-pointer"
                >
                  <span>MARS AI ASSISTANT</span>
                </button>
              </div>
            </div>

            <div className="pt-5 border-t border-[#D9DDE2] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[#4B5563] uppercase tracking-wider mb-1">Active Region</p>
                <p className="font-semibold text-[#171717]">{activeRegion.name}</p>
              </div>
              <div>
                <p className="text-[#4B5563] uppercase tracking-wider mb-1">Map Datasets</p>
                <p className="font-semibold text-[#171717] font-mono tabular-nums">
                  {SCIENTIFIC_DATASETS.length} Cataloged
                </p>
              </div>
              <div>
                <p className="text-[#4B5563] uppercase tracking-wider mb-1">Sample Traverse</p>
                <p className="font-semibold text-[#171717] font-mono tabular-nums">
                  {routeDistanceKm.toFixed(2)} km
                </p>
              </div>
              <div>
                <p className="text-[#4B5563] uppercase tracking-wider mb-1">Planetary Radius</p>
                <p className="font-semibold text-[#171717] font-mono tabular-nums">3,389.5 km</p>
              </div>
            </div>
          </div>

          {/* Large High-Quality Mars Landscape Image */}
          <div className="lg:col-span-6 flex flex-col">
            <figure className="border border-[#D9DDE2] bg-[#F3F4F6] flex-1 flex flex-col">
              <div className="relative flex-1 min-h-[280px] lg:min-h-[380px] overflow-hidden bg-[#E5E7EB]">
                {!heroError ? (
                  <img
                    src="/src/assets/images/mars_hero_landscape_1794670568539.jpg"
                    alt="Layered sedimentary formations of Mount Sharp inside Gale Crater on Mars"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#F3F4F6]">
                    <Compass className="w-10 h-10 text-[#0057B8] mb-3" />
                    <p className="text-sm font-semibold text-[#171717]">
                      Gale Crater & Mount Sharp Terrain Reference
                    </p>
                  </div>
                )}
              </div>
              <figcaption className="px-4 py-3 bg-white border-t border-[#D9DDE2] text-xs text-[#4B5563]">
                <span className="font-semibold text-[#171717]">
                  Fig. 1 — Gale Crater & Aeolis Mons (Mount Sharp):
                </span>{' '}
                Layered sedimentary strata and basaltic sand fields representing primary science
                targets and mobility constraints for surface exploration.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Scientific Context & Introduction */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-[#D9DDE2]">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
            Scientific Background
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] max-w-3xl">
            Integrating Decades of Robotic Mars Reconnaissance for Future Human Missions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="border border-[#D9DDE2] p-5 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
              1. Surface Challenge
            </p>
            <h3 className="text-base font-bold text-[#171717] mb-2">
              Why Human Exploration Is Challenging
            </h3>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Mars presents extreme diurnal temperature swings, unshielded cosmic and solar
              radiation, steep impact crater slopes, loose wind-blown sand traps, and communication
              delays up to 22 minutes one way.
            </p>
          </div>

          <div className="border border-[#D9DDE2] p-5 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
              2. Robotic Heritage
            </p>
            <h3 className="text-base font-bold text-[#171717] mb-2">
              Importance of NASA Mission Data
            </h3>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Orbiters and rovers—including MGS MOLA, Mars Odyssey THEMIS, MRO HiRISE/CTX/CRISM,
              Mars Express HRSC, Curiosity, and Perseverance—have mapped elevation, thermal inertia,
              and surface mineralogy.
            </p>
          </div>

          <div className="border border-[#D9DDE2] p-5 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
              3. Multi-Layer Fusion
            </p>
            <h3 className="text-base font-bold text-[#171717] mb-2">
              Combining Datasets for Astronauts
            </h3>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              No single instrument tells the complete story. Pairing regional elevation (MOLA) with
              nighttime thermal rock-abundance maps (THEMIS) and optical mosaics (CTX) reveals both
              scientific value and terrain hazards.
            </p>
          </div>

          <div className="border border-[#D9DDE2] p-5 bg-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
              4. Surface Excursions
            </p>
            <h3 className="text-base font-bold text-[#171717] mb-2">
              How MARSCOPE Supports Planning
            </h3>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              MARSCOPE unifies live NASA Mars Trek and USGS planetary map layers with spherical
              Mars route calculation, configurable EVA walking-speed estimates, and explicit safety
              limitation reporting.
            </p>
          </div>
        </div>
      </section>

      {/* Three Prominent Feature Sections */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-[#D9DDE2]">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
            Core Capabilities
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#171717]">
            Platform Modules
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 01 */}
          <article className="border border-[#D9DDE2] bg-white flex flex-col">
            <div className="aspect-[4/3] bg-[#F3F4F6] border-b border-[#D9DDE2] overflow-hidden">
              {!geologyError ? (
                <img
                  src="/src/assets/images/mars_geology_outcrop_1794670568734.jpg"
                  alt="Stratified Martian sedimentary rock outcrop"
                  referrerPolicy="no-referrer"
                  onError={() => setGeologyError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6">
                  <MapIcon className="w-10 h-10 text-[#0057B8]" />
                </div>
              )}
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
                  01 – EXPLORE MARTIAN TERRAIN
                </p>
                <h3 className="text-xl font-bold text-[#171717] mb-3">
                  Interactive Orbital Layer Mapping
                </h3>
                <p className="text-sm text-[#4B5563] leading-relaxed mb-5">
                  Explore surface imagery, elevation, geological formations, and terrain conditions
                  across live NASA Mars Trek, USGS Astrogeology, and Caltech CTX datasets.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('explorer')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0057B8] hover:underline cursor-pointer"
              >
                <span>Open Interactive Mars Explorer</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </article>

          {/* 02 */}
          <article className="border border-[#D9DDE2] bg-white flex flex-col">
            <div className="aspect-[4/3] bg-[#F3F4F6] border-b border-[#D9DDE2] overflow-hidden">
              {!traverseError ? (
                <img
                  src="/src/assets/images/mars_traverse_tracks_1794670569704.jpg"
                  alt="Rover wheel tracks traversing Martian regolith toward distant crater ridges"
                  referrerPolicy="no-referrer"
                  onError={() => setTraverseError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6">
                  <Compass className="w-10 h-10 text-[#0057B8]" />
                </div>
              )}
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
                  02 – PLAN SCIENTIFIC MISSIONS
                </p>
                <h3 className="text-xl font-bold text-[#171717] mb-3">
                  Waypoint & Traverse Engineering
                </h3>
                <p className="text-sm text-[#4B5563] leading-relaxed mb-5">
                  Identify research targets, create exploration routes, calculate Martian surface
                  distances, and save demonstration traverse plans locally.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0057B8] hover:underline cursor-pointer"
              >
                <span>Open Mission Planner</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </article>

          {/* 03 */}
          <article className="border border-[#D9DDE2] bg-white flex flex-col">
            <div className="aspect-[4/3] bg-[#F3F4F6] border-b border-[#D9DDE2] p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#F47721]">
                  ENVIRONMENTAL & MOBILITY BRIEF
                </span>
                <ShieldAlert className="w-5 h-5 text-[#F47721]" aria-hidden="true" />
              </div>
              <div className="space-y-3 my-auto">
                <div className="border border-[#D9DDE2] bg-white p-3">
                  <p className="text-xs text-[#4B5563]">
                    Surface Radiation (MSL RAD · Hassler et al., 2014)
                  </p>
                  <p className="text-base font-bold text-[#171717] font-mono tabular-nums">
                    ~0.64 mSv/day
                  </p>
                </div>
                <div className="border border-[#D9DDE2] bg-white p-3">
                  <p className="text-xs text-[#4B5563]">
                    Elysium Planitia Diurnal Range (InSight · Oct 2020)
                  </p>
                  <p className="text-base font-bold text-[#171717] font-mono tabular-nums">
                    -96.9°C to -15.9°C
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#4B5563]">
                Historical robotic measurements · Real-time crew telemetry not connected
              </p>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
                  03 – UNDERSTAND ASTRONAUT SAFETY
                </p>
                <h3 className="text-xl font-bold text-[#171717] mb-3">
                  Hazards, Radiation & Thermal Limits
                </h3>
                <p className="text-sm text-[#4B5563] leading-relaxed mb-5">
                  Examine potential terrain hazards, diurnal thermal extremes, surface radiation
                  context, and EVA mobility constraints before planning an excursion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('safety')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0057B8] hover:underline cursor-pointer"
              >
                <span>Open Astronaut Safety Center</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* Mission Overview Dashboard Summary */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#D9DDE2]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1">
                Mission Dashboard Overview
              </p>
              <h2 className="text-xl font-bold text-[#171717]">
                Current Exploration Workspace State
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('explorer')}
              className="px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] cursor-pointer self-start sm:self-auto"
            >
              START EXPLORING MARS
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
            <div className="bg-white border border-[#D9DDE2] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                Selected Martian Region
              </p>
              <p className="text-sm font-bold text-[#171717]">{activeRegion.name}</p>
              <p className="text-xs text-[#4B5563] mt-1">{activeRegion.quadrangle}</p>
            </div>

            <div className="bg-white border border-[#D9DDE2] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                Current Map Layer
              </p>
              <p className="text-sm font-bold text-[#171717]">{activeLayer.shortLabel}</p>
              <p className="text-xs text-[#4B5563] mt-1">{activeLayer.missionSource}</p>
            </div>

            <div className="bg-white border border-[#D9DDE2] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                Active Mission Route
              </p>
              <p className="text-sm font-bold text-[#171717] truncate">{activeMission.name}</p>
              <p className="text-xs text-[#4B5563] mt-1 font-mono tabular-nums">
                {activeMission.waypoints.length} waypoints · {routeDistanceKm.toFixed(2)} km
              </p>
            </div>

            <div className="bg-white border border-[#D9DDE2] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                Safety Analysis Status
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-[#F47721] mt-1">
                DEMONSTRATION DATA · NOT CREW CERTIFIED
              </p>
              <p className="text-xs text-[#4B5563] mt-1">
                Requires local HiRISE slope verification
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
