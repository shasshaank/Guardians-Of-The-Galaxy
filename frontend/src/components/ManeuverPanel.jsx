import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/** Risk-level badge colours */
const RISK_COLORS = {
  HIGH: '#f44336',
  MEDIUM: '#ff9800',
  LOW: '#4caf50',
};

/**
 * Demo TLE and threat parameters used by the "Get Recommendation" button.
 */
const DEMO_PARAMS = {
  line1: '1 25544U 98067A   24001.50000000  .00001234  00000-0  27416-4 0  9990',
  line2: '2 25544  51.6416  29.0903 0003456  85.1234 274.9999 15.49568876440123',
  threat_direction_x: 0.577,
  threat_direction_y: 0.577,
  threat_direction_z: 0.577,
  threat_distance_km: 8.5,
};

/**
 * ManeuverPanel — displays AI-generated avoidance maneuver recommendations.
 *
 * @param {object}   props
 * @param {object}   [props.recommendation]  – Pre-loaded recommendation (optional)
 * @param {object}   [props.threatParams]    – Override default demo parameters
 * @param {function} [props.onDataChange]    – Called with new recommendation after fetch
 */
export default function ManeuverPanel({ recommendation, threatParams, onDataChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(recommendation || null);

  const params = threatParams || DEMO_PARAMS;

  async function fetchRecommendation() {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        line1: params.line1,
        line2: params.line2,
        threat_direction_x: params.threat_direction_x,
        threat_direction_y: params.threat_direction_y,
        threat_direction_z: params.threat_direction_z,
        threat_distance_km: params.threat_distance_km,
      });
      const res = await fetch(`${API_URL}/maneuver-recommend?${query}`);
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

  return (
    <div className="panel maneuver-panel">
      <h2 className="panel-title">🤖 AI Maneuver Advisor</h2>

      <button
        className="action-btn action-btn--purple"
        onClick={fetchRecommendation}
        disabled={loading}
      >
        {loading ? '⏳ Computing…' : '🚀 Get Recommendation'}
      </button>

      {error && <div className="error-box">⚠ {error}</div>}

      {result && (
        <div className="maneuver-card">
          {/* Header row */}
          <div className="maneuver-header">
            <span className="maneuver-type">{result.maneuver_type}</span>
            <span className="risk-badge" style={{ background: riskColor }}>
              {result.risk_level} RISK
            </span>
          </div>

          {/* Key metrics grid */}
          <div className="metrics-grid">
            <MetricBox label="Δv" value={`${result.delta_v_m_s} m/s`} />
            <MetricBox label="Fuel Cost" value={`${result.estimated_fuel_cost_percent}%`} />
            <MetricBox
              label="Confidence"
              value={`${(result.confidence_score * 100).toFixed(1)}%`}
            />
            <MetricBox label="New Miss Dist." value={`${result.new_miss_distance_km} km`} />
          </div>

          {/* Burn direction */}
          <div className="risk-detail">
            <span className="detail-label">Burn Direction</span>
            <span className="detail-value detail-mono">
              ({result.burn_direction.x},&nbsp;
              {result.burn_direction.y},&nbsp;
              {result.burn_direction.z})
            </span>
          </div>

          {/* Execution window */}
          <div className="risk-detail">
            <span className="detail-label">Execute By</span>
            <span className="detail-value">{result.time_to_execute}</span>
          </div>

          {/* AI explanation */}
          <p className="maneuver-explanation">{result.explanation}</p>
        </div>
      )}

      {!result && !loading && (
        <p className="placeholder-text">
          Press "Get Recommendation" to generate an AI-powered avoidance maneuver plan.
        </p>
      )}
    </div>
  );
}

/**
 * Small metric display box used in the maneuver metrics grid.
 *
 * @param {object} props
 * @param {string} props.label  – Short metric label
 * @param {string} props.value  – Formatted metric value
 */
function MetricBox({ label, value }) {
  return (
    <div className="metric-box">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}
