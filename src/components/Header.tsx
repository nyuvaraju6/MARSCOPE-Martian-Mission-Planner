import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { PageId } from '../types/mars';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const NAV_ITEMS: Array<{ id: PageId; label: string }> = [
  { id: 'home', label: 'HOME' },
  { id: 'explorer', label: 'MARS EXPLORER' },
  { id: 'planner', label: 'MISSION PLANNER' },
  { id: 'intelligence', label: 'MISSION INTELLIGENCE' },
  { id: 'ai-assistant', label: 'MARS AI ASSISTANT' },
  { id: 'data', label: 'SCIENTIFIC DATA' },
  { id: 'safety', label: 'ASTRONAUT SAFETY' },
  { id: 'about', label: 'ABOUT PROJECT' },
];

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (page: PageId) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="w-full bg-white border-b border-[#D9DDE2]">
      {/* Institutional Event Context Bar */}
      <div className="bg-[#F3F4F6] border-b border-[#D9DDE2] px-4 sm:px-6 lg:px-8 py-1.5">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563]">
          <span className="font-semibold tracking-wide text-[#0057B8] uppercase whitespace-nowrap">
            NASA Space Apps Challenge 2026
          </span>
          <span className="hidden sm:inline text-[#4B5563] whitespace-nowrap">
            Interplanetary Survival Guide: Martian Map · Explore Mars. Navigate Safely. Discover Beyond.
          </span>
        </div>
      </div>

      {/* Main 3-Zone Navigation Bar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Logo */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057B8] shrink-0"
          aria-label="MARSCOPE Home"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="14" cy="14" r="12" stroke="#0057B8" strokeWidth="2" />
            <circle cx="14" cy="14" r="5" stroke="#171717" strokeWidth="1.5" />
            <path d="M14 2V7M14 21V26M2 14H7M21 14H26" stroke="#F47721" strokeWidth="1.75" />
          </svg>
          <span className="text-lg font-bold tracking-tight text-[#171717] whitespace-nowrap">
            MARSCOPE
          </span>
        </button>

        {/* Zone 2: Desktop Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-3 xl:gap-4"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`py-2 text-[11px] xl:text-xs font-semibold tracking-wide whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057B8] ${
                  isActive
                    ? 'border-[#0057B8] text-[#0057B8]'
                    : 'border-transparent text-[#374151] hover:text-[#171717] hover:border-[#D9DDE2]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Mobile Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('explorer')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold tracking-wide uppercase bg-[#0057B8] text-white hover:bg-[#004494] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057B8]"
          >
            Explore Mars
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 border border-[#D9DDE2] text-[#171717] hover:bg-[#F3F4F6] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="lg:hidden border-t border-[#D9DDE2] bg-white px-4 py-3 space-y-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left px-3 py-2.5 text-sm font-semibold tracking-wide border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#F3F4F6] border-[#0057B8] text-[#0057B8]'
                    : 'border-transparent text-[#171717] hover:bg-[#F3F4F6]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleNav('explorer')}
              className="w-full py-2.5 px-4 text-xs font-semibold uppercase tracking-wide bg-[#0057B8] text-white hover:bg-[#004494] cursor-pointer"
            >
              Explore Mars
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
