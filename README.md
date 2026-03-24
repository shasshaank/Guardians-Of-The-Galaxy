# 🛰 Orbital Guardian
### **Top 9 @ IIT Hyderabad Technical Showcase (Out of 389+ Teams)**
> **AI-Powered Space Debris Collision Prediction & Avoidance System**


![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11-green.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688.svg)
![Three.js](https://img.shields.io/badge/Three.js-r160-black.svg)

---

## 🏆 Awards & Recognition
* [cite_start]**Ranked 9th out of 389 teams** at the **IIT Hyderabad Technical Showcase (Mar 2026)**.
* [cite_start]Presented real-time satellite collision detection systems to **IIT faculty and industry experts**.
* [cite_start]Commended for integrating **SGP4 orbital propagation** with a physics-based maneuver advisor.

---

## 🌌 Overview

Earth's orbit is becoming dangerously crowded.

- **36,000+** tracked debris objects
- **Millions** of smaller untracked fragments
- Debris travels at **~28,000 km/h**
- Even a **1 cm fragment** can destroy a satellite

**Orbital Guardian** transforms this challenge from a monitoring problem into a
decision-making system. It ingests live TLE data, simulates orbital trajectories,
identifies collision risks, and uses AI to recommend optimal avoidance maneuvers —
all visualised in a stunning real-time 3-D interface.

---

## 🚨 The Problem

### 1. Massive Data Complexity
Thousands of satellites and debris fragments are moving simultaneously across
different orbital planes, altitudes, and velocities. Tracking all pairwise
interactions in real time requires sophisticated algorithms.

### 2. Limited Collision Prediction Tools
Existing systems often provide static warnings and raw trajectory data with
no clear decision guidance for satellite operators.

### 3. No Intelligent Maneuver Planning
Avoiding debris requires carefully planned burns that consider fuel limitations,
orbital stability, and mission objectives.

### 4. Increasing Satellite Density
Mega-constellations (Starlink, OneWeb, Kuiper) are launching thousands of
satellites, dramatically increasing the probability of chain-reaction collisions
— the dreaded **Kessler Syndrome**.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🌍 **3-D Orbital Visualization** | Interactive spinning Earth with live satellite positions rendered using Three.js |
| 📡 **Real-Time TLE Ingestion** | Fetches live orbital elements from Celestrak / NORAD |
| ⚡ **SGP4 Orbital Propagation** | Predicts satellite positions hours in advance |
| 🚨 **Collision Risk Detection** | Pairwise closest-approach analysis with CRITICAL / WARNING / SAFE classification |
| 🤖 **AI Maneuver Advisor** | Recommends optimal avoidance burns with delta-v, fuel cost, and confidence score |

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORBITAL GUARDIAN                         │
│                                                                 │
│   ┌─────────────┐    ┌──────────────────────────────────────┐  │
│   │  Data Layer  │    │         Backend (FastAPI)            │  │
│   │             │───▶│  tle_fetcher  →  propagator          │  │
│   │  Celestrak  │    │      ↓               ↓               │  │
│   │  Space-Track│    │  collision_detector  maneuver_engine  │  │
│   └─────────────┘    └──────────────┬───────────────────────┘  │
│                                     │ REST API                  │
│                       ┌─────────────▼───────────────────────┐  │
│                       │      Frontend (React + Three.js)     │  │
│                       │  Globe  SatelliteLayer  CollisionAlert│  │
│                       │              ManeuverPanel           │  │
│                       └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Three.js (via `@react-three/fiber`, `@react-three/drei`) |
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Orbital Mechanics** | SGP4 (`sgp4` library), NumPy |
| **Data Sources** | Celestrak TLE feeds, NORAD satellite catalog |
| **Containerisation** | Docker |

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- (Optional) Docker

---

### Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs are at `http://localhost:8000/docs`.

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env

# Start the development server
npm start
```

The frontend will open at `http://localhost:3000`.

---

### Docker (Backend only)

```bash
cd backend
docker build -t orbital-guardian-api .
docker run -p 8000:8000 orbital-guardian-api
```

---

## 📡 API Reference

### `GET /health`

Health check.

```json
{ "status": "ok", "service": "Orbital Guardian API" }
```

---

### `GET /satellites`

Fetch live TLE data from Celestrak.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `group`   | string | `active` | Celestrak satellite group |
| `limit`   | int    | `50`     | Max satellites to return |

**Example response:**
```json
[
  {
    "name": "ISS (ZARYA)",
    "line1": "1 25544U 98067A ...",
    "line2": "2 25544  51.6416 ..."
  }
]
```

---

### `GET /propagate`

Propagate a satellite orbit using SGP4.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `line1`        | string | — | TLE line 1 |
| `line2`        | string | — | TLE line 2 |
| `hours`        | int    | `24` | Hours ahead |
| `step_minutes` | int    | `10` | Step size in minutes |

**Example response:**
```json
[
  {
    "time": "2024-01-01T12:00:00+00:00",
    "position_km": { "x": -1234.5, "y": 6789.0, "z": 1234.5 },
    "velocity_km_s": { "x": -4.5, "y": 1.2, "z": 6.1 },
    "lat": 51.6,
    "lon": 29.1,
    "alt_km": 415.2
  }
]
```

---

### `GET /collision-check`

Check collision risk between two satellites.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `line1_a`, `line2_a` | string | — | TLE for satellite A |
| `line1_b`, `line2_b` | string | — | TLE for satellite B |
| `hours` | int | `24` | Propagation window |

**Example response:**
```json
{
  "min_distance_km": 8.34,
  "risk_level": "CRITICAL",
  "closest_event": {
    "time": "2024-01-01T15:30:00+00:00",
    "distance_km": 8.34,
    "position_a": { "x": -1234.5, "y": 6789.0, "z": 1234.5 },
    "position_b": { "x": -1230.0, "y": 6782.0, "z": 1228.0 }
  }
}
```

---

### `GET /maneuver-recommend`

Get AI-generated avoidance maneuver recommendation.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `line1`, `line2` | string | — | TLE of threatened satellite |
| `threat_direction_x/y/z` | float | `1,0,0` | Threat direction vector |
| `threat_distance_km` | float | — | Distance to threat in km |

**Example response:**
```json
{
  "maneuver_type": "Cross-Track Avoidance Burn",
  "burn_direction": { "x": 0.577, "y": -0.816, "z": 0.0 },
  "delta_v_m_s": 1.842,
  "estimated_fuel_cost_percent": 0.92,
  "confidence_score": 0.873,
  "time_to_execute": "Within 2–4 hours",
  "new_miss_distance_km": 42.5,
  "risk_level": "MEDIUM",
  "explanation": "Threat detected at 8.5 km. Recommended Cross-Track Avoidance Burn..."
}
```

---

## 📁 Project Structure

```
orbital-guardian/
├── frontend/                  # React + Three.js
│   ├── public/index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Globe.jsx          # 3D Earth rendering
│   │   │   ├── SatelliteLayer.jsx # Satellite orbit visualization
│   │   │   ├── CollisionAlert.jsx # Risk warning panel
│   │   │   └── ManeuverPanel.jsx  # AI recommendation display
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.js
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI entry point
│   │   ├── tle_fetcher.py        # Fetch TLE data from Celestrak
│   │   ├── propagator.py         # SGP4 orbital propagation
│   │   ├── collision_detector.py # Pairwise closest approach
│   │   └── maneuver_engine.py    # AI avoidance recommendation
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── data/
│   └── sample_tle.txt            # Sample TLE data for offline demo
├── .gitignore
└── README.md
```

---

## 🔬 How It Works

### Collision Detection

1. **Fetch TLE data** — Two-Line Element sets from Celestrak encode orbital parameters.
2. **SGP4 Propagation** — The SGP4 model integrates orbital mechanics equations to predict
   satellite positions at any future time, accounting for atmospheric drag and Earth's
   oblateness.
3. **Pairwise Analysis** — All satellite pairs are compared at each time step to find the
   closest approach distance.
4. **Risk Classification** — Events are classified: **CRITICAL** (< 10 km), **WARNING**
   (< 50 km), or **SAFE** (≥ 50 km).

### AI Maneuver Engine

1. **State Vector Extraction** — Current position and velocity from SGP4.
2. **Threat Geometry** — The threat direction vector is computed from the conjunction data.
3. **Optimal Burn Direction** — The burn is aligned cross-track (perpendicular to both the
   velocity and threat vectors) to maximise miss distance gain per unit of delta-v.
4. **Delta-v Scaling** — Required velocity change scales inversely with threat distance:
   closer threats require more aggressive burns.
5. **Fuel & Confidence Estimate** — Fuel consumption is expressed as a percentage of a
   typical satellite budget; confidence decreases as proximity increases.

---

## 📊 Data Sources

| Source | Description |
|--------|-------------|
| [Celestrak](https://celestrak.org) | Primary source for NORAD TLE data |
| [Space-Track](https://www.space-track.org) | Official US DoD debris catalog |
| NORAD | Two-Line Element catalog standard |

---

## 🗺 Roadmap

- [ ] Real-time WebSocket updates for live satellite positions
- [ ] Integration with Space-Track authenticated API for classified debris
- [ ] Orekit-based high-fidelity propagation for precise conjunctions
- [ ] Machine-learning model trained on historical conjunction data
- [ ] Multi-satellite fleet maneuver optimisation
- [ ] Kessler Syndrome cascade simulation
- [ ] Mobile-responsive dashboard

---

## 🏆 Hackathon Context

Built for the **IIT Hyderabad Hackathon** as a demonstration of applied orbital
mechanics, real-time data processing, and AI-driven decision support for the
growing challenge of space debris management.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to
discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Made with ❤️ for safer skies 🌌
</p>
