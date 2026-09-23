You are working as a senior full-stack engineer inside an existing repository:

REPO: sumitbhamare360-prog/Asteroid-Risk-Analyzer
PROJECT NAME (per README/package.json): "AstraGuard Asteroid Risk Analyzer"

IMPORTANT — READ THIS BEFORE TOUCHING ANYTHING:
This repo is a small, working MVP, NOT a mature platform. Below is the
VERIFIED current state of the codebase (already audited). Do not assume any
structure beyond what is listed here. If something you need isn't listed,
inspect the actual file before writing code that depends on it.

============================================================
0. VERIFIED CURRENT STATE (as of audit)
============================================================

BACKEND (root of repo, package.json name "astra-guard-api")
- Runtime: Node.js, Express 4.18
- Entry point: src/server.js
  - Middleware: helmet, cors (open, no origin restriction), express.json()
  - Rate limit: express-rate-limit, 100 req / 15 min on all /api routes
  - Endpoints (only these three exist):
      GET /api/dashboard/stats   -> { total_asteroids, total_hazardous, highest_risk }
      GET /api/asteroids         -> list joined with latest close_approach (DISTINCT ON)
      GET /api/asteroids/:id     -> single asteroid + close_approaches[] array
  - On boot: runs syncAsteroidData() once, then every 24h via setInterval
- DB access: src/database/db.js — plain `pg` Pool, exports { query, pool }
- Config: src/config.js — validates required env vars at startup
  (DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, PORT), exits process if
  missing. Also exposes nasa.apiKey (defaults to 'DEMO_KEY').
- Sync logic: src/services/syncService.js
  - Pulls NASA NeoWs "feed" endpoint (7-day window) OR a local seed file
    (src/data/nasa_seed_data.json) when run with --seed
  - Runs one DB transaction per sync: upserts into asteroids, inserts into
    close_approaches (NO unique/composite key on asteroid_id+approach_date,
    so re-running sync can create duplicate close-approach rows), logs
    result to sync_logs
  - Calls src/utils/analyticsEngine.js -> calculateMetrics(diameterMax,
    velocityKmh, missDistanceKm) which returns { sizeClass, riskScore } via
    a hand-tuned formula (D_factor * V_factor * P_factor * 2.5, clamped
    0-10). This is AstraGuard's own derived score — NOT anything from NASA.
- DB schema (src/database/schema.sql), applied once via `npm run db:init`,
  NO migration framework:
      asteroids(id VARCHAR PK, name, absolute_magnitude, estimated_diameter_max,
                is_hazardous, custom_risk_score, size_class)
      close_approaches(id SERIAL PK, asteroid_id FK -> asteroids ON DELETE CASCADE,
                approach_date DATE, velocity_kmh, miss_distance_km)
      sync_logs(id SERIAL PK, sync_timestamp, records_processed, status)
- NO JPL Horizons, Sentry, SBDB, or Close-Approach-API integration exists.
- Tests: jest + supertest are devDependencies but there are currently NO
  test files in the repo. Test infra needs to be created, not extended.

FRONTEND (frontend/, Vite project, "type": "module")
- Stack: React 19.2, react-router-dom 7.18, chart.js 4 + react-chartjs-2,
  axios. No CSS framework — plain inline style objects + one global
  frontend/src/index.css using CSS custom properties (dark "high-contrast"
  theme: --bg-dark, --bg-panel, --accent-cyan, --accent-red, --accent-amber,
  --border-color, --text-main, --text-muted).
- No 3D/WebGL library of any kind is installed.
- Entry: frontend/src/main.jsx wraps <App/> in <BrowserRouter>.
- frontend/src/App.jsx — defines the only two routes today:
      "/"        -> DashboardOverview
      "/catalog" -> AsteroidCatalog
  Layout is <Sidebar/> + (<Header/> + <main><Routes/></main>).
- frontend/src/components/Sidebar.jsx — hardcoded <NavLink> list, currently
  just "Dashboard Overview" and "Asteroid Catalog".
- frontend/src/components/Header.jsx — static title + apiStatus badge prop
  (not currently wired to a real health check).
- frontend/src/components/DashboardOverview.jsx — fetches
  /dashboard/stats + /asteroids, renders metric cards + a Chart.js Scatter
  plot, has local filter state (hazardous-only, size class, min risk),
  opens AsteroidDetailModal by id.
