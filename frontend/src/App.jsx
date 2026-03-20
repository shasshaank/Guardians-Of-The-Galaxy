import React, { useState, useEffect } from 'react';
import Globe from './components/Globe';
import SatelliteLayer from './components/SatelliteLayer';
import CollisionAlert from './components/CollisionAlert';
import ManeuverPanel from './components/ManeuverPanel';
import SatelliteOrbit, { CollisionMarker } from "./components/SatelliteOrbit";
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * App — root layout component for Orbital Guardian dashboard.
 *
 * Layout:
 *   Header
 *   ┌─────────────────┬─────────────────┐
 *   │  3-D Globe      │  CollisionAlert │
 *   │  + Satellites   │  ManeuverPanel  │
 *   └─────────────────┴─────────────────┘
 */
export default function App() {
  const [satellites, setSatellites] = useState([]);
  const [satA, setSatA] = useState(null);
  const [satB, setSatB] = useState(null);
  const [collisionResult, setCollisionResult] = useState(null);
  
  // Pipeline State: 'idle' | 'fetching_tle' | 'propagating' | 'computing_maneuver' | 'complete'
  const [pipelineStage, setPipelineStage] = useState('idle');

  useEffect(() => {
    setPipelineStage('fetching_tle');
    fetch(`${API_URL}/satellites?limit=500`)
      .then(res => res.json())
      .then(data => {
        setSatellites(data);
        setPipelineStage('idle');
      })
      .catch(err => {
        console.error("Failed to fetch satellites:", err);
        setPipelineStage('idle');
      });
  }, []);

  const selectedSatA = satellites.find(s => s.name === satA);
  const selectedSatB = satellites.find(s => s.name === satB);

  function handleScenario(scenarioType) {
    if (satellites.length < 2) return;
    
    let a, b;
    if (scenarioType === 'ISS_DEBRIS') {
      a = satellites.find(s => s.name.includes('ISS')) || satellites[0];
      // Pick Cosmos or any known debris generator
      b = satellites.find(s => s.name.includes('COSMOS')) || satellites[satellites.length - 1];
    } else if (scenarioType === 'STARLINK') {
      const starlinks = satellites.filter(s => s.name.includes('STARLINK'));
      a = starlinks[0] || satellites[0];
      b = starlinks[1] || satellites[1];
    } else if (scenarioType === 'SAFE') {
      a = satellites.find(s => s.name.includes('AQUA')) || satellites[2];
      b = satellites.find(s => s.name.includes('TERRA')) || satellites[3];
    }

    if (a && b) {
      setSatA(a.name);
      setSatB(b.name);
      // Wait a tick for state to settle then start propagating
      setTimeout(() => setPipelineStage('propagating'), 100);
    }
  }

  const threatParams = collisionResult && collisionResult.closest_event && selectedSatA ? {
    line1: selectedSatA.line1,
    line2: selectedSatA.line2,
    threat_direction_x: collisionResult.closest_event.position_b.x - collisionResult.closest_event.position_a.x,
    threat_direction_y: collisionResult.closest_event.position_b.y - collisionResult.closest_event.position_a.y,
    threat_direction_z: collisionResult.closest_event.position_b.z - collisionResult.closest_event.position_a.z,
    threat_distance_km: collisionResult.min_distance_km
  } : null;

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-content">
          <span className="header-icon">🛰</span>
          <div>
            <h1 className="header-title">Orbital Guardian</h1>
            <p className="header-subtitle">
              AI-Powered Space Debris Collision Prediction &amp; Avoidance System
            </p>
          </div>
        </div>
        <div className="header-status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot" />
            <span className="status-text">LIVE</span>
          </div>
        </div>
      </header>

      {/* ── Dashboard grid ── */}
      <main className="dashboard">
        {/* Left column — 3-D globe */}
        <section className="globe-section">
          <div className="globe-container">
            <Globe>
              <SatelliteLayer group="active" limit={60} />
              {collisionResult && collisionResult.path_a && (
                <SatelliteOrbit path={collisionResult.path_a} color="#ff3366" />
              )}
              {collisionResult && collisionResult.path_b && (
                <SatelliteOrbit path={collisionResult.path_b} color="#ff9800" />
              )}
              {collisionResult && collisionResult.closest_event && (
                <CollisionMarker event={collisionResult.closest_event} />
              )}
            </Globe>
          </div>
          <p className="globe-hint">
            Drag to rotate · Scroll to zoom · Hover a dot for satellite info
          </p>
        </section>

        {/* Right column — control panels */}
        <aside className="panels-column">
          
          {/* Demo Scenarios Panel */}
          <div className="panel">
            <h2 className="panel-title">🎬 Demo Scenarios</h2>
            <div className="satellite-selector-wrapper">
              <select onChange={(e) => handleScenario(e.target.value)} defaultValue="">
                <option value="" disabled>Select a guided scenario...</option>
                <option value="ISS_DEBRIS">ISS vs Unknown Debris (CRITICAL)</option>
                <option value="STARLINK">Starlink Cluster Conjunction</option>
                <option value="SAFE">Safe Pass (Baseline)</option>
              </select>
            </div>
            {pipelineStage !== 'idle' && (
              <div className="pipeline-tracker">
                <div className={`step ${pipelineStage !== 'idle' ? 'done' : ''}`}>
                  {pipelineStage === 'fetching_tle' ? '⏳' : '✅'} TLE
                </div>
                <div className={`step ${['computing_maneuver', 'complete'].includes(pipelineStage) ? 'done' : pipelineStage === 'propagating' ? 'active' : ''}`}>
                  {pipelineStage === 'propagating' ? '⏳ Orbits' : '✅ Orbits'}
                </div>
                <div className={`step ${pipelineStage === 'complete' ? 'done' : pipelineStage === 'computing_maneuver' ? 'active' : ''}`}>
                  {pipelineStage === 'computing_maneuver' ? '⏳ AI' : ['idle', 'fetching_tle', 'propagating'].includes(pipelineStage) ? 'AI Analyser' : '✅ AI'}
                </div>
              </div>
            )}
          </div>

          <CollisionAlert 
            satellites={satellites}
            satA={satA}
            satB={satB}
            setSatA={setSatA}
            setSatB={setSatB}
            selectedSatA={selectedSatA}
            selectedSatB={selectedSatB}
            alertData={collisionResult}
            onDataChange={setCollisionResult}
            pipelineStage={pipelineStage}
            setPipelineStage={setPipelineStage}
          />
          <ManeuverPanel 
            threatParams={threatParams}
            onDataChange={() => {}}
            pipelineStage={pipelineStage}
            setPipelineStage={setPipelineStage}
          />
        </aside>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span>Orbital Guardian &copy; {new Date().getFullYear()}</span>
        <span className="footer-sep">·</span>
        <span>TLE Source: Celestrak</span>
        <span className="footer-sep">·</span>
        <span>Physics: SGP4</span>
        <span className="footer-sep">·</span>
        <span>IIT Hyderabad Hackathon Demo</span>
      </footer>
    </div>
  );
}
