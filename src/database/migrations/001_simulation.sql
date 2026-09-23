-- Apply once to an existing AstraGuard database. New installations receive
-- the same definitions from schema.sql.
CREATE TABLE IF NOT EXISTS trajectory_runs (
    id SERIAL PRIMARY KEY,
    asteroid_id VARCHAR(20) REFERENCES asteroids(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    step_size INTERVAL NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trajectory_points (
    id SERIAL PRIMARY KEY,
    trajectory_run_id INTEGER REFERENCES trajectory_runs(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    x NUMERIC(20,6) NOT NULL,
    y NUMERIC(20,6) NOT NULL,
    z NUMERIC(20,6) NOT NULL,
    vx NUMERIC(20,6), vy NUMERIC(20,6), vz NUMERIC(20,6)
);
CREATE INDEX IF NOT EXISTS idx_trajectory_points_run_time ON trajectory_points(trajectory_run_id, timestamp);

CREATE TABLE IF NOT EXISTS impact_risk (
    id SERIAL PRIMARY KEY,
    asteroid_id VARCHAR(20) REFERENCES asteroids(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    impact_probability NUMERIC(10,8), impact_date_range TEXT,
    impact_energy NUMERIC(10,3), impact_velocity NUMERIC(10,3),
    palermo_scale NUMERIC(5,2), torino_scale INTEGER, potential_impacts JSONB,
    retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, raw_metadata JSONB
);

-- Historical duplicates must be removed before adding the uniqueness guard.
DELETE FROM close_approaches older
USING close_approaches newer
WHERE older.asteroid_id = newer.asteroid_id
  AND older.approach_date = newer.approach_date
  AND older.id < newer.id;

ALTER TABLE close_approaches
  ADD CONSTRAINT unique_asteroid_approach_date UNIQUE (asteroid_id, approach_date);