- frontend/src/components/AsteroidCatalog.jsx — fetches /asteroids,
  client-side search/sort/filter, opens AsteroidDetailModal by id.
- frontend/src/components/AsteroidDetailModal.jsx — fetches
  /asteroids/:id on open, shows a modal (fixed-position overlay style
  objects, not a portal/library dialog).
- frontend/src/components/RiskBadge.jsx — pure presentational, maps a
  numeric score to Low/Moderate/High/Severe with a color dot.
- frontend/src/components/CountUp.jsx — small animated-number component.
- frontend/src/api/axios.js — a single shared axios instance:
      baseURL: 'http://localhost:5000/api' (HARDCODED, not env-driven —
      fix this as part of the integration, it currently has no .env
      wiring on the frontend at all, e.g. no VITE_API_BASE_URL)
- No global state library (no Redux/Zustand/Context store) — state is
  local to each page component, fetched with axios + useEffect.

ENV / CONFIG
- Backend .env (see .env.example): DB_USER, DB_HOST, DB_NAME, DB_PASSWORD,
  DB_PORT, PORT, NASA_API_KEY. No JPL-related vars exist yet.
- Frontend has no .env file / no Vite env vars at all today.

============================================================
1. OBJECTIVE
============================================================

Add a new "Simulation" feature to this existing AstraGuard app, as an
ADDITIVE module, without breaking or rewriting any of the verified
behavior above. The feature lets a user:

1. Pick an asteroid from the existing /asteroids catalog data.
2. Open an interactive 3D solar-system view (Three.js / React Three Fiber
   — these are NOT yet installed, so they are the one genuinely new
   frontend dependency this feature needs).
3. See that asteroid's trajectory, animated over time (play/pause/reset/
   speed control), alongside Earth and the Sun.
4. Click the asteroid in the scene to open a details panel showing:
   object info (from `asteroids` table), orbital elements (from JPL SBDB
   if needed), close-approach info (from `close_approaches`, already
   real data), and impact-risk info from JPL Sentry when available.
5. Clearly see, for every value shown, whether it came from NASA_NEOWS
   (existing), JPL_HORIZONS, JPL_SENTRY, JPL_SBDB, or is
   ASTRAGUARD_DERIVED (i.e. `custom_risk_score` / `size_class` from
   analyticsEngine.js) — never blend these silently.
6. Reach the feature via a new "Simulation" entry in Sidebar.jsx and a new
   route in App.jsx, styled with the existing CSS variables — no new
   design system, no Tailwind, no component library.

============================================================
2. DO NOT
============================================================

- Do not touch the three existing endpoints' response shapes; existing
  DashboardOverview.jsx and AsteroidCatalog.jsx must keep working
  unmodified against them.
- Do not modify analyticsEngine.js's existing formula or its meaning —
  `custom_risk_score` stays "AstraGuard-derived", full stop. Any new
  Sentry-based probability is a SEPARATE field, never merged into it.
- Do not replace the NASA NeoWs sync flow in syncService.js.
- Do not add a migration framework, ORM, ID auth layer, Docker, or
  microservices just for this feature — this is a single Express app and
  a single Postgres DB; extend schema.sql (or add a new
  `src/database/migrations/00X_simulation.sql` file if you want
  versioned changes, since there is currently no migration tool at all —
  pick the lighter option and say which one you picked and why).
- Do not build a physics/N-body engine. This visualizes JPL-provided
  ephemeris points; it does not compute them.
- Do not call JPL Horizons/Sentry/SBDB directly from the React frontend.
  All JPL calls are backend-side, cached in Postgres, exposed via new
  AstraGuard API routes.
- Do not invent an impact probability from diameter/velocity/miss-distance.
  If no Sentry record exists for an asteroid, the UI must say something
  like "No JPL Sentry assessment currently available" — never 0% or blank.
- Do not hardcode the frontend API base URL in new code the way
  frontend/src/api/axios.js currently does — introduce
  VITE_API_BASE_URL (or reuse the existing hardcoded value only if you
  also fix the existing file to use the same env var, noting that as a
  small cleanup, not a rewrite).

============================================================
3. NEW BACKEND WORK
============================================================

