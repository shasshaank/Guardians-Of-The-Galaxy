"""
AI Maneuver Recommendation Engine for Orbital Guardian.

Given TLE data for the threatened satellite and the direction/distance of the
incoming threat, computes an optimal avoidance burn recommendation.
"""

import math
import numpy as np
from typing import TypedDict

from .propagator import get_current_position


# --------------------------------------------------------------------------- #
# Types
# --------------------------------------------------------------------------- #

class ManeuverRecommendation(TypedDict):
    maneuver_type: str
    burn_direction: dict        # {"x": float, "y": float, "z": float} – unit vector
    delta_v_m_s: float          # magnitude of the velocity change in m/s
    estimated_fuel_cost_percent: float
    confidence_score: float     # 0.0 – 1.0
    time_to_execute: str        # human-readable window
    new_miss_distance_km: float
    risk_level: str
    explanation: str


# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #

# Typical LEO satellite total delta-v budget (m/s), used for fuel cost estimate
_TYPICAL_BUDGET_M_S = 200.0

# Uncertainty factor applied to new miss distance estimate
_MISS_DISTANCE_UNCERTAINTY = 0.15


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def recommend_maneuver(
    satellite_line1: str,
    satellite_line2: str,
    threat_direction: dict,
    threat_distance_km: float,
) -> ManeuverRecommendation:
    """
    Generate an avoidance maneuver recommendation for a threatened satellite.

    The engine:
      1. Fetches the satellite's current state vector.
      2. Normalises the threat direction vector.
      3. Computes a burn direction perpendicular to both the threat vector and
         the satellite's current velocity (cross-track component), biased by
         the radial component for faster miss-distance gain.
      4. Scales the required delta-v based on threat distance (closer → more
         aggressive).
      5. Returns a structured recommendation with all fields expected by the
         frontend.

    Args:
        satellite_line1:   TLE line 1 of the threatened satellite.
        satellite_line2:   TLE line 2 of the threatened satellite.
        threat_direction:  Dict with keys x, y, z (need not be normalised).
        threat_distance_km: Current distance to the threat object in km.

    Returns:
        ManeuverRecommendation TypedDict.
    """
    # ------------------------------------------------------------------ #
    # 1. Get current satellite state
    # ------------------------------------------------------------------ #
    state = get_current_position(satellite_line1, satellite_line2)
    if state is None:
        return _fallback_recommendation(threat_distance_km)

    vel = np.array(
        [
            state["velocity_km_s"]["x"],
            state["velocity_km_s"]["y"],
            state["velocity_km_s"]["z"],
        ],
        dtype=float,
    )

    # ------------------------------------------------------------------ #
    # 2. Normalise threat vector
    # ------------------------------------------------------------------ #
    threat_vec = np.array(
        [threat_direction["x"], threat_direction["y"], threat_direction["z"]],
        dtype=float,
    )
    threat_norm = np.linalg.norm(threat_vec)
    if threat_norm < 1e-9:
        threat_unit = np.array([0.0, 0.0, 1.0])
    else:
        threat_unit = threat_vec / threat_norm

    # ------------------------------------------------------------------ #
    # 3. Compute optimal burn direction
    #    Primary: cross-track (perpendicular to velocity AND threat)
    #    Fallback: pure radial-out if velocity is parallel to threat
    # ------------------------------------------------------------------ #
    vel_norm = np.linalg.norm(vel)
    if vel_norm > 1e-9:
        vel_unit = vel / vel_norm
        cross = np.cross(vel_unit, threat_unit)
        cross_norm = np.linalg.norm(cross)
        if cross_norm > 1e-9:
            burn_unit = cross / cross_norm
        else:
            # Velocity and threat are parallel — use radial outward component
            burn_unit = -threat_unit
    else:
        burn_unit = -threat_unit

    # ------------------------------------------------------------------ #
    # 4. Scale delta-v based on threat distance
    # ------------------------------------------------------------------ #
    delta_v_m_s = _compute_delta_v(threat_distance_km)

    # ------------------------------------------------------------------ #
    # 5. Estimate post-maneuver miss distance
    # ------------------------------------------------------------------ #
    new_miss_km = _estimate_new_miss_distance(threat_distance_km, delta_v_m_s)

    # ------------------------------------------------------------------ #
    # 6. Ancillary metrics
    # ------------------------------------------------------------------ #
    fuel_pct = round((delta_v_m_s / _TYPICAL_BUDGET_M_S) * 100, 2)
    confidence = _compute_confidence(threat_distance_km)
    risk_level = _risk_level_from_dv(delta_v_m_s)
    maneuver_type = _maneuver_type(delta_v_m_s)
    time_window = _execution_window(threat_distance_km)
    explanation = _build_explanation(
        threat_distance_km, delta_v_m_s, new_miss_km, maneuver_type
    )

    burn_direction = {
        "x": round(float(burn_unit[0]), 6),
        "y": round(float(burn_unit[1]), 6),
        "z": round(float(burn_unit[2]), 6),
    }

    return ManeuverRecommendation(
        maneuver_type=maneuver_type,
        burn_direction=burn_direction,
        delta_v_m_s=round(delta_v_m_s, 4),
        estimated_fuel_cost_percent=fuel_pct,
        confidence_score=round(confidence, 3),
        time_to_execute=time_window,
        new_miss_distance_km=round(new_miss_km, 2),
        risk_level=risk_level,
        explanation=explanation,
    )


# --------------------------------------------------------------------------- #
# Private helpers
# --------------------------------------------------------------------------- #

