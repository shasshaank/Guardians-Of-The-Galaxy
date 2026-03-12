import React from 'react';
import Globe from './components/Globe';
import SatelliteLayer from './components/SatelliteLayer';
import CollisionAlert from './components/CollisionAlert';
import ManeuverPanel from './components/ManeuverPanel';
import './App.css';

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
          <span className="status-dot" />
          <span className="status-text">LIVE</span>
        </div>
      </header>

      {/* ── Dashboard grid ── */}
      <main className="dashboard">
        {/* Left column — 3-D globe */}
        <section className="globe-section">
          <div className="globe-container">
            <Globe>
              <SatelliteLayer group="active" limit={60} />
            </Globe>
          </div>
          <p className="globe-hint">
            Drag to rotate · Scroll to zoom · Hover a dot for satellite info
          </p>
        </section>

        {/* Right column — control panels */}
        <aside className="panels-column">
          <CollisionAlert />
          <ManeuverPanel />
        </aside>
      </main>

      {/* ── Footer ── */}
      <footer className="app-footer">
        <span>Orbital Guardian &copy; {new Date().getFullYear()}</span>
        <span className="footer-sep">·</span>
        <span>Data: Celestrak / NORAD TLE</span>
        <span className="footer-sep">·</span>
        <span>IIT Hyderabad Hackathon</span>
      </footer>
    </div>
  );
}
