import { useEffect, useState } from 'react';
import { AboutPage } from './components/AboutPage';
import { AstronautSafetyPage } from './components/AstronautSafetyPage';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { MarsAiAssistantPage } from './components/MarsAiAssistantPage';
import { MarsExplorerPage } from './components/MarsExplorerPage';
import { MissionIntelligencePage } from './components/MissionIntelligencePage';
import { MissionPlannerPage } from './components/MissionPlannerPage';
import { ScientificDataPage } from './components/ScientificDataPage';
import { MARS_MAP_LAYERS } from './data/marsLayers';
import { MARS_REGIONS } from './data/marsRegions';
import type { MarsLayerCategory, MarsRegion, MissionPlan, PageId } from './types/mars';
import {
  DEFAULT_GALE_DEMO_MISSION,
  loadActiveMission,
  loadSavedMissions,
  saveActiveMissionId,
  saveMissionsList,
} from './utils/missionStorage';

function getInitialPage(): PageId {
  if (typeof window === 'undefined') return 'home';
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') return 'explorer';
  const pageParam = params.get('page');
  if (
    pageParam === 'home' ||
    pageParam === 'explorer' ||
    pageParam === 'planner' ||
    pageParam === 'intelligence' ||
    pageParam === 'ai-assistant' ||
    pageParam === 'data' ||
    pageParam === 'safety' ||
    pageParam === 'about'
  ) {
    return pageParam;
  }
  return 'home';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>(getInitialPage);
  const [selectedRegion, setSelectedRegion] = useState<MarsRegion>(MARS_REGIONS[0]);
  const [activeLayerId, setActiveLayerId] = useState<MarsLayerCategory>('terrain');
  const [savedMissions, setSavedMissions] = useState<MissionPlan[]>(() => loadSavedMissions());
  const [activeMission, setActiveMission] = useState<MissionPlan>(() =>
    loadActiveMission(loadSavedMissions())
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentPage]);

  const activeLayer =
    MARS_MAP_LAYERS.find((l) => l.id === activeLayerId) ?? MARS_MAP_LAYERS[0];

  const handleSaveMission = (mission: MissionPlan) => {
    saveActiveMissionId(mission.id);
    setSavedMissions((prev) => {
      const exists = prev.some((m) => m.id === mission.id);
      const next = exists
        ? prev.map((m) => (m.id === mission.id ? mission : m))
        : [mission, ...prev];
      saveMissionsList(next);
      return next;
    });
  };

  const handleSelectActiveMission = (mission: MissionPlan) => {
    saveActiveMissionId(mission.id);
    setActiveMission(mission);
  };

  const handleDeleteMission = (missionId: string) => {
    setSavedMissions((prev) => {
      const next = prev.filter((m) => m.id !== missionId);
      const ensured = next.length > 0 ? next : [DEFAULT_GALE_DEMO_MISSION];
      saveMissionsList(ensured);
      if (activeMission.id === missionId) {
        const fallback = ensured[0];
        saveActiveMissionId(fallback.id);
        setActiveMission(fallback);
      }
      return ensured;
    });
  };

  const handleResetDemoMission = () => {
    setSelectedRegion(MARS_REGIONS[0]);
    saveActiveMissionId(DEFAULT_GALE_DEMO_MISSION.id);
    setActiveMission(DEFAULT_GALE_DEMO_MISSION);
    handleSaveMission(DEFAULT_GALE_DEMO_MISSION);
  };

  const handleOpenLayerInExplorer = (layerId: MarsLayerCategory) => {
    setActiveLayerId(layerId);
    setCurrentPage('explorer');
  };

  const handleLoadSimulatedMission = (mission: MissionPlan, region: MarsRegion) => {
    setSelectedRegion(region);
    saveActiveMissionId(mission.id);
    setActiveMission(mission);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#171717]">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />

      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage
            onNavigate={setCurrentPage}
            activeRegion={selectedRegion}
            activeLayer={activeLayer}
            activeMission={activeMission}
          />
        )}

        {currentPage === 'explorer' && (
          <MarsExplorerPage
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            activeLayerId={activeLayerId}
            onSelectLayerId={setActiveLayerId}
            activeMission={activeMission}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'planner' && (
          <MissionPlannerPage
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            activeLayerId={activeLayerId}
            onSelectLayerId={setActiveLayerId}
            activeMission={activeMission}
            onChangeActiveMission={handleSelectActiveMission}
            savedMissions={savedMissions}
            onSaveMission={handleSaveMission}
            onDeleteMission={handleDeleteMission}
            onResetDemoMission={handleResetDemoMission}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'intelligence' && (
          <MissionIntelligencePage
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            activeLayerId={activeLayerId}
            activeMission={activeMission}
            onLoadSimulatedMission={handleLoadSimulatedMission}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'ai-assistant' && (
          <MarsAiAssistantPage
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            activeLayerId={activeLayerId}
            activeMission={activeMission}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'data' && (
          <ScientificDataPage
            onOpenLayerInExplorer={handleOpenLayerInExplorer}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'safety' && (
          <AstronautSafetyPage
            selectedRegion={selectedRegion}
            activeLayer={activeLayer}
            activeMission={activeMission}
            onNavigate={setCurrentPage}
          />
        )}

        {currentPage === 'about' && <AboutPage onNavigate={setCurrentPage} />}
      </main>

      <Footer onNavigate={setCurrentPage} />
    </div>
  );
}
