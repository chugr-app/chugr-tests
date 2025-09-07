-- Initialize ClickHouse test database
-- This script runs when the ClickHouse container starts

-- Create test database
CREATE DATABASE IF NOT EXISTS chugr_test;

-- Use test database
USE chugr_test;

-- Create test user
CREATE USER IF NOT EXISTS test_user IDENTIFIED BY 'test_password';

-- Grant permissions
GRANT ALL ON chugr_test.* TO test_user;

-- Create test tables for analytics
CREATE TABLE IF NOT EXISTS user_events (
    id UUID DEFAULT generateUUIDv4(),
    user_id String,
    event_type String,
    event_data String,
    timestamp DateTime DEFAULT now(),
    date Date DEFAULT toDate(now())
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (user_id, timestamp)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT generateUUIDv4(),
    user_id String,
    session_start DateTime,
    session_end DateTime,
    duration UInt32,
    date Date DEFAULT toDate(session_start)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (user_id, session_start)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS matching_events (
    id UUID DEFAULT generateUUIDv4(),
    user1_id String,
    user2_id String,
    action String, -- 'swipe', 'match', 'unmatch'
    timestamp DateTime DEFAULT now(),
    date Date DEFAULT toDate(now())
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (user1_id, timestamp)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT generateUUIDv4(),
    service_name String,
    endpoint String,
    response_time_ms UInt32,
    status_code UInt16,
    timestamp DateTime DEFAULT now(),
    date Date DEFAULT toDate(now())
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (service_name, timestamp)
SETTINGS index_granularity = 8192;

-- Create materialized views for common queries
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_active_users
ENGINE = SummingMergeTree()
PARTITION BY date
ORDER BY date
AS SELECT
    date,
    uniqExact(user_id) as active_users
FROM user_events
GROUP BY date;

CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_matches
ENGINE = SummingMergeTree()
PARTITION BY date
ORDER BY (date, hour)
AS SELECT
    date,
    toHour(timestamp) as hour,
    countIf(action = 'match') as matches_count
FROM matching_events
GROUP BY date, hour;

-- Insert some test data
INSERT INTO user_events (user_id, event_type, event_data) VALUES
('user-1', 'login', '{"ip": "127.0.0.1"}'),
('user-2', 'login', '{"ip": "127.0.0.1"}'),
('user-1', 'swipe', '{"target_user": "user-2", "action": "like"}'),
('user-2', 'swipe', '{"target_user": "user-1", "action": "like"}');

INSERT INTO matching_events (user1_id, user2_id, action) VALUES
('user-1', 'user-2', 'swipe'),
('user-2', 'user-1', 'swipe'),
('user-1', 'user-2', 'match');

INSERT INTO performance_metrics (service_name, endpoint, response_time_ms, status_code) VALUES
('api-gateway', '/health', 45, 200),
('user-service', '/api/v1/users/profile', 120, 200),
('matching-service', '/api/v1/matching/swipe', 80, 200);

-- Create a function to clean test data
CREATE OR REPLACE FUNCTION clean_test_data()
RETURNS void AS $$
BEGIN
    DELETE FROM user_events WHERE user_id NOT LIKE 'user-%';
    DELETE FROM user_sessions WHERE user_id NOT LIKE 'user-%';
    DELETE FROM matching_events WHERE user1_id NOT LIKE 'user-%' OR user2_id NOT LIKE 'user-%';
    DELETE FROM performance_metrics WHERE service_name NOT IN ('api-gateway', 'user-service', 'matching-service');
END;
$$ LANGUAGE plpgsql;
