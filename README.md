# SmartTransit Jordan

**An AI-powered public transit platform for Amman's bus network.**

Live app: [smarttransit-jordan.vercel.app](https://smarttransit-jordan.vercel.app/)
Demo video: [ADD DEMO VIDEO LINK]
API docs (Swagger/OpenAPI, auto-generated): `<backend-url>/docs`

Capstone Project 2 — AlHussein Technical University (HTU)
AI Expo Jordan 2026 · IEEE CIS — University of Jordan

---

## Table of contents

- [Problem statement](#problem-statement)
- [Solution overview](#solution-overview)
- [Key features](#key-features)
- [Machine learning approach](#machine-learning-approach)
- [Dataset](#dataset)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [API reference](#api-reference)
- [Current project stage & known limitations](#current-project-stage--known-limitations)
- [Expected impact](#expected-impact)
- [Team](#team)

---

## Problem statement

Amman's public bus network serves tens of thousands of daily commuters across 104 routes, yet neither passengers nor the Ministry of Transport have access to real-time, data-driven information about it:

- Passengers wait 18–25 minutes at stops with no way to know if a bus is delayed, crowded, or on schedule.
- Bus bunching (two vehicles arriving within 2 minutes of each other, then a 30-minute gap) is common and goes undetected.
- Fleet operators manage hundreds of vehicles manually — no live dashboard, no clustering alerts, no demand analytics.
- 5.17 million real road-segment measurements from Amman's transit corridors (Sweileh–JU Hospital, Wadi Seer, Marj Al Hammam, Tabarbour) exist in the Amman Vision dataset but had never been connected to a live intelligence platform.
- Google Maps / Moovit have limited or no coverage of Amman's local bus and coaster network — no locally-built AI transit platform exists for Jordan.

## Solution overview

SmartTransit Jordan is a three-tier system: a passenger-facing app, an operator dashboard, and an ML-driven prediction backend, all reading from a shared live database.

| Layer | Component | Technology | Hosting |
|---|---|---|---|
| Presentation | Passenger app | React + TypeScript + Vite + Tailwind | Vercel |
| Presentation | Operator dashboard | React + TypeScript (`/operator` route) | Vercel |
| Business logic | API backend | Python 3.10, FastAPI, Uvicorn | Railway.app |
| Business logic | ML models | Random Forest (scikit-learn), CatBoost | In-memory in the backend |
| Data | Relational database | Supabase (managed PostgreSQL) | Supabase Cloud |

**Request flow** (example: passenger searches a route):

1. React frontend sends `GET /route-predictions?from=X&to=Y` to the FastAPI backend.
2. Backend pulls live fleet state from Supabase (`fleet` table).
3. A feature vector is built per route: `flow`, `occupancy`, `waitingTime`, `hour`, `passenger_count`.
4. The Random Forest model predicts a crowding label (`available` / `moderate` / `full`) with a confidence score.
5. The CatBoost model predicts travel time, converted into a delay estimate and ETA.
6. Peak-hour and load penalties are applied to refine the duration.
7. The result is filtered to the routes matching the query, logged to Supabase's `predictions` table, and returned as JSON.

## Key features

**Passenger app** (6 screens: Login, Home, Route Results, Live Tracking, Alerts, My Routes)
- Real-time route search with AI-predicted crowding levels
- Predicted arrival and travel-time estimates per route and stop
- Saved "My Routes" with live predictions for frequent trips
- AI-generated alerts (critical / warning / info)
- Bilingual English/Arabic UI text (`src/lib/i18n.tsx`)

**Operator dashboard** (`/operator`)
- Live fleet view: load, delay, speed, and status per vehicle
- AI dispatch recommendations (reroute / dispatch backup) generated from live fleet thresholds
- Route performance and demand analytics (hourly boarding patterns)
- On-time rate and KPI summary

## Machine learning approach

Two models anchor the platform's intelligence layer, each chosen after benchmarking against a wider field of candidates (31 models total: 17 classifiers + 15 regressors, evaluated on a 100k-record subset before final training on the full dataset).

| Model | Task | Algorithm | Output |
|---|---|---|---|
| Classifier | Crowding prediction | Random Forest (50 trees, max_depth=15, min_samples_leaf=20) | Low / Moderate / Full + confidence % |
| Regressor | Travel-time prediction | CatBoost (500 iterations, lr=0.05, depth=8) | Travel time (seconds) → ETA |

- **Classification features:** `flow`, `occupancy`, `waitingTime`, `hour`, `passenger_count`
- **Classification performance:** 98.22% accuracy on 5.17M records, F1 = 0.98
- **Regression features:** `flow`, `density`, `waitingTime`, `speed`, `hour`, `is_peak_hour`, `passenger_count`, `flow_speed_ratio` + 7 more
- **Regression performance:** R² = 0.9303, MAE = 19.50s, RMSE = 117.30s

Key techniques:
- Target-leakage analysis — removed `congestion_score`, `congestion_binary`, `is_gridlock`, `density`, `occupancy` from the classification feature set to prevent leakage
- Cross-device consistency benchmarking (HPC NVIDIA A100, local RTX 3080, local CPU)
- Background thread model loading — the API starts in under 1 second while models load in parallel, with a rule-based fallback during warm-up
- Every prediction is logged to Supabase for an audit trail

## Dataset

| Field | Detail |
|---|---|
| Source | Amman Vision Dataset — real road-segment measurements from Amman's transit network |
| Size | 5,179,309 records (100k subset for benchmarking, full dataset for final training) |
| Split | 80% train / 20% test |
| Features | 26 raw features per record, 60-second measurement intervals |
| Classification target | `congestion_level`: Low / Medium / High |
| Regression target | `traveltime` (seconds) |
| Preprocessing | Target-leakage removal, feature selection, null handling, `LabelEncoder` for the classification target |
| Supplementary | 18,038 real passenger boarding records (boarding counts per route per hour) |

## Tech stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend framework | React 18 + TypeScript 5 | UI components and state management |
| Build tool | Vite | Dev server and production bundling |
| Styling | Tailwind CSS | Responsive design system |
| Routing | React Router | Client-side navigation |
| Maps | Leaflet / React-Leaflet, `@vis.gl/react-google-maps` | Live tracking and route maps |
| Backend framework | FastAPI (Python 3.10) | REST API |
| Classification model | scikit-learn (Random Forest) | Crowding-level prediction |
| Regression model | CatBoost | Travel-time prediction |
| Database & auth | Supabase (PostgreSQL) | Fleet, route, boarding, prediction, and user data |
| Mobile packaging | Capacitor + GitHub Actions | Android APK build (`.github/workflows/build-apk.yml`) |
| Frontend hosting | Vercel | CDN-distributed deployment |
| Backend hosting | Railway.app | API availability |

## Project structure

```
trial/
├── src/                      # Frontend (React + TypeScript)
│   ├── app/
│   │   ├── screens/           # Login, Home, RouteResults, LiveTracking, AlertsSchedule, MyRoutes
│   │   └── screens/operator/  # OperatorDashboard
│   ├── lib/                   # api.ts, auth.tsx, supabase.ts, i18n.tsx, favorites.ts
│   └── styles/
├── backend/                  # Backend (FastAPI)
│   ├── main.py                # Live API entrypoint (Procfile target)
│   ├── database.py            # Supabase queries
│   ├── models/                 # Trained model artifacts (rf_model.pkl, catboost_model.cbm, label_encoder.pkl)
│   ├── routers/                 # Modular route scaffolding (not yet wired into main.py)
│   └── requirements.txt
├── public/                    # Static assets
├── .github/workflows/         # CI: Android APK build via Capacitor
├── package.json / vite.config.ts / vercel.json
└── .env.example / backend/.env.example
```

> Note: `backend/routers/*.py` define a modular router layout (fleet, eta, dashboard, alerts, etc.) generated as scaffolding, but `backend/main.py` currently implements the live endpoints directly rather than including those routers. Treat `main.py` as the source of truth for what's actually running.

## Getting started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- A Supabase project (URL + anon key + service-role key)
- A Google Maps API key (for map components)

### Frontend

```bash
npm install
cp .env.example .env        # fill in VITE_API_URL, VITE_GOOGLE_MAPS_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev                 # local dev server
npm run build                # production build → dist/
npm run preview              # preview the production build
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in SUPABASE_URL, SUPABASE_KEY (service-role key)
uvicorn main:app --reload --port 8000
```

The backend expects `SUPABASE_URL` and `SUPABASE_KEY` as environment variables (read in `backend/database.py` and `backend/data/database.py`). `main.py` loads `models/rf_model.pkl` and `models/catboost_model.cbm` on startup in a background thread — until that finishes, endpoints fall back to rule-based estimates.

### Demo accounts

The login screen has a demo-fill button for each role:

| Role | Username | Password |
|---|---|---|
| Passenger | `amman_commuter` | `TransitPass2026!` |
| Operator | `fleet_admin_01` | `SecureOperatorAdmin#99!` |

## API reference

Full interactive docs are auto-generated by FastAPI at `<backend-url>/docs`. Core endpoints implemented in `backend/main.py`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/fleet` | Current fleet state from Supabase |
| GET | `/home/stats` | Passenger home-screen stats + quick routes |
| GET | `/route-predictions?from=&to=` | AI crowding + travel-time predictions per route |
| GET | `/dashboard` | Operator KPIs, fleet, AI recommendations, route performance |
| GET | `/predict?density=&waiting_time=` | Legacy single-point prediction endpoint |

## Current project stage & known limitations

**Stage:** Deployed system — passenger app and operator dashboard live at [smarttransit-jordan.vercel.app](https://smarttransit-jordan.vercel.app/), both ML models deployed and serving real predictions, 99 documented test cases.

**Known limitations:**
- Fleet data is manually maintained rather than GPS-streamed from real vehicles.
- Railway's free tier limits concurrent users to roughly 5 before timeouts.
- A scikit-learn version mismatch (1.7.2 vs 1.8.0) produces a non-fatal warning on backend startup.
- Login currently checks the username against a demo user map but does not verify the password against Supabase Auth — session restore is real, but the login step itself is not yet fully wired to Supabase.

## Expected impact

- **4M+ Amman residents** who rely on public transit daily
- **GAM (Greater Amman Municipality)** fleet operators and the **Ministry of Transport — Jordan**
- Replicable to other Jordanian cities (Zarqa, Irbid, Aqaba) and MENA cities with similar transit gaps
- Direct licensing opportunity to GAM/MOT, or a SaaS model for transit authorities region-wide

**Realistic next steps:** live GPS feed integration, upgrading backend hosting for production-scale concurrency, full Arabic/RTL localization, a pilot with 2–3 real Amman routes, and a native mobile app (Android build pipeline already scaffolded via Capacitor + GitHub Actions).

## Team

| Name | University | Role |
|---|---|---|
| Nour Ibrahim | AlHussein Technical University (HTU) | AI Engineer, Team Lead |
| Batoul Ibrahim | AlHussein Technical University (HTU) | Data Engineer |
| Roba AlDaiefi | AlHussein Technical University (HTU) | Software Engineer |

**Faculty supervisor:** Dr. Raneem Qaddoura — Assistant Professor, Data Science and AI / Computer Science, HTU

**Team lead contact:** 22110241@htu.edu.jo

Developed as a Capstone Project 2 at HTU, integrating machine learning, full-stack engineering, cloud deployment, and database systems — applying academic ML theory (31-model benchmarking, cross-device consistency testing, production deployment with background-thread optimization) to a real, unsolved problem in Jordan's public transit infrastructure.
