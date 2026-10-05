# AstraGuard Asteroid Risk Analyzer

A full-stack application that visualizes near-Earth asteroid data and calculates custom risk scores. Built with a Node.js/Express backend and a React + Vite frontend with a Three.js 3D simulation scene.

## Quick Start

**Run the entire project with one command:**

```bash
npm run start:all
```

This will:
1. Initialize the database schema
2. Sync asteroid data from NASA's NeoWs API
3. Start the backend server on `http://localhost:5000`
4. Start the frontend dev server on `http://localhost:5173`

> **Note:** The first run requires a PostgreSQL database with the credentials configured in `.env` (see [Environment Configuration](#environment-configuration)). `db:init` safely skips tables that already exist.

## Prerequisites

- **Node.js** v18+
- **PostgreSQL** — locally installed or accessible via connection string

## Project Structure

```
Asteroid Risk Analyzer/
├── src/                  # Express server, database, sync services, config
│   ├── server.js         # Express app entry point
│   ├── config.js         # Environment variable validation & config
│   ├── database/
│   │   ├── db.js         # PostgreSQL connection pool
│   │   ├── init.js       # Schema initialization script
│   │   └── schema.sql    # Table definitions & constraints
│   ├── services/
│   │   └── syncService.js # NASA NeoWs data fetch & DB upsert
│   └── ...
├── frontend/             # React + Vite SPA with Vitest tests
├── .env.example          # Environment variable template
├── package.json          # Backend dependencies & scripts
└── README.md            # This file
```

## Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set at minimum:
   - `DB_PASSWORD` — your PostgreSQL password
   - `NASA_API_KEY` — get a free key from [https://api.nasa.gov/](https://api.nasa.gov/) (or leave as `DEMO_KEY` with rate limits)

| Variable | Required | Description |
|---|---|---|
| `DB_USER` | Yes | PostgreSQL username |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_NAME` | Yes | Database name |
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `DB_PORT` | Yes | PostgreSQL port (default `5432`) |
| `PORT` | Yes | Backend server port (default `5000`) |
| `NASA_API_KEY` | No | NASA API key (defaults to `DEMO_KEY`) |
| `JPL_HORIZONS_BASE_URL` | No | JPL Horizons API base URL |
| `JPL_SENTRY_BASE_URL` | No | JPL Sentry API base URL |
| `JPL_SBDB_BASE_URL` | No | JPL SBDB API base URL |
| `TRAJECTORY_CACHE_TTL_HOURS` | No | Trajectory cache TTL in hours (default `168`) |
| `IMPACT_RISK_CACHE_TTL_HOURS` | No | Impact risk cache TTL in hours (default `168`) |

## Available Scripts

### One-Command Startup

| Command | Description |
|---|---|
| `npm run start:all` | Init DB → sync data → start both backend & frontend concurrently |

### Backend (root directory)

| Command | Description |
|---|---|
| `npm start` | Start production server (`node src/server.js`) |
| `npm run dev` | Start backend + frontend concurrently with `nodemon` auto-restart |
| `npm run dev:backend` | Start backend only with `nodemon` |
| `npm run dev:frontend` | Start frontend only |
| `npm run db:init` | Initialize database schema from `src/database/schema.sql` |
| `npm run db:sync` | Fetch asteroid data from NASA and upsert into PostgreSQL |

### Frontend (`frontend/` directory)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR on `http://localhost:5173` |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run Oxlint |
| `npm test` | Run Vitest tests |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/asteroids` | List all asteroids (with optional `?hazardous=true` filter) |
| `GET` | `/api/asteroids/:id` | Get a single asteroid by ID |
| `GET` | `/api/dashboard/stats` | Dashboard summary — total, hazardous count, highest risk asteroid |
| `POST` | `/api/asteroids/:id/impact-risk` | Calculate impact risk for an asteroid |
| `GET` | `/api/health` | Health check |

## Technologies Used

### Backend
- Node.js
- Express.js
- PostgreSQL (`pg`)
- dotenv
- cors

### Frontend
- React
- Vite
- Vitest + `@testing-library/react` (testing)
- React Three Fiber / Three.js (3D simulation scene)
- Chart.js / react-chartjs-2
- React Router

## Development Notes

- The backend automatically performs an initial NASA data sync on startup and schedules periodic syncs every 24 hours.
- The frontend `src/api/axios.js` client has its `baseURL` pointed at the backend API.
- Component tests in `frontend/src/components/simulation/` mock child WebGL/R3F components and the API layer.
- `db:init` is idempotent — it safely skips tables that already exist.

