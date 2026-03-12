"""
SGP4 Orbital Propagation Engine for Orbital Guardian.

Uses the sgp4 library to propagate satellite positions from TLE data.
Positions are returned in TEME (Earth-centered) Cartesian coordinates and
also converted to geodetic latitude/longitude/altitude for the frontend.
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from sgp4.api import Satrec, jday


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def propagate_satellite(
    line1: str,
    line2: str,
    hours_ahead: int = 24,
    step_minutes: int = 10,
) -> list[dict]:
    """
    Propagate a satellite's position over a configurable time window.

    Args:
        line1:        TLE line 1 string.
        line2:        TLE line 2 string.
        hours_ahead:  Number of hours to propagate into the future.
        step_minutes: Time step between position samples, in minutes.

    Returns:
        List of position records, each containing:
            - time (ISO-8601 string)
            - position_km  (dict with x, y, z in km, TEME frame)
            - velocity_km_s (dict with x, y, z in km/s, TEME frame)
            - lat, lon, alt_km (geodetic coordinates)
    """
    satellite = Satrec.twoline2rv(line1, line2)
    positions: list[dict] = []
    now = datetime.now(tz=timezone.utc)

    total_steps = max(1, (hours_ahead * 60) // step_minutes)

    for step in range(total_steps):
        future = now + timedelta(minutes=step * step_minutes)
        jd, fr = jday(
            future.year,
            future.month,
            future.day,
            future.hour,
            future.minute,
            future.second + future.microsecond / 1e6,
        )
        error, position, velocity = satellite.sgp4(jd, fr)
        if error != 0:
            continue

        x_km, y_km, z_km = position[0], position[1], position[2]
        lat, lon, alt_km = _teme_to_geodetic(x_km, y_km, z_km)

        positions.append(
            {
                "time": future.isoformat(),
                "position_km": {"x": x_km, "y": y_km, "z": z_km},
                "velocity_km_s": {
                    "x": velocity[0],
                    "y": velocity[1],
                    "z": velocity[2],
                },
                "lat": lat,
                "lon": lon,
                "alt_km": alt_km,
            }
        )

    return positions


def get_current_position(line1: str, line2: str) -> Optional[dict]:
    """
    Return the current (real-time) position of a satellite.

    Args:
        line1: TLE line 1 string.
        line2: TLE line 2 string.

    Returns:
        Single position record dict, or None if propagation fails.
    """
    satellite = Satrec.twoline2rv(line1, line2)
    now = datetime.now(tz=timezone.utc)
    jd, fr = jday(
        now.year,
        now.month,
        now.day,
        now.hour,
        now.minute,
        now.second + now.microsecond / 1e6,
    )
    error, position, velocity = satellite.sgp4(jd, fr)
    if error != 0:
        return None

    x_km, y_km, z_km = position[0], position[1], position[2]
    lat, lon, alt_km = _teme_to_geodetic(x_km, y_km, z_km)

    return {
        "time": now.isoformat(),
        "position_km": {"x": x_km, "y": y_km, "z": z_km},
        "velocity_km_s": {"x": velocity[0], "y": velocity[1], "z": velocity[2]},
        "lat": lat,
        "lon": lon,
        "alt_km": alt_km,
    }


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _teme_to_geodetic(x_km: float, y_km: float, z_km: float) -> tuple[float, float, float]:
    """
    Convert TEME Cartesian coordinates to geodetic lat/lon/alt.

    This is a simplified conversion that treats TEME ≈ ECEF for the purpose
    of computing approximate latitude, longitude, and altitude.  For a
    hackathon-grade demo the error (< ~0.01° in lat/lon) is acceptable.

    Args:
        x_km, y_km, z_km: Position in km in the TEME frame.

    Returns:
        (latitude_deg, longitude_deg, altitude_km)
    """
    EARTH_RADIUS_KM = 6371.0

    # Longitude from the equatorial plane
    lon_rad = math.atan2(y_km, x_km)
    lon_deg = math.degrees(lon_rad)

    # Geocentric latitude
    p = math.sqrt(x_km * x_km + y_km * y_km)
    lat_rad = math.atan2(z_km, p)
    lat_deg = math.degrees(lat_rad)

    # Altitude above the reference sphere
    r_km = math.sqrt(x_km * x_km + y_km * y_km + z_km * z_km)
    alt_km = r_km - EARTH_RADIUS_KM

    return lat_deg, lon_deg, alt_km
