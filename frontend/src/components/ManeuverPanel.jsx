import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/** Risk-level badge colours */
const RISK_COLORS = {
  HIGH: '#f44336',
  MEDIUM: '#ff9800',
  LOW: '#4caf50',
};

/**
 * ManeuverPanel — displays calculated avoidance maneuver recommendations.
 *
 * @param {object}   props
 * @param {object}   [props.recommendation]  – Pre-loaded recommendation (optional)
 * @param {object}   [props.threatParams]    – Override default demo parameters
 * @param {function} [props.onDataChange]    – Called with new recommendation after fetch
 */
export default function ManeuverPanel({ recommendation, threatParams, onDataChange, pipelineStage, setPipelineStage }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(recommendation || null);

  const params = threatParams;

  useEffect(() => {
    if (pipelineStage === 'computing_maneuver' && threatParams) {
      fetchRecommendation();
    }
  }, [pipelineStage, threatParams]);

  async function fetchRecommendation() {
    if (!params) return;
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
      if (onDataChange) onDataChange(data);
      if (pipelineStage === 'computing_maneuver') setPipelineStage('complete');
    } catch (err) {
      setError(err.message);
      if (pipelineStage === 'computing_maneuver') setPipelineStage('idle');
    } finally {
      setLoading(false);
    }
  }

  const primary = result ? result.primary : null;
  const tradeoffs = result && result.tradeoffs ? result.tradeoffs : [];
  const riskColor = primary ? (RISK_COLORS[primary.risk_level] || '#9e9e9e') : '#9e9e9e';

  return (
    <div className="panel maneuver-panel">
      <h2 className="panel-title">⚙️ Orbital Maneuver Advisor</h2>

      <button
        className="action-btn action-btn--purple"
        onClick={fetchRecommendation}
        disabled={loading || !threatParams}
      >
        {loading ? '⏳ Computing…' : '🚀 Get Recommendation'}
      </button>

      {error && <div className="error-box">⚠ {error}</div>}

      {primary && (
        <div className="maneuver-card">
          {/* Header row */}
          <div className="maneuver-header">
            <span className="maneuver-type">{primary.maneuver_type}</span>
            <span className="risk-badge" style={{ background: riskColor }}>
              {primary.risk_level} RISK
            </span>
          </div>

          {/* Key metrics grid */}
          <div className="metrics-grid">
            <MetricBox label="Δv" value={`${primary.delta_v_m_s} m/s`} />
            <MetricBox label="Fuel Cost" value={`${primary.estimated_fuel_cost_percent}%`} />
            <MetricBox
              label="Confidence"
              value={`${(primary.confidence_score * 100).toFixed(1)}%`}
            />
            <MetricBox label="New Miss Dist." value={`${primary.new_miss_distance_km} km`} />
          </div>

          {/* Burn direction human-readable */}
          <div className="risk-detail" style={{ alignItems: "center" }}>
            <span className="detail-label">Burn Vector</span>
            <span className="detail-value" style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
              ↱ {Math.abs(primary.burn_direction.z) > 0.8 ? 'Radial Outward' : 'Cross-track (+Normal)'}
            </span>
          </div>

          {/* Execution window */}
          <div className="risk-detail">
            <span className="detail-label">Execute By</span>
            <span className="detail-value">{primary.time_to_execute}</span>
          </div>

          <div className="advanced-details">
            <details>
              <summary>Advanced Telemetry & Trade-offs</summary>
              <div className="advanced-details-content">
                <div className="risk-detail">
                  <span className="detail-label">Raw Unit Vector</span>
                  <span className="detail-value detail-mono">
                    ({primary.burn_direction.x}, {primary.burn_direction.y}, {primary.burn_direction.z})
                  </span>
                </div>
                
                {tradeoffs.length > 0 && (
                  <table className="tradeoff-table">
                    <thead>
                      <tr>
                        <th>Option</th>
                        <th>Δv</th>
                        <th>Miss Dist.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="tradeoff-row--highlight">
                        <td className="tradeoff-type">{primary.maneuver_type}</td>
                        <td>{primary.delta_v_m_s}</td>
                        <td>{primary.new_miss_distance_km}km</td>
                      </tr>
                      {tradeoffs.map((t, i) => (
                        <tr key={i}>
                          <td style={{ color: "var(--text-muted)" }}>{t.maneuver_type}</td>
                          <td>{t.delta_v_m_s}</td>
                          <td>{t.new_miss_distance_km}km</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </details>
          </div>

          {/* Maneuver explanation */}
          <p className="maneuver-explanation">{primary.explanation}</p>
        </div>
      )}

      {!primary && !loading && threatParams && (
        <p className="placeholder-text">
          Threat vector populated! Press "Get Recommendation" to generate a calculated avoidance maneuver plan.
        </p>
      )}

      {!primary && !loading && !threatParams && (
        <p className="placeholder-text">
          Run a collision check on two satellites first to enable the maneuver advisor.
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
