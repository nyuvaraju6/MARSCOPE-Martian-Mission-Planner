import { Download, Printer, X } from 'lucide-react';
import { MSL_RAD_REFERENCE_RECORDS } from '../data/safetyReference';
import type {
  DatasetProvenanceRecord,
  GeologyPointRecord,
  InSightApiResponse,
  MarsMapLayer,
  MarsRegion,
  MissionPlan,
  MissionRecommendation,
  RouteRiskAssessment,
  RouteTerrainAnalysisResponse,
  TerrainProfileMetrics,
} from '../types/mars';
import { formatMarsCoords } from '../utils/marsGeo';

interface MissionReportModalProps {
  open: boolean;
  onClose: () => void;
  mission: MissionPlan;
  region: MarsRegion;
  activeLayer: MarsMapLayer;
  profileResponse: RouteTerrainAnalysisResponse | null;
  profileMetrics: TerrainProfileMetrics;
  riskAssessment: RouteRiskAssessment;
  insightData: InSightApiResponse | null;
  geologyRecord?: GeologyPointRecord | null;
  recommendations?: MissionRecommendation[];
  provenanceRecords?: DatasetProvenanceRecord[];
}

export function MissionReportModal({
  open,
  onClose,
  mission,
  region,
  activeLayer,
  profileResponse,
  profileMetrics,
  riskAssessment,
  insightData,
  geologyRecord = null,
  recommendations = [],
  provenanceRecords = [],
}: MissionReportModalProps) {
  if (!open) return null;

  const startWp = mission.waypoints[0] ?? null;
  const endWp =
    mission.waypoints.length > 1 ? mission.waypoints[mission.waypoints.length - 1] : null;
  const latestSol =
    insightData?.status === 'HISTORICAL DATA' && insightData.sols.length > 0
      ? insightData.sols[insightData.sols.length - 1]
      : null;

  const handleDownloadTextReport = () => {
    const lines = [
      'MARSCOPE V3 — INTELLIGENT MARTIAN MISSION TECHNICAL REPORT',
      `Document ID: MARSCOPE-DOC-V3-${mission.id.toUpperCase()}`,
      `Generated UTC: ${new Date().toISOString()}`,
      `Classification: ${
        mission.isDemonstration ? 'DEMONSTRATION DATA — NOT CREW CERTIFIED' : 'USER MISSION DRAFT'
      }`,
      '',
      '1. MISSION OVERVIEW',
      `   Mission Name: ${mission.name}`,
      `   Distance / Pace / Est. Duration: ${riskAssessment.totalDistanceKm.toFixed(
        2
      )} km | ${mission.walkingSpeedKmH.toFixed(1)} km/h | ${riskAssessment.estimatedHours.toFixed(
        2
      )} hrs`,
      `   Terrain Risk Status: ${riskAssessment.category}${
        riskAssessment.isPreliminary ? ' (PRELIMINARY ASSESSMENT)' : ''
      }`,
      '',
      '2. SCIENTIFIC OBJECTIVES',
      `   ${mission.scientificObjective}`,
      `   Logged Scientific Targets (${mission.scientificTargets.length}):`,
      ...(mission.scientificTargets.length > 0
        ? mission.scientificTargets.map(
            (t, idx) =>
              `   - T${idx + 1}: ${t.name} [${t.category}] (${formatMarsCoords(
                t.lat,
                t.lng,
                4
              )}) — ${t.description}`
          )
        : ['   - None recorded']),
      '',
      '3. SELECTED MARTIAN REGION',
      `   Region: ${region.name} (${region.quadrangle})`,
      `   Mission Heritage: ${region.missionHistory}`,
      ...(geologyRecord?.unitCode
        ? [
            `   USGS SIM 3292 Geologic Unit: ${geologyRecord.unitCode} (${geologyRecord.unitDescription})`,
          ]
        : []),
      '',
      '4. STARTING AND DESTINATION COORDINATES',
      `   Start: ${
        startWp ? `${formatMarsCoords(startWp.lat, startWp.lng, 4)} (${startWp.name})` : 'Not set'
      }`,
      `   Destination: ${
        endWp ? `${formatMarsCoords(endWp.lat, endWp.lng, 4)} (${endWp.name})` : 'Not set'
      }`,
      '',
      '5. EXPLORATION ROUTE',
      ...mission.waypoints.map(
        (wp, idx) => `   WP ${idx + 1}: ${wp.name} — ${formatMarsCoords(wp.lat, wp.lng, 4)}`
      ),
      '',
      '6. TERRAIN ANALYSIS',
      `   DEM Used: ${profileResponse?.demName ?? 'Unavailable'} (${
        profileResponse?.demResolution ?? 'N/A'
      })`,
      `   Highest / Lowest / Elevation Difference: ${
        profileMetrics.highestPointM ?? 'Unavailable'
      } m / ${profileMetrics.lowestPointM ?? 'Unavailable'} m / ${
        profileMetrics.elevationDifferenceM ?? 'Unavailable'
      } m`,
      `   Max Sampled Slope: ${profileMetrics.maxSlopeDeg ?? 'Unavailable'}°`,
      ...riskAssessment.riskFactors.map((r) => `   - ${r}`),
      '',
      '7. SCIENTIFIC DATASETS USED',
      `   - Primary Map Layer: ${activeLayer.name} (${activeLayer.missionSource}, ${activeLayer.resolution})`,
      ...(provenanceRecords.length > 0
        ? provenanceRecords.map(
            (p) =>
              `   - ${p.datasetName} [${p.availabilityStatus}] | ${p.spatialResolution} | Observed: ${p.observationDate}`
          )
        : [
            '   - MOLA+HRSC DEM (200 m/px & Gale 1 m/px), THEMIS Day/Night IR (100 m/px), MRO CTX (5 m/px), Targeted HiRISE, OMEGA/CRISM, USGS SIM 3292',
          ]),
      '',
      '8. ENVIRONMENTAL OBSERVATIONS',
      '   - Thermal Context: Mars Odyssey THEMIS Day/Night IR Controlled Mosaics (Oct 2018 release).',
      `   - Radiation Baseline (Curiosity RAD, Sol 0-300 / Aug 2012-Jun 2013): ~0.21 mGy/day absorbed; ~0.64 mSv/day dose equivalent.`,
      `   - Atmospheric Archive (InSight APSS): ${
        latestSol
          ? `HISTORICAL (Oct 2020 Sol ${latestSol.sol}): Min ${latestSol.tempMinC}°C, Avg ${latestSol.tempAvgC}°C, Max ${latestSol.tempMaxC}°C, Pressure ${latestSol.pressureAvgPa} Pa`
          : 'DATA NOT CONNECTED (InSight mission concluded Dec 2022)'
      }`,
      '',
      '9. POTENTIAL HAZARDS',
      ...(riskAssessment.obstacleAlerts.length > 0
        ? riskAssessment.obstacleAlerts.map((o) => `   - ${o}`)
        : ['   - Review boulder fields, dune ripples, and steep rim scarps on HiRISE 0.3 m/px imagery.']),
      '',
      '10. DATA LIMITATIONS',
      `   - ${riskAssessment.safetyDisclaimer}`,
      `   - ${profileResponse?.demCoverageNote ?? 'Global DEMs cannot resolve meter-scale boulders or narrow overhangs.'}`,
      '   - Live Martian weather and real-time solar particle (SEP) radiation feeds are NOT connected.',
      '',
      '11. RECOMMENDATIONS',
      ...(recommendations.length > 0
        ? recommendations.map(
            (rec, idx) =>
              `   ${idx + 1}. [${rec.severity}] ${rec.title} — ${rec.actionableStep}`
          )
        : [
            '   1. Verify every route leg with targeted HiRISE 0.25–0.30 m/px stereo DTMs before field approval.',
            '   2. Use THEMIS Nighttime IR bright bedrock benches to bypass dark loose sand fields.',
          ]),
      '',
      '12. REFERENCES',
      '   - NASA Mars Trek Geospatial Services: https://trek.nasa.gov/mars/',
      '   - USGS SIM 3292 Geologic Map of Mars (Tanaka et al., 2014): https://pubs.usgs.gov/sim/3292/',
      '   - NASA PDS Geosciences Node (MOLA, CRISM, MSL): https://pds-geosciences.wustl.edu/',
      '   - Caltech Murray Lab MRO CTX Global Mosaic: https://murray-lab.caltech.edu/CTX/',
      '   - UArizona / NASA HiRISE Catalog: https://www.uahirise.org/catalog/',
      '   - ASU Mars Odyssey THEMIS Portal: https://themis.asu.edu/',
      '   - Hassler et al. (2014), Mars Surface Radiation Environment Measured with MSL RAD, Science 343.',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mission.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-nasa-technical-report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/50 overflow-y-auto p-4 sm:p-6 flex justify-center items-start"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-report-title"
    >
      <div
        id="marscope-mission-report"
        className="bg-white border border-[#D9DDE2] w-full max-w-4xl my-4 shadow-lg text-[#171717]"
      >
        {/* Top Action Bar (Hidden on Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#F3F4F6] border-b border-[#D9DDE2]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0057B8]">
              MARSCOPE V3 · Technical Documentation Generator
            </p>
            <h2 id="mission-report-title" className="text-base font-bold text-[#171717]">
              Exportable NASA-Style Mission Intelligence Report
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0057B8] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#004494] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export PDF / Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadTextReport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#D9DDE2] bg-white text-[#171717] text-xs font-semibold uppercase tracking-wide hover:bg-[#E5E7EB] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export TXT</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Mission Report"
              className="inline-flex items-center gap-1 px-3 py-2 border border-[#D9DDE2] bg-white text-[#171717] text-xs font-semibold uppercase hover:bg-[#E5E7EB] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Technical Document Body */}
        <div className="p-6 sm:p-8 space-y-6 text-xs">
          {/* Technical Header Block */}
          <div className="pb-4 border-b-2 border-[#0057B8] flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#0057B8]">
                NASA Space Apps Challenge 2026 · MARSCOPE Technical Memorandum
              </p>
              <h1 className="text-2xl font-bold text-[#171717] mt-1">{mission.name}</h1>
              <p className="text-xs text-[#4B5563] mt-1 font-mono">
                DOC-ID: MARSCOPE-V3-{mission.id.slice(0, 18).toUpperCase()} · GENERATED:{' '}
                {new Date().toISOString().slice(0, 10)}
              </p>
            </div>
            <div className="text-right space-y-1">
              <span
                className={`inline-block px-2.5 py-1 text-[11px] font-bold uppercase text-white ${
                  mission.isDemonstration ? 'bg-[#F47721]' : 'bg-[#0057B8]'
                }`}
              >
                {mission.isDemonstration ? 'DEMONSTRATION DATA' : 'USER MISSION DRAFT'}
              </span>
              <div>
                <span
                  className={`inline-block px-2.5 py-1 font-bold uppercase text-[10px] text-white ${
                    riskAssessment.category === 'HIGH TERRAIN CONCERN'
                      ? 'bg-[#B91C1C]'
                      : riskAssessment.category === 'MODERATE TERRAIN CONCERN'
                      ? 'bg-[#F47721]'
                      : 'bg-[#0057B8]'
                  }`}
                >
                  {riskAssessment.category}
                </span>
              </div>
            </div>
          </div>

          {/* 1. Mission Overview */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
              1. Mission Overview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-[#D9DDE2] p-3">
                <p className="text-[11px] text-[#4B5563] uppercase">Total Distance</p>
                <p className="font-mono font-bold text-sm mt-0.5">
                  {riskAssessment.totalDistanceKm.toFixed(2)} km
                </p>
              </div>
              <div className="border border-[#D9DDE2] p-3">
                <p className="text-[11px] text-[#4B5563] uppercase">Estimated Duration</p>
                <p className="font-mono font-bold text-sm mt-0.5">
                  {riskAssessment.estimatedHours.toFixed(2)} hrs
                </p>
              </div>
              <div className="border border-[#D9DDE2] p-3">
                <p className="text-[11px] text-[#4B5563] uppercase">EVA Walking Pace</p>
                <p className="font-mono font-bold text-sm mt-0.5">
                  {mission.walkingSpeedKmH.toFixed(1)} km/h
                </p>
              </div>
              <div className="border border-[#D9DDE2] p-3">
                <p className="text-[11px] text-[#4B5563] uppercase">Assessment State</p>
                <p className="font-bold text-[11px] text-[#F47721] mt-1">
                  {riskAssessment.isPreliminary ? 'PRELIMINARY' : 'DEM ANALYZED'} · NOT CERTIFIED
                </p>
              </div>
            </div>
          </section>

          {/* 2. Scientific Objectives & Targets */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
              2. Scientific Objectives &amp; Identified Targets ({mission.scientificTargets.length})
            </h3>
            <div className="border border-[#D9DDE2] bg-[#F3F4F6] p-3 mb-3">
              <p className="text-[#171717] leading-relaxed">{mission.scientificObjective}</p>
            </div>
            {mission.scientificTargets.length > 0 && (
              <table className="w-full border-collapse border border-[#D9DDE2] text-left">
                <thead>
                  <tr className="bg-[#F3F4F6] border-b border-[#D9DDE2]">
                    <th className="p-2 font-semibold">Target</th>
                    <th className="p-2 font-semibold">Category</th>
                    <th className="p-2 font-semibold">Coordinates</th>
                    <th className="p-2 font-semibold">Observation Goal</th>
                  </tr>
                </thead>
                <tbody>
                  {mission.scientificTargets.map((t, idx) => (
                    <tr key={t.id} className="border-b border-[#D9DDE2]">
                      <td className="p-2 font-semibold">
                        T{idx + 1}. {t.name}
                      </td>
                      <td className="p-2 text-[#0057B8]">{t.category}</td>
                      <td className="p-2 font-mono">{formatMarsCoords(t.lat, t.lng, 4)}</td>
                      <td className="p-2 text-[#4B5563]">{t.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 3. Selected Martian Region & 4. Starting/Destination Coordinates */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#D9DDE2] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
                3. Selected Martian Region
              </h3>
              <p className="font-bold text-[#171717]">{region.name}</p>
              <p className="text-[#4B5563] mt-0.5">
                {region.quadrangle} · {region.elevationSummary}
              </p>
              <p className="text-[#4B5563] mt-1">
                <strong>Mission Heritage:</strong> {region.missionHistory}
              </p>
              {geologyRecord?.unitCode && (
                <p className="text-[#0057B8] mt-1 font-semibold">
                  USGS SIM 3292 Unit: {geologyRecord.unitCode} — {geologyRecord.unitDescription}
                </p>
              )}
            </div>

            <div className="border border-[#D9DDE2] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
                4. Starting &amp; Destination Coordinates
              </h3>
              <p className="text-[#171717]">
                <strong>Start:</strong>{' '}
                <span className="font-mono">
                  {startWp ? formatMarsCoords(startWp.lat, startWp.lng, 4) : 'Not set'}
                </span>{' '}
                ({startWp?.name ?? '—'})
              </p>
              <p className="text-[#171717] mt-1.5">
                <strong>Destination:</strong>{' '}
                <span className="font-mono">
                  {endWp ? formatMarsCoords(endWp.lat, endWp.lng, 4) : 'Not set'}
                </span>{' '}
                ({endWp?.name ?? '—'})
              </p>
            </div>
          </section>

          {/* 5. Exploration Route */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
              5. Exploration Route ({mission.waypoints.length} Waypoints)
            </h3>
            <table className="w-full border-collapse border border-[#D9DDE2] text-left">
              <thead>
                <tr className="bg-[#F3F4F6] border-b border-[#D9DDE2]">
                  <th className="p-2 font-semibold">#</th>
                  <th className="p-2 font-semibold">Waypoint Name</th>
                  <th className="p-2 font-semibold">Martian Coordinates</th>
                  <th className="p-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {mission.waypoints.map((wp, idx) => (
                  <tr key={wp.id} className="border-b border-[#D9DDE2]">
                    <td className="p-2 font-mono font-bold">{idx + 1}</td>
                    <td className="p-2 font-semibold">{wp.name}</td>
                    <td className="p-2 font-mono">{formatMarsCoords(wp.lat, wp.lng, 4)}</td>
                    <td className="p-2 text-[#4B5563]">{wp.notes || 'Traverse checkpoint'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 6. Terrain Analysis */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
              6. Terrain Analysis
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="border border-[#D9DDE2] p-2.5 bg-[#F9FAFB]">
                <p className="text-[11px] text-[#4B5563]">Highest Point</p>
                <p className="font-mono font-bold">
                  {profileMetrics.highestPointM !== null
                    ? `${profileMetrics.highestPointM.toFixed(1)} m`
                    : 'Unavailable'}
                </p>
              </div>
              <div className="border border-[#D9DDE2] p-2.5 bg-[#F9FAFB]">
                <p className="text-[11px] text-[#4B5563]">Lowest Point</p>
                <p className="font-mono font-bold">
                  {profileMetrics.lowestPointM !== null
                    ? `${profileMetrics.lowestPointM.toFixed(1)} m`
                    : 'Unavailable'}
                </p>
              </div>
              <div className="border border-[#D9DDE2] p-2.5 bg-[#F9FAFB]">
                <p className="text-[11px] text-[#4B5563]">Elevation Difference</p>
                <p className="font-mono font-bold">
                  {profileMetrics.elevationDifferenceM !== null
                    ? `${profileMetrics.elevationDifferenceM.toFixed(1)} m`
                    : 'Unavailable'}
                </p>
              </div>
              <div className="border border-[#D9DDE2] p-2.5 bg-[#F9FAFB]">
                <p className="text-[11px] text-[#4B5563]">Max Sampled Slope</p>
                <p className="font-mono font-bold">
                  {profileMetrics.maxSlopeDeg !== null
                    ? `${profileMetrics.maxSlopeDeg.toFixed(1)}°`
                    : 'Unavailable'}
                </p>
              </div>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[#374151]">
              {riskAssessment.riskFactors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </section>

          {/* 7. Scientific Datasets Used */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
              7. Scientific Datasets Used
            </h3>
            {provenanceRecords.length > 0 ? (
              <table className="w-full border-collapse border border-[#D9DDE2] text-left">
                <thead>
                  <tr className="bg-[#F3F4F6] border-b border-[#D9DDE2]">
                    <th className="p-2 font-semibold">Module</th>
                    <th className="p-2 font-semibold">Dataset</th>
                    <th className="p-2 font-semibold">Resolution</th>
                    <th className="p-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {provenanceRecords.map((p) => (
                    <tr key={p.id} className="border-b border-[#D9DDE2]">
                      <td className="p-2 font-bold">{p.moduleId}</td>
                      <td className="p-2">{p.datasetName}</td>
                      <td className="p-2 font-mono">{p.spatialResolution}</td>
                      <td className="p-2 font-semibold text-[#0057B8]">{p.availabilityStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[#4B5563]">
                Active Map Layer: <strong>{activeLayer.name}</strong> ({activeLayer.missionSource},{' '}
                {activeLayer.resolution}) paired with NASA Mars Trek MOLA/HRSC Elevation DEMs and
                USGS/IAU feature services.
              </p>
            )}
          </section>

          {/* 8. Environmental Observations */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
              8. Environmental Observations (Historical &amp; Orbital Archives)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-[#D9DDE2] p-3">
                <p className="font-bold text-[#171717] mb-1">
                  Surface Temperature &amp; Atmosphere
                </p>
                <p className="text-[#4B5563]">
                  <strong>THEMIS Thermal Inertia:</strong> Controlled Day/Night IR (100 m/px, Oct
                  2018 release). Bright nighttime zones indicate exposed bedrock; dark zones indicate
                  loose dust/sand.
                </p>
                <p className="text-[#4B5563] mt-1">
                  <strong>InSight APSS (Elysium Planitia):</strong>{' '}
                  {latestSol
                    ? `HISTORICAL (Oct 2020 Sol ${latestSol.sol}): Min ${latestSol.tempMinC}°C, Avg ${latestSol.tempAvgC}°C, Max ${latestSol.tempMaxC}°C, ${latestSol.pressureAvgPa} Pa.`
                    : 'DATA NOT CONNECTED (InSight mission concluded Dec 2022).'}
                </p>
              </div>
              <div className="border border-[#D9DDE2] p-3">
                <p className="font-bold text-[#171717] mb-1">
                  Historical Radiation Baseline (Curiosity RAD)
                </p>
                {MSL_RAD_REFERENCE_RECORDS.slice(0, 2).map((rad) => (
                  <p key={rad.parameter} className="text-[#4B5563] mb-1">
                    <strong>{rad.parameter}:</strong> {rad.measuredValue} ({rad.observationPeriod})
                  </p>
                ))}
                <p className="text-[#F47721] font-semibold mt-1">
                  Real-time solar particle / radiation telemetry: UNAVAILABLE DATA
                </p>
              </div>
            </div>
          </section>

          {/* 9. Potential Hazards & 10. Data Limitations */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#B91C1C] bg-[#FEF2F2] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#B91C1C] mb-1.5">
                9. Potential Hazards
              </h3>
              {riskAssessment.obstacleAlerts.length > 0 ? (
                <ul className="list-disc pl-4 space-y-1 text-[#171717]">
                  {riskAssessment.obstacleAlerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[#171717]">
                  No USGS dune polygon intersections returned for bounding box; verify secondary
                  craters, steep rim talus, and rocky ejecta via HiRISE imagery.
                </p>
              )}
            </div>

            <div className="border border-[#F47721] bg-[#FFF7ED] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F47721] mb-1.5">
                10. Data Limitations
              </h3>
              <ul className="list-disc pl-4 space-y-1 text-[#171717]">
                <li>{riskAssessment.safetyDisclaimer}</li>
                <li>
                  {profileResponse?.demCoverageNote ??
                    'Global 200 m/px and 463 m/px DEMs cannot resolve meter-scale boulders.'}
                </li>
                <li>Real-time weather, dust optical depth, and SEP storm telemetry are not connected.</li>
              </ul>
            </div>
          </section>

          {/* 11. Recommendations */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
              11. Recommendations
            </h3>
            {recommendations.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1.5 text-[#374151]">
                {recommendations.map((rec) => (
                  <li key={rec.id}>
                    <strong className="text-[#171717]">
                      [{rec.severity}] {rec.title}:
                    </strong>{' '}
                    {rec.actionableStep}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1 text-[#374151]">
                <li>
                  Obtain targeted UArizona/NASA PDS HiRISE (~0.25–0.30 m/px) stereo observations over
                  all planned waypoints prior to traverse commitment.
                </li>
                <li>
                  Cross-reference THEMIS Nighttime IR bright bedrock inertia zones against CTX 5 m/px
                  imagery to avoid unconsolidated sand ripples.
                </li>
              </ul>
            )}
          </section>

          {/* 12. References */}
          <section className="border-t border-[#D9DDE2] pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0057B8] mb-2">
              12. Scientific References &amp; Official Data Providers
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-[#4B5563]">
              <li>
                NASA Solar System Treks (Mars Trek WMTS, DEM &amp; Feature Services):{' '}
                <span className="font-mono text-[#0057B8]">https://trek.nasa.gov/mars/</span>
              </li>
              <li>
                Tanaka, K. L., et al. (2014). Geologic Map of Mars: USGS Scientific Investigations Map
                3292:{' '}
                <span className="font-mono text-[#0057B8]">https://pubs.usgs.gov/sim/3292/</span>
              </li>
              <li>
                Caltech Murray Lab MRO CTX Global Mosaic:{' '}
                <span className="font-mono text-[#0057B8]">https://murray-lab.caltech.edu/CTX/</span>
              </li>
              <li>
                University of Arizona / NASA HiRISE &amp; ASU Mars Odyssey THEMIS:{' '}
                <span className="font-mono text-[#0057B8]">
                  https://www.uahirise.org/catalog/ · https://themis.asu.edu/
                </span>
              </li>
              <li>
                Hassler, D. M., et al. (2014). Mars&apos; Surface Radiation Environment Measured with
                the Mars Science Laboratory&apos;s Curiosity Rover (RAD). <em>Science</em>, 343(6169).
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
