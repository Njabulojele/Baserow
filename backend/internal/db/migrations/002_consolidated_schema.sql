-- Migration: 002_consolidated_schema.sql
-- Description: Consolidated Go-native SQL schema replacing Prisma models for Baserow OS.
-- Enforces strict ownership (user_id TEXT NOT NULL), snake_case naming, and explicit constraints.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    industry TEXT,
    status TEXT DEFAULT 'active',
    health_score INT DEFAULT 85,
    outstanding_balance_zar NUMERIC(12, 2) DEFAULT 0.00,
    lifetime_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    last_contact_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_user_status ON clients(user_id, status) WHERE deleted_at IS NULL;

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'medium',
    color TEXT DEFAULT '#10B981',
    completion_percentage FLOAT DEFAULT 0.0,
    actual_hours_spent FLOAT DEFAULT 0.0,
    revenue_zar NUMERIC(12, 2) DEFAULT 0.00,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status) WHERE deleted_at IS NULL;

-- 3. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    priority TEXT NOT NULL DEFAULT 'medium',
    estimated_minutes INT DEFAULT 0,
    actual_minutes INT DEFAULT 0,
    due_date TIMESTAMPTZ,
    scheduled_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timer_running BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(user_id, due_date) WHERE deleted_at IS NULL;

-- 4. GOALS TABLE
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    status TEXT DEFAULT 'on_track',
    streak_days INT DEFAULT 0,
    neglect_threshold_days INT DEFAULT 3,
    completed_dates JSONB DEFAULT '[]',
    last_logged_at TIMESTAMPTZ,
    target_hours FLOAT DEFAULT 0,
    completed_hours FLOAT DEFAULT 0,
    target_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    current_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- 5. TIMER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS timer_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
    duration_seconds INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_status ON timer_sessions(user_id, status);

-- 6. TRACKLOGS TABLE
CREATE TABLE IF NOT EXISTS tracklogs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    app_name TEXT NOT NULL,
    window_title TEXT,
    category TEXT DEFAULT 'unknown',
    duration_seconds INT DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    synced_from_local BOOLEAN DEFAULT true,
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tracklogs_user_started ON tracklogs(user_id, started_at);

-- 6b. APP CATEGORIZATION RULES TABLE
CREATE TABLE IF NOT EXISTS app_rules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'user_demo',
    app_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'productive', -- 'productive', 'unproductive', 'neutral', 'focused'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_app UNIQUE (user_id, app_name)
);
CREATE INDEX IF NOT EXISTS idx_app_rules_user_app ON app_rules(user_id, app_name);

-- Default Categorization Rules Seed
INSERT INTO app_rules (id, user_id, app_name, category) VALUES
  ('rule_vscode', 'user_demo', 'Visual Studio Code', 'productive'),
  ('rule_code', 'user_demo', 'Code', 'productive'),
  ('rule_cursor', 'user_demo', 'Cursor', 'productive'),
  ('rule_term', 'user_demo', 'Terminal', 'productive'),
  ('rule_iterm', 'user_demo', 'iTerm2', 'productive'),
  ('rule_baserow', 'user_demo', 'Baserow Productivity OS', 'productive'),
  ('rule_figma', 'user_demo', 'Figma', 'productive'),
  ('rule_slack', 'user_demo', 'Slack', 'neutral'),
  ('rule_notion', 'user_demo', 'Notion', 'productive'),
  ('rule_twitter', 'user_demo', 'Twitter', 'unproductive'),
  ('rule_x', 'user_demo', 'X', 'unproductive'),
  ('rule_youtube', 'user_demo', 'YouTube', 'unproductive')
ON CONFLICT (user_id, app_name) DO NOTHING;

-- 7. CRM LEADS TABLE
CREATE TABLE IF NOT EXISTS crm_leads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    company_name TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'NEW',
    score INT DEFAULT 50,
    estimated_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    converted_to_client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_user_id ON crm_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_user_status ON crm_leads(user_id, status);

-- 8. CANVAS BOARDS TABLE
CREATE TABLE IF NOT EXISTS canvas_boards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled board',
    board_type TEXT DEFAULT 'brainstorm',
    board_data JSONB DEFAULT '{}',
    is_favorited BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canvas_boards_user_id ON canvas_boards(user_id) WHERE deleted_at IS NULL;

-- 9. PILLARS & HABITS TABLES
CREATE TABLE IF NOT EXISTS pillars (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#10B981',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pillar_id TEXT REFERENCES pillars(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily',
    target_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    habit_template_id TEXT NOT NULL REFERENCES habit_templates(id) ON DELETE CASCADE,
    logged_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (habit_template_id, logged_date)
);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, logged_date);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    entity_type TEXT,
    entity_id TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read_at);

-- 11. NUDGES TABLE
CREATE TABLE IF NOT EXISTS nudges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT,
    message TEXT,
    entity_type TEXT,
    entity_id TEXT,
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nudges_user_dismissed ON nudges(user_id, dismissed);
