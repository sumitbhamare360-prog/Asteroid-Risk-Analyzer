# AstraGuard Asteroid Risk Analyzer

A full-stack application that visualizes near-Earth asteroid data and calculates custom risk scores. Built with a Node.js/Express backend and a React + Vite frontend.

## Prerequisites

- **Node.js** v14+ (backend) and v18+ (frontend)
- **PostgreSQL**

## Project Structure

```
Asteroid Risk Analyzer/
├── backend/              # Express server, database, sync services
├── frontend/            # React + Vite SPA with Vitest tests
└── README.md            # This file
```

## Installation

1. Clone the repository.
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
4. **Environment Configuration (backend):**
   - Copy `.env.example` to `.env` and fill in `DB_PASSWORD`, `NASA_API_KEY`, and other variables.
   - Default PostgreSQL connection targets a local installation.

## Available Scripts

### Backend

- `npm start` — Start production server.
- `npm run dev` — Start dev server with `nodemon` auto-restart.
- `npm run db:init` — Initialize database schema.
- `npm run db:sync` — Sync/fetch asteroid risk data into PostgreSQL.

### Frontend

- `npm run dev` — Start Vite dev server with HMR.
- `npm run build` — Build production bundle.
- `npm run preview` — Preview production build locally.
- `npm run lint` — Run Oxlint.
- `npm test` — Run Vitest tests.

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
- Vitest (test runner) + @testing-library/react
- React Three Fiber / Three.js (simulation scene)
- Chart.js

## Development Notes

- The backend exposes a single `axios` API client (`frontend/src/api/axios.js`) whose `baseURL` points to the backend.
- Test coverage uses Vitest under `vite.config.js`; component tests mock child WebGL/R3F components and the API layer.

