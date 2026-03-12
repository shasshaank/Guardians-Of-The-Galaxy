import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/** Risk-level → accent colour mapping */
const RISK_COLORS = {
  CRITICAL: '#f44336',
  WARNING: '#ff9800',
  SAFE: '#4caf50',
};

/**
 * Sample TLE pair for the demo "Check Collision" button.
 * Replace with dynamic values in a production build.
 */
const DEMO_TLE = {
  line1_a: '1 25544U 98067A   24001.50000000  .00001234  00000-0  27416-4 0  9990',
  line2_a: '2 25544  51.6416  29.0903 0003456  85.1234 274.9999 15.49568876440123',
  line1_b: '1 44691U 19074B   24001.50000000  .00000123  00000-0  12345-4 0  9991',
  line2_b: '2 44691  53.0000  60.0000 0001000  90.0000 270.0000 15.06000000123456',
};

/**
 * CollisionAlert — panel that displays collision risk data and allows the user
 * to trigger a collision check via the backend API.
 *
 * @param {object}   props
 * @param {object}   [props.alertData]     – Pre-loaded collision result (optional)
 * @param {function} [props.onDataChange]  – Called with new collision result after check
 */
export default function CollisionAlert({ alertData, onDataChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(alertData || null);

  async function runCollisionCheck() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        line1_a: DEMO_TLE.line1_a,
        line2_a: DEMO_TLE.line2_a,
        line1_b: DEMO_TLE.line1_b,
        line2_b: DEMO_TLE.line2_b,
        hours: '24',
      });
      const res = await fetch(`${API_URL}/collision-check?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      setResult(data);
      onDataChange && onDataChange(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const riskColor = result ? (RISK_COLORS[result.risk_level] || '#9e9e9e') : '#9e9e9e';
  const isCritical = result?.risk_level === 'CRITICAL';

  return (
    <div className="panel collision-panel">
      <h2 className="panel-title">
        🛰 Collision Risk Monitor
      </h2>

      <button
        className="action-btn"
        onClick={runCollisionCheck}
        disabled={loading}
      >
        {loading ? '⏳ Analysing…' : '🔍 Check Collision'}
      </button>

      {error && (
        <div className="error-box">⚠ {error}</div>
      )}

      {result && (
        <div className={`risk-card ${isCritical ? 'pulse' : ''}`} style={{ borderColor: riskColor }}>
          <div className="risk-badge" style={{ background: riskColor }}>
            {result.risk_level}
          </div>

          <div className="risk-detail">
            <span className="detail-label">Closest Approach</span>
            <span className="detail-value">
              {result.min_distance_km != null
                ? `${Number(result.min_distance_km).toFixed(2)} km`
                : '—'}
            </span>
          </div>

          {result.closest_event && (
            <>
              <div className="risk-detail">
                <span className="detail-label">Event Time</span>
                <span className="detail-value">
                  {new Date(result.closest_event.time).toUTCString()}
                </span>
              </div>
              <div className="risk-detail">
                <span className="detail-label">Sat A Position</span>
                <span className="detail-value detail-mono">
                  ({result.closest_event.position_a.x.toFixed(0)},&nbsp;
                  {result.closest_event.position_a.y.toFixed(0)},&nbsp;
                  {result.closest_event.position_a.z.toFixed(0)}) km
                </span>
              </div>
              <div className="risk-detail">
                <span className="detail-label">Sat B Position</span>
                <span className="detail-value detail-mono">
                  ({result.closest_event.position_b.x.toFixed(0)},&nbsp;
                  {result.closest_event.position_b.y.toFixed(0)},&nbsp;
                  {result.closest_event.position_b.z.toFixed(0)}) km
                </span>
              </div>
            </>
          )}

          <p className="risk-hint">
            {result.risk_level === 'CRITICAL' && '🚨 Immediate maneuver required!'}
            {result.risk_level === 'WARNING' && '⚠ Elevated risk — monitor closely.'}
            {result.risk_level === 'SAFE' && '✅ No immediate collision threat detected.'}
          </p>
        </div>
      )}

      {!result && !loading && (
        <p className="placeholder-text">
          Press "Check Collision" to run a conjunction analysis between two satellites.
        </p>
      )}
    </div>
  );
}
