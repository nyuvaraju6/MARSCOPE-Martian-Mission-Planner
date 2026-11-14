import { ExternalLink, Search } from 'lucide-react';
import { useState } from 'react';
import { SCIENTIFIC_DATASETS } from '../data/scientificDatasets';
import type { DatasetCategory, MarsLayerCategory, PageId } from '../types/mars';

interface ScientificDataPageProps {
  onOpenLayerInExplorer: (layerId: MarsLayerCategory) => void;
  onNavigate: (page: PageId) => void;
}

const CATEGORIES: Array<'ALL' | DatasetCategory> = [
  'ALL',
  'OPTICAL DATA',
  'THERMAL DATA',
  'TOPOGRAPHIC DATA',
  'SPECTRAL DATA',
  'GEOLOGICAL DATA',
  'ATMOSPHERIC AND RADIATION DATA',
];

const DATASET_TO_LAYER: Record<string, MarsLayerCategory> = {
  'hirise-optical': 'hirise',
  'ctx-optical': 'surface_ctx',
  'viking-mdim21': 'surface_viking',
  'themis-day-ir': 'thermal_day',
  'themis-night-ir': 'thermal_night',
  'mola-hrsc-blend': 'terrain',
  'mola-global-dem': 'slope_elevation',
  'usgs-sim-3292': 'geology',
};

export function ScientificDataPage({
  onOpenLayerInExplorer,
  onNavigate,
}: ScientificDataPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | DatasetCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDatasets = SCIENTIFIC_DATASETS.filter((ds) => {
    const matchesCat = selectedCategory === 'ALL' || ds.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      ds.name.toLowerCase().includes(q) ||
      ds.mission.toLowerCase().includes(q) ||
      ds.instrument.toLowerCase().includes(q) ||
      ds.scientificPurpose.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="pb-6 mb-6 border-b border-[#D9DDE2]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8] mb-1.5">
          NASA & USGS Planetary Archives
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#171717]">
          Scientific Data Center
        </h1>
        <p className="text-sm text-[#4B5563] mt-1.5 max-w-3xl">
          Catalog of orbital and surface Mars mission datasets integrated into MARSCOPE, detailing
          scientific purpose, coverage limits, and direct official NASA/USGS archive links.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dataset categories">
          {CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0057B8] text-white border-[#0057B8]'
                    : 'bg-white text-[#374151] border-[#D9DDE2] hover:bg-[#F3F4F6]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72 shrink-0">
          <Search
            className="w-4 h-4 text-[#4B5563] absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Filter scientific datasets"
            placeholder="Filter by mission or instrument..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-[#D9DDE2] pl-9 pr-3 py-2 text-sm text-[#171717] bg-white"
          />
        </div>
      </div>

      {/* Dataset Catalog */}
      {filteredDatasets.length === 0 ? (
        <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-8 text-center">
          <p className="text-sm font-semibold text-[#171717] mb-1">
            No matching NASA datasets found
          </p>
          <p className="text-xs text-[#4B5563]">
            Clear your search filter or select ALL categories to view all cataloged instruments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDatasets.map((ds) => {
            const linkedLayerId = DATASET_TO_LAYER[ds.id];
            return (
              <article key={ds.id} className="border border-[#D9DDE2] bg-white p-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[#0057B8]">
                      {ds.category}
                    </span>
                    <span
                      className={`font-semibold uppercase tracking-wide ${
                        ds.availabilityStatus === 'DIRECT MAP LAYER'
                          ? 'text-[#0057B8]'
                          : 'text-[#F47721]'
                      }`}
                    >
                      {ds.availabilityStatus}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-[#171717] mb-3">{ds.name}</h2>

                  <dl className="space-y-2 text-xs border-t border-[#D9DDE2] pt-3 mb-4">
                    <div>
                      <dt className="font-semibold text-[#171717] inline">NASA / Partner Mission: </dt>
                      <dd className="text-[#4B5563] inline">{ds.mission}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#171717] inline">Instrument: </dt>
                      <dd className="text-[#4B5563] inline">{ds.instrument}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#171717] inline">Scientific Purpose: </dt>
                      <dd className="text-[#4B5563] inline leading-relaxed">{ds.scientificPurpose}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#171717] inline">Data Type: </dt>
                      <dd className="text-[#4B5563] inline font-mono">{ds.dataType}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#171717] inline">Available Coverage: </dt>
                      <dd className="text-[#4B5563] inline">{ds.coverage}</dd>
                    </div>
                  </dl>
                </div>

                <div className="pt-4 border-t border-[#D9DDE2] flex flex-wrap items-center justify-between gap-3">
                  <a
                    href={ds.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0057B8] hover:underline"
                  >
                    <span>Source: {ds.sourceName}</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>

                  {linkedLayerId ? (
                    <button
                      type="button"
                      onClick={() => onOpenLayerInExplorer(linkedLayerId)}
                      className="px-3 py-1.5 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] cursor-pointer"
                    >
                      Inspect Map Layer
                    </button>
                  ) : ds.id === 'msl-rad-radiation' || ds.id === 'insight-twins-weather' ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('safety')}
                      className="px-3 py-1.5 border border-[#D9DDE2] bg-white text-[#171717] text-xs font-semibold uppercase tracking-wide hover:bg-[#F3F4F6] cursor-pointer"
                    >
                      View in Safety Center
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