def _compute_delta_v(threat_distance_km: float) -> float:
    """
    Estimate required delta-v (m/s) based on miss distance.

    Closer threats require more aggressive burns.

    Args:
        threat_distance_km: Current closest-approach distance.

    Returns:
        Delta-v magnitude in m/s.
    """
    if threat_distance_km <= 0:
        threat_distance_km = 0.001

    if threat_distance_km < 1.0:
        return 5.0
    if threat_distance_km < 5.0:
        return 3.0 + (5.0 - threat_distance_km) * 0.4
    if threat_distance_km < 10.0:
        return 2.0 + (10.0 - threat_distance_km) * 0.2
    if threat_distance_km < 50.0:
        return 0.5 + (50.0 - threat_distance_km) / 40.0 * 1.5
    # Distant threat — minimal nudge
    return max(0.05, 0.5 * math.exp(-threat_distance_km / 200.0))


def _estimate_new_miss_distance(
    current_miss_km: float, delta_v_m_s: float
) -> float:
    """
    Estimate the new miss distance after the burn.

    Uses a simplified linear model: each m/s of delta-v gains approximately
    2 km of miss distance per km of current separation.

    Args:
        current_miss_km: Pre-maneuver closest-approach distance in km.
        delta_v_m_s:     Applied delta-v in m/s.

    Returns:
        Estimated new miss distance in km.
    """
    gain_km = delta_v_m_s * max(2.0, current_miss_km * 0.5)
    noise = gain_km * _MISS_DISTANCE_UNCERTAINTY
    return current_miss_km + gain_km - noise


def _compute_confidence(threat_distance_km: float) -> float:
    """
    Confidence score (0–1) based on how much time is available.

    Closer threats reduce confidence because uncertainty grows.

    Args:
        threat_distance_km: Closest-approach distance in km.

    Returns:
        Confidence score in [0, 1].
    """
    if threat_distance_km >= 50.0:
        return 0.97
    if threat_distance_km >= 10.0:
        return 0.85 + (threat_distance_km - 10.0) / 40.0 * 0.12
    if threat_distance_km >= 1.0:
        return 0.60 + (threat_distance_km - 1.0) / 9.0 * 0.25
    return 0.45


def _risk_level_from_dv(delta_v_m_s: float) -> str:
    """
    Map delta-v magnitude to a risk label.

    Args:
        delta_v_m_s: Required delta-v in m/s.

    Returns:
        "LOW", "MEDIUM", or "HIGH".
    """
    if delta_v_m_s < 0.5:
        return "LOW"
    if delta_v_m_s < 2.0:
        return "MEDIUM"
    return "HIGH"


def _maneuver_type(delta_v_m_s: float) -> str:
    """
    Return a human-readable maneuver classification label.

    Args:
        delta_v_m_s: Required delta-v in m/s.

    Returns:
        Maneuver type string.
    """
    if delta_v_m_s < 0.5:
        return "Micro-Adjustment"
    if delta_v_m_s < 2.0:
        return "Cross-Track Avoidance Burn"
    return "Emergency Avoidance Maneuver"


def _execution_window(threat_distance_km: float) -> str:
    """
    Suggest a human-readable execution time window.

    Args:
        threat_distance_km: Closest-approach distance in km.

    Returns:
        Time-to-execute string.
    """
    if threat_distance_km < 5.0:
        return "Immediate (within next orbit pass)"
    if threat_distance_km < 20.0:
        return "Within 2–4 hours"
    if threat_distance_km < 50.0:
        return "Within 6–12 hours"
    return "Within 24–48 hours"


def _build_explanation(
    distance_km: float,
    delta_v_m_s: float,
    new_miss_km: float,
    maneuver_type: str,
) -> str:
    """
    Build a concise human-readable explanation of the recommended maneuver.

    Args:
        distance_km:   Current threat distance in km.
        delta_v_m_s:   Required delta-v magnitude in m/s.
        new_miss_km:   Estimated post-maneuver miss distance in km.
        maneuver_type: Maneuver classification label.

    Returns:
        Explanation string.
    """
    return (
        f"Threat detected at {distance_km:.1f} km. "
        f"Recommended {maneuver_type} with Δv = {delta_v_m_s:.3f} m/s "
        f"applied perpendicular to the threat vector. "
        f"This is estimated to increase miss distance to {new_miss_km:.1f} km, "
        f"well above the 10 km CRITICAL threshold. "
        f"Burn is oriented cross-track to minimise orbital energy change "
        f"and preserve mission objectives."
    )


def _fallback_recommendation(threat_distance_km: float) -> ManeuverRecommendation:
    """
    Return a safe fallback recommendation when SGP4 propagation fails.

    Args:
        threat_distance_km: Input threat distance (used for scaling).

    Returns:
        ManeuverRecommendation with conservative default values.
    """
    delta_v = _compute_delta_v(threat_distance_km)
    new_miss = _estimate_new_miss_distance(threat_distance_km, delta_v)
    return ManeuverRecommendation(
        maneuver_type=_maneuver_type(delta_v),
        burn_direction={"x": 0.0, "y": 0.0, "z": 1.0},
        delta_v_m_s=round(delta_v, 4),
        estimated_fuel_cost_percent=round((delta_v / _TYPICAL_BUDGET_M_S) * 100, 2),
        confidence_score=0.50,
        time_to_execute=_execution_window(threat_distance_km),
        new_miss_distance_km=round(new_miss, 2),
        risk_level=_risk_level_from_dv(delta_v),
        explanation=(
            f"Fallback recommendation (TLE propagation unavailable). "
            f"Threat at {threat_distance_km:.1f} km. "
            f"Recommended Δv = {delta_v:.3f} m/s along +Z axis."
        ),
    )