A. New tables (extend schema.sql or add a migrations file — your call,
   just state which):
   - trajectory_runs(id, asteroid_id FK -> asteroids, source, start_time,
     end_time, step_size, generated_at)
   - trajectory_points(id, trajectory_run_id FK, timestamp, x, y, z, vx,
     vy, vz) — indexed on (trajectory_run_id, timestamp)
   - impact_risk(id, asteroid_id FK -> asteroids, source, impact_probability,
     impact_date_range, impact_energy, impact_velocity, palermo_scale,
     torino_scale, potential_impacts, retrieved_at, raw_metadata JSONB)
   Add a UNIQUE constraint on close_approaches(asteroid_id, approach_date)
   while you're in schema.sql, since the current sync can duplicate rows —
   call this out explicitly as a small bugfix, separate from the new
   feature.

B. New service: src/services/simulationService.js
   - fetchTrajectory(asteroidId) — checks trajectory_runs/points for a
     fresh cached run first; if stale/missing, calls JPL Horizons
     (https://ssd-api.jpl.nasa.gov/doc/horizons.html), validates units
     (AU vs km, TDB vs UTC — normalize to one internal unit and document
     which), stores it, returns normalized points.
   - fetchImpactRisk(asteroidId) — checks impact_risk table for freshness;
     if stale/missing, calls JPL Sentry
     (https://ssd-api.jpl.nasa.gov/doc/sentry.html) by designation; if no
     Sentry record exists, store/return an explicit "no assessment"
     result, not a zero.
   - fetchOrbitalElements(asteroidId) — optional, only add if Horizons
     output doesn't already carry what the UI needs; use JPL SBDB
     (https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html) only then.
   - All JPL calls: timeout + retry-once + no duplicate concurrent
     in-flight requests per asteroid (a simple in-memory Map of pending
     promises keyed by asteroid id is enough here, no queue/broker needed).

C. New routes in src/server.js (or split into src/routes/simulation.js and
   mount it — reasonable either way given the current single-file style,
   pick whichever keeps server.js readable and say why):
      GET /api/asteroids/:id/trajectory
      GET /api/asteroids/:id/impact-risk
      GET /api/asteroids/:id/simulation   (bundles both + the existing
                                            asteroid record in one call,
                                            to avoid 3 round trips from
                                            the frontend)
   Reuse the existing 404-on-missing-asteroid pattern already in
   GET /api/asteroids/:id.

D. New env vars (add to .env.example, keep out of git for real .env):
      JPL_HORIZONS_BASE_URL, JPL_SENTRY_BASE_URL, JPL_SBDB_BASE_URL,
      TRAJECTORY_CACHE_TTL_HOURS, IMPACT_RISK_CACHE_TTL_HOURS
   Extend src/config.js's shape (not its fail-fast required-vars list,
   unless you intend JPL integration to be mandatory for the app to boot —
   it shouldn't be, so give these sane defaults instead).

============================================================
4. NEW FRONTEND WORK
============================================================

A. Dependencies to add (none of these exist today): three,
   @react-three/fiber, @react-three/drei.

B. New route + nav entry:
   - App.jsx: add <Route path="/simulation" element={<Simulation/>} />
   - Sidebar.jsx: add one more <NavLink to="/simulation">Simulation</NavLink>
     in the same style as the two existing links — no restructuring.

C. New components under frontend/src/components/simulation/:
   - Simulation.jsx — page shell: asteroid picker (can reuse the same
     /asteroids list already fetched elsewhere, or its own lightweight
     fetch), calls GET /api/asteroids/:id/simulation, holds loading/error
     state the same way DashboardOverview.jsx and AsteroidCatalog.jsx
     already do (they don't use a shared hook today — for consistency
     don't introduce React Query/SWR just for this, match the existing
     axios+useEffect pattern unless you want to propose extracting a
     shared `useApi` hook as a small, explicitly-called-out refactor).
   - SolarSystemScene.jsx — the R3F <Canvas>: Sun, Earth, asteroid mesh,
     trajectory line from trajectory_points, OrbitControls, click handler
     on the asteroid mesh to trigger selection.
   - TimelineControls.jsx — play/pause/reset/speed buttons (1x/10x/100x),
     styled with the existing --accent-cyan / --border-color variables,
     not new colors.
   - AsteroidDetailsPanel.jsx — sections: OBJECT / ORBIT / CLOSE APPROACH
     (from the real close_approaches array, already available via the
     existing /api/asteroids/:id shape — reuse it) / IMPACT ASSESSMENT
     (labeled "Source: NASA/JPL Sentry" or the "unavailable" message) /
     ASTRAGUARD ANALYTICS (custom_risk_score + size_class, labeled
     "AstraGuard-derived" — reuse the existing RiskBadge.jsx component
     here rather than rebuilding it).

D. Responsive layout: on narrow screens, stack the canvas above the
   details panel (same breakpoint approach as whatever the existing
   index.css already uses, if any — check before inventing a new one).

E. Fix frontend/src/api/axios.js to read
   `import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'`
   and add a frontend/.env.example with VITE_API_BASE_URL=http://localhost:5000/api.

============================================================
5. UI / LANGUAGE RULES
============================================================

- Never say an asteroid "will hit Earth." Use "close approach", "JPL
  impact assessment", "impact probability", "trajectory visualization",
  "AstraGuard-derived risk score."
- Add a one-line disclaimer near the Simulation page footer: "AstraGuard
  visualizes publicly available NASA/JPL data and provides
  application-derived analytics. It is not an official planetary-defense
  warning system."
- Never label `custom_risk_score` as a NASA or official figure — it comes
  from analyticsEngine.js and must say "AstraGuard-derived."

============================================================
6. TESTING (this is greenfield — there's nothing to preserve, but also
   nothing to build on top of)
============================================================

Since jest/supertest exist as devDependencies but no test file exists yet:
- Add jest config (jest.config.js or a "jest" key in package.json) if
  missing.
- Backend: supertest tests for the three NEW routes — happy path, missing
  asteroid (404), Sentry-record-absent case, malformed/mocked JPL
  response (validation should reject, not store garbage).
- Do NOT write tests retroactively for the three pre-existing endpoints
  unless asked — that's out of scope for this feature; mention it as a
  suggested follow-up instead.
- Frontend: at minimum, a render test for Simulation.jsx covering
  loading / error / loaded states, and a play/pause interaction test for
  TimelineControls.jsx.

============================================================
7. IMPLEMENTATION ORDER
============================================================

PHASE A — Confirm the verified state above still matches the repo (things
          may have changed since this prompt was written; re-check
          package.json, schema.sql, App.jsx, and api/axios.js first).
PHASE B — Schema changes (trajectory_runs, trajectory_points, impact_risk,
          + the close_approaches unique-constraint fix), applied the same
          way schema.sql is applied today.
PHASE C — simulationService.js: Horizons integration + caching.
PHASE D — simulationService.js: Sentry integration + "unavailable" path.
PHASE E — New routes wired into server.js (or a new routes file).
PHASE F — Install three/@react-three/fiber/@react-three/drei; scaffold
          Simulation.jsx + route + Sidebar entry (page renders with mock/
          empty data first, to confirm nav + layout before wiring data).
PHASE G — SolarSystemScene.jsx: static Sun/Earth/asteroid + trajectory line.
PHASE H — TimelineControls.jsx: play/pause/reset/speed, driving the scene.
PHASE I — AsteroidDetailsPanel.jsx wired to the real /simulation endpoint
          response, with correct source labeling throughout.
PHASE J — Error/loading/empty states for every fetch.
PHASE K — Tests (backend routes, frontend states/interactions).
PHASE L — Manually re-verify: dashboard, catalog, existing modal, and
          sync (`npm run db:sync`) all still work exactly as before.

============================================================
8. DELIVERABLES TO REPORT BACK
============================================================

1. Confirmation the 3 pre-existing endpoints and 2 pre-existing pages are
   unchanged and working.
2. New files created (list).
3. Existing files modified, and exactly what changed in each (esp.
   schema.sql, server.js, App.jsx, Sidebar.jsx, api/axios.js).
4. New tables/columns and why each is needed.
5. New endpoints and their response shapes.
6. New env vars (backend and frontend).
7. New dependencies installed.
8. Test results.
9. Known limitations (e.g. Horizons/Sentry rate limits, unresolved
   close_approaches duplication history from before the unique
   constraint was added).
10. Manual test steps for a reviewer to follow.
