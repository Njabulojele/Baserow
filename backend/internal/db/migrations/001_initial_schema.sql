-- Anchor Database Migration 001: Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    industry VARCHAR(100),
    health_score INT DEFAULT 85,
    last_contact_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    priority VARCHAR(50) DEFAULT 'medium',
    color VARCHAR(50) DEFAULT '#10B981',
    completion_percentage FLOAT DEFAULT 0.0,
    actual_hours_spent FLOAT DEFAULT 0.0,
    revenue_zar NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, in_review, done
    priority VARCHAR(50) DEFAULT 'medium',
    estimated_minutes INT DEFAULT 0,
    actual_minutes INT DEFAULT 0,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Goals Table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    status VARCHAR(50) DEFAULT 'on_track', -- on_track, at_risk, neglected
    streak_days INT DEFAULT 0,
    neglect_threshold_days INT DEFAULT 3,
    last_logged_at TIMESTAMPTZ,
    target_hours FLOAT DEFAULT 0,
    completed_hours FLOAT DEFAULT 0,
    target_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    current_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Timer Sessions Table
CREATE TABLE IF NOT EXISTS timer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    duration_seconds INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, auto_ended
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 6. Tracklogs Table
CREATE TABLE IF NOT EXISTS tracklogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) DEFAULT 'default_user',
    app_name VARCHAR(255) NOT NULL,
    window_title TEXT,
    duration_seconds INT DEFAULT 0,
    category VARCHAR(50) DEFAULT 'productive', -- productive, focused, unproductive
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 7. App Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Client Portal Access Tokens Table
CREATE TABLE IF NOT EXISTS portal_tokens (
    token VARCHAR(255) PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Sub-100ms Performance
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_status ON timer_sessions(status);
CREATE INDEX IF NOT EXISTS idx_tracklogs_timestamp ON tracklogs(timestamp);
