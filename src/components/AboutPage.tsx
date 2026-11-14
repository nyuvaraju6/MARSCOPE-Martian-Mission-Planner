import { ExternalLink } from 'lucide-react';
import type { PageId } from '../types/mars';

interface AboutPageProps {
  onNavigate: (page: PageId) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="pb-6 border-b border-[#D9DDE2]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1.5">
          2026 NASA Space Apps Challenge
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#171717]">
          About MARSCOPE
        </h1>
        <p className="text-sm text-[#4B5563] mt-1.5 max-w-3xl">
          Interplanetary Survival Guide: Martian Map — Explore Mars. Navigate Safely. Discover
          Beyond.
        </p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-5 text-sm text-[#374151] leading-relaxed">
          <div>
            <h2 className="text-lg font-bold text-[#171717] mb-2">Project Objective</h2>
            <p>
              MARSCOPE is designed for the 2026 NASA Space Apps Challenge to unify planetary
              reconnaissance datasets from robotic Mars orbiters and surface missions into a single
              human-centered exploration interface. By pairing topographic, thermal, optical, and
              geologic layers with spherical Mars route geometry and explicit safety limitation
              reporting, the platform helps planners evaluate scientific targets and surface
              constraints together.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#171717] mb-2">
              Scientific Credibility & Data Transparency
            </h2>
            <p>
              Human surface planning on Mars requires rigorous separation between verified data and
              planning assumptions. MARSCOPE never invents live weather or radiation measurements:
              thermal time-series are labeled <span className="font-semibold">HISTORICAL DATA</span>{' '}
              from NASA&apos;s InSight archive, radiation baselines cite peer-reviewed MSL RAD
              observations, and demonstration traverses around Gale Crater are explicitly marked{' '}
              <span className="font-semibold">DEMONSTRATION DATA</span> and uncertified for crew
              traverse without local HiRISE stereo slope verification.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#171717] mb-2">
              Technical Architecture & Cloud Readiness
            </h2>
            <p>
              Built with React, TypeScript, Vite, Tailwind CSS, Leaflet (using Martian
              Equirectangular projection <code className="font-mono text-xs">EPSG:4326</code>),
              Recharts, and a Node.js/Express backend proxy that keeps{' '}
              <code className="font-mono text-xs">NASA_API_KEY</code> credentials on the server.
              Saved demonstration missions use browser <code className="font-mono text-xs">localStorage</code>{' '}
              through a modular persistence layer ready to connect to Google Cloud storage in
              subsequent phases.
            </p>
          </div>
        </div>

        <aside className="lg:col-span-5 space-y-5">
          <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717] mb-3">
              NASA & Partner Dataset Attribution
            </h2>
            <ul className="space-y-2.5 text-xs text-[#374151]">
              <li>
                <a
                  href="https://trek.nasa.gov/mars/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#0057B8] hover:underline inline-flex items-center gap-1"
                >
                  <span>NASA Solar System Treks — Mars Trek</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
                <p className="text-[#4B5563]">
                  MOLA + HRSC Blended Hillshade (200 m/px), MOLA Color Shaded Relief (463 m/px),
                  Viking MDIM 2.1 Color Mosaic, USGS SIM 3292 WMTS, and Catalog Index API.
                </p>
              </li>
              <li>
                <a
                  href="https://astrogeology.usgs.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#0057B8] hover:underline inline-flex items-center gap-1"
                >
                  <span>USGS Astrogeology Science Center</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
                <p className="text-[#4B5563]">
                  Mars Odyssey THEMIS Daytime IR & Nighttime IR WMS layers and SIM 3292 Global
                  Geologic Map of Mars (Tanaka et al., 2014).
                </p>
              </li>
              <li>
                <a
                  href="https://murray-lab.caltech.edu/CTX/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#0057B8] hover:underline inline-flex items-center gap-1"
                >
                  <span>The Murray Lab (Caltech) / NASA JPL MRO CTX</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
                <p className="text-[#4B5563]">Global 5 m/pixel MRO Context Camera Mosaic.</p>
              </li>
              <li>
                <a
                  href="https://pds.nasa.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#0057B8] hover:underline inline-flex items-center gap-1"
                >
                  <span>NASA Planetary Data System (PDS) & Open APIs</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
                <p className="text-[#4B5563]">
                  HiRISE, CRISM, MSL RAD surface radiation archive, and InSight meteorological API.
                </p>
              </li>
            </ul>
          </div>

          <div className="border border-[#D9DDE2] bg-white p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#171717] mb-3">
              Local Setup & Environment Configuration
            </h2>
            <ol className="list-decimal pl-4 space-y-1.5 text-xs text-[#4B5563]">
              <li>
                Install dependencies: <code className="font-mono text-[#171717]">npm install</code>
              </li>
              <li>
                Optionally set <code className="font-mono text-[#171717]">NASA_API_KEY</code> in{' '}
                <code className="font-mono text-[#171717]">.env</code> (defaults to{' '}
                <code className="font-mono text-[#171717]">DEMO_KEY</code> on the Express backend).
              </li>
              <li>
                Run development server: <code className="font-mono text-[#171717]">npm run dev</code>
              </li>
              <li>
                Build production bundle: <code className="font-mono text-[#171717]">npm run build</code>
              </li>
            </ol>
            <div className="mt-4 pt-3 border-t border-[#D9DDE2]">
              <button
                type="button"
                onClick={() => onNavigate('explorer')}
                className="px-4 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] cursor-pointer"
              >
                Launch Interactive Mars Explorer
              </button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
