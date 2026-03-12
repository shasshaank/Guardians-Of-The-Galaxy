"""
TLE Data Fetcher for Orbital Guardian.

Fetches Two-Line Element (TLE) orbital data from the Celestrak API.
"""

import os
import requests
from typing import Optional


CELESTRAK_BASE_URL = os.getenv(
    "CELESTRAK_BASE_URL", "https://celestrak.org/NORAD/elements/gp.php"
)


def fetch_tle_data(group: str = "active", fmt: str = "tle") -> list[dict]:
    """
    Fetch TLE data from Celestrak for a given satellite group.

    Args:
        group: Satellite group name (e.g., "active", "stations", "starlink").
        fmt:   Response format, typically "tle" for the 3-line TLE format.

    Returns:
        List of satellite dicts, each with keys: name, line1, line2.

    Raises:
        requests.HTTPError: If the Celestrak request fails.
    """
    response = requests.get(
        CELESTRAK_BASE_URL,
        params={"GROUP": group, "FORMAT": fmt},
        timeout=30,
    )
    response.raise_for_status()

    lines = [line.strip() for line in response.text.strip().splitlines() if line.strip()]

    satellites: list[dict] = []
    for i in range(0, len(lines) - 2, 3):
        if lines[i + 1].startswith("1 ") and lines[i + 2].startswith("2 "):
            satellites.append(
                {
                    "name": lines[i],
                    "line1": lines[i + 1],
                    "line2": lines[i + 2],
                }
            )

    return satellites


def fetch_tle_by_catnr(catnr: int) -> Optional[dict]:
    """
    Fetch TLE data for a single satellite by its NORAD catalog number.

    Args:
        catnr: NORAD catalog number (e.g., 25544 for the ISS).

    Returns:
        Satellite dict with keys: name, line1, line2, or None on failure.
    """
    try:
        response = requests.get(
            CELESTRAK_BASE_URL,
            params={"CATNR": catnr, "FORMAT": "tle"},
            timeout=30,
        )
        response.raise_for_status()
        lines = [l.strip() for l in response.text.strip().splitlines() if l.strip()]
        if len(lines) >= 3:
            return {"name": lines[0], "line1": lines[1], "line2": lines[2]}
    except requests.RequestException:
        pass
    return None
