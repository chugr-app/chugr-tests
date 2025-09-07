-- Initialize PostgreSQL test database
-- This script runs when the PostgreSQL container starts

-- Create test database if it doesn't exist
SELECT 'CREATE DATABASE chugr_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'chugr_test')\gexec

-- Connect to test database
\c chugr_test;

-- Create test user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'test_user') THEN
        CREATE ROLE test_user WITH LOGIN PASSWORD 'test_password';
    END IF;
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE chugr_test TO test_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO test_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO test_user;

-- Create test tables (basic structure for testing)
CREATE TABLE IF NOT EXISTS test_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    age INTEGER CHECK (age >= 18 AND age <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES test_users(id),
    user2_id UUID NOT NULL REFERENCES test_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS test_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    organizer_id UUID NOT NULL REFERENCES test_users(id),
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER DEFAULT 10,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_users_email ON test_users(email);
CREATE INDEX IF NOT EXISTS idx_test_users_username ON test_users(username);
CREATE INDEX IF NOT EXISTS idx_test_matches_user1 ON test_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_test_matches_user2 ON test_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_test_events_organizer ON test_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_test_events_date_time ON test_events(date_time);

-- Insert some test data
INSERT INTO test_users (email, username, password_hash, first_name, last_name, age) VALUES
('test1@example.com', 'testuser1', '$2b$10$test.hash.1', 'Test', 'User1', 25),
('test2@example.com', 'testuser2', '$2b$10$test.hash.2', 'Test', 'User2', 28),
('admin@example.com', 'admin', '$2b$10$test.hash.admin', 'Admin', 'User', 30)
ON CONFLICT (email) DO NOTHING;

-- Create a function to clean test data
CREATE OR REPLACE FUNCTION clean_test_data()
RETURNS void AS $$
BEGIN
    DELETE FROM test_matches;
    DELETE FROM test_events;
    DELETE FROM test_users WHERE email NOT LIKE '%@example.com';
END;
$$ LANGUAGE plpgsql;

-- Create a function to reset sequences
CREATE OR REPLACE FUNCTION reset_test_sequences()
RETURNS void AS $$
BEGIN
    -- Reset any sequences if they exist
    PERFORM setval(pg_get_serial_sequence('test_users', 'id'), 1, false);
END;
$$ LANGUAGE plpgsql;
