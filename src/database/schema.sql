CREATE TABLE asteroids (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    absolute_magnitude NUMERIC(5,2),
    estimated_diameter_max NUMERIC(10,3),
    is_hazardous BOOLEAN NOT NULL,
    custom_risk_score NUMERIC(5,2),
    size_class VARCHAR(20)
);

CREATE TABLE close_approaches (
    id SERIAL PRIMARY KEY,
    asteroid_id VARCHAR(20) REFERENCES asteroids(id) ON DELETE CASCADE,
    approach_date DATE NOT NULL,
    velocity_kmh NUMERIC(12,2),
    miss_distance_km NUMERIC(15,2)
);

CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    records_processed INTEGER,
    status VARCHAR(20)
);

CREATE TABLE trajectory_runs (
    id SERIAL PRIMARY KEY,
    asteroid_id VARCHAR(20) REFERENCES asteroids(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    step_size INTERVAL NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trajectory_points (
    id SERIAL PRIMARY KEY,
    trajectory_run_id INTEGER REFERENCES trajectory_runs(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    x NUMERIC(20,6) NOT NULL,
    y NUMERIC(20,6) NOT NULL,
    z NUMERIC(20,6) NOT NULL,
    vx NUMERIC(20,6),
    vy NUMERIC(20,6),
    vz NUMERIC(20,6)
);

CREATE INDEX idx_trajectory_points_run_time ON trajectory_points(trajectory_run_id, timestamp);

CREATE TABLE impact_risk (
    id SERIAL PRIMARY KEY,
    asteroid_id VARCHAR(20) REFERENCES asteroids(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL,
    impact_probability NUMERIC(10,8),
    impact_date_range TEXT,
    impact_energy NUMERIC(10,3),
    impact_velocity NUMERIC(10,3),
    palermo_scale NUMERIC(5,2),
    torino_scale INTEGER,
    potential_impacts JSONB,
    retrieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_metadata JSONB
);

ALTER TABLE close_approaches ADD CONSTRAINT unique_asteroid_approach_date UNIQUE (asteroid_id, approach_date);
