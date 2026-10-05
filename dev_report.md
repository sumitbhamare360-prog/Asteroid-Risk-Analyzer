# AstraGuard Development Report

Last updated: 2026-09-23

## Purpose

This report tracks implementation of the Simulation module, subsequent repairs, verification, and remaining operational checks. It is updated with each material change so the feature can be reviewed without reconstructing history from source files.

## Status summary

| Area | Status | Notes |
| --- | --- | --- |
| Simulation UI and navigation | Implemented | Route, sidebar link, 3D scene, timeline, details panel, responsive layout, and disclaimer are present. |
| JPL endpoint repair | Implemented | Correct official Horizons, Sentry, and SBDB defaults are configured. |
| Per-source failure handling | Implemented | Horizons and Sentry failures return an available simulation bundle with explicit unavailable data, not a whole-page 500. |
| Persistent simulation cache | Implemented | Trajectory runs/points and impact-risk records are stored in Postgres with TTL checks. |
| Existing database migration | Implemented | `src/database/migrations/001_simulation.sql` creates feature tables and safely removes close-approach duplicates before the unique constraint. |
| Automated tests | Passing | Backend: 13 Jest tests. Frontend: 21 Vitest tests. |
| Live database/JPL end-to-end validation | Pending | Requires a running configured Postgres database and backend. |

## Repair log

### 2026-09-23 - Repair: universal simulation request failure

Reported symptom: every selected asteroid showed the generic simulation-data error.

Root cause confirmed: all three JPL API defaults used documentation-style or nonexistent paths. The correct endpoints are now:

| Source | Config key | Correct endpoint |
| --- | --- | --- |
| JPL Horizons | `JPL_HORIZONS_BASE_URL` | `https://ssd.jpl.nasa.gov/api/horizons.api` |
| JPL Sentry | `JPL_SENTRY_BASE_URL` | `https://ssd-api.jpl.nasa.gov/sentry.api` |
| JPL SBDB | `JPL_SBDB_BASE_URL` | `https://ssd-api.jpl.nasa.gov/sbdb.api` |

Implemented changes:

1. Corrected the defaults in `src/config.js` and examples in `.env.example`.
2. Checked the local `.env`; it does not currently define any JPL base-URL override, so no local credential/config edit was needed. If an environment later sets these variables, it must use the endpoints above.
3. Reworked bundled simulation retrieval so a trajectory or Sentry failure degrades only that source. The response still includes asteroid metadata and close-approach history.
4. Replaced display-name JPL lookups with the persisted NeoWs asteroid ID/SPK-ID lookup. This avoids parentheses and display-name ambiguity.
5. Corrected Sentry field handling to use the object `summary` for aggregate probability, energy, velocity, Palermo, and Torino values, while retaining individual virtual impactors separately.
6. Added a visible JPL Horizons unavailable notice when a trajectory source fails.

## Feature implementation record

### Backend

- Added `src/services/simulationService.js` with JPL calls, one retry, timeout, per-asteroid in-flight request coalescing, response validation, and Postgres cache access.
- Added `src/routes/simulation.js` with:
  - `GET /api/asteroids/:id/trajectory`
  - `GET /api/asteroids/:id/impact-risk`
  - `GET /api/asteroids/:id/simulation`
- Mounted the simulation router without changing the response contracts of the three original API endpoints.
- Added trajectory and impact-risk tables to the bootstrap schema and a one-time migration for existing databases.
- Added `close_approaches(asteroid_id, approach_date)` uniqueness and changed sync insertion to upsert, preventing future duplicates.

### Frontend

- Added Three.js, React Three Fiber, and Drei dependencies.
- Added `/simulation` and the sidebar entry.
- Added the scene, animation controls, source-labelled details panel, loading/error states, responsive CSS, and data-source disclaimer.
- Changed the frontend API client to honor `VITE_API_BASE_URL`; added `frontend/.env.example`.

### Testing and verification

- `npm test -- --runInBand`: passed, 13/13 backend tests.
- `npm test --prefix frontend`: passed, 21/21 frontend tests.
- `npm run build --prefix frontend`: passed during the prior verification pass. Vite reports a non-blocking bundle-size warning due to 3D dependencies.
- `git diff --check`: passed.

## Remaining plan

1. Apply `src/database/migrations/001_simulation.sql` once to any pre-existing database.
2. Restart the backend after deployment/config changes.
3. Exercise the three simulation endpoints against at least three stored asteroids; include numbered and provisional-designation objects.
4. Temporarily use an invalid Sentry URL in a non-production environment and verify trajectory/close-approach data still loads while Impact Assessment is marked unavailable.
5. Consider lazy-loading the simulation route if the Vite bundle-size warning becomes material.

## Known limitations

- JPL rate limits, maintenance, invalid identifiers, and unavailable records can still prevent an individual external source from returning data. The UI now reports this per source and does not invent official risk information.
- Sentry absence is deliberately represented as “No JPL Sentry assessment currently available,” never as zero impact probability.
- Existing historical close-approach duplicates are only removed when the migration is applied; the sync upsert prevents new duplicates after that point.
