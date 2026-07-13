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
