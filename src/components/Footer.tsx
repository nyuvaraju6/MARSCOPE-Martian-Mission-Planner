import type { PageId } from '../types/mars';

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-[#F3F4F6] border-t border-[#D9DDE2] mt-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-[#D9DDE2]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-2">
              MARSCOPE Project
            </p>
            <h2 className="text-base font-bold text-[#171717] mb-2">
              Interplanetary Survival Guide: Martian Map
            </h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Developed for the 2026 NASA Space Apps Challenge. Combines public NASA, JPL, Caltech,
              and USGS Astrogeology planetary datasets into an integrated exploration and safety
              reference portal.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-3">
              Platform Sections
            </p>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="text-[#374151] hover:text-[#0057B8] hover:underline cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('explorer')}
                  className="text-[#374151] hover:text-[#0057B8] hover:underline cursor-pointer"
                >
                  Mars Explorer
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('planner')}
                  className="text-[#374151] hover:text-[#0057B8] hover:underline cursor-pointer"
                >
                  Mission Planner
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('intelligence')}
                  className="text-[#374151] hover:text-[#0057B8] hover:underline cursor-pointer"
                >
                  Mission Intelligence
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('ai-assistant')}
                  className="text-[#374151] hover:text-[#0057B8] hover:underline cursor-pointer"
                >
                  Mars AI Assistant
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('data')}
                  className="text-[#374151] hover:text-[#0057B8] hover:underline cursor-pointer"
                >
                  Scientific Data
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('safety')}
                  className="text-[#374151] hover:text-[#0057B8] hover:underline cursor-pointer"
                >
                  Astronaut Safety
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="text-[#374151] hover:text-[#0057B8] hover:underline cursor-pointer"
                >
                  About Project
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-3">
              Verified Public Data Sources
            </p>
            <ul className="space-y-1.5 text-sm text-[#4B5563]">
              <li>
                <a
                  href="https://trek.nasa.gov/mars/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0057B8] hover:underline"
                >
                  NASA Mars Trek (trek.nasa.gov)
                </a>
              </li>
              <li>
                <a
                  href="https://astrogeology.usgs.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0057B8] hover:underline"
                >
                  USGS Astrogeology Science Center
                </a>
              </li>
              <li>
                <a
                  href="https://pds.nasa.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0057B8] hover:underline"
                >
                  NASA Planetary Data System (PDS)
                </a>
              </li>
              <li>
                <a
                  href="https://api.nasa.gov/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0057B8] hover:underline"
                >
                  NASA Open APIs (api.nasa.gov)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#4B5563]">
          <p>
            Data attribution: NASA / JPL-Caltech / USGS Astrogeology / Arizona State University /
            University of Arizona / ESA Mars Express.
          </p>
          <p>
            Independent educational project for 2026 NASA Space Apps Challenge. Not an official NASA
            flight-certification tool.
          </p>
        </div>
      </div>
    </footer>
  );
}
