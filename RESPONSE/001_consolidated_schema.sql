-- Anchor Database Migration 002: Consolidated schema, Go-native, full Prisma replacement
--
-- Assumption worth confirming: Clerk user ids are strings like "user_2abc123xyz", not
-- UUIDs. So user_id is VARCHAR(255) everywhere below, not UUID. If you'd rather have a
-- local `users` table with a UUID surrogate key and a clerk_id lookup column, that's a
-- valid alternative, but it adds a join to every ownership check for no real benefit at
-- your current scale, so this version skips it.
--
-- Run this against a fresh database or a copy first. It is NOT a safe in-place migration
-- for a database that already has Prisma-managed data in the old PascalCase tables. If
-- you're porting real data, write a one-time data migration script after this DDL runs
-- that copies rows from "Client", "Project", "Task", "CrmLead", "CanvasBoard", "Pillar",
-- "HabitTemplate", "HabitLog", "Notification" into the tables below, backfilling user_id
-- from whatever the old ownership column was.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. Clients
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    industry VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    health_score INT DEFAULT 85,
    outstanding_balance_zar NUMERIC(12, 2) DEFAULT 0.00,
    lifetime_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    last_contact_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. Projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    priority VARCHAR(50) DEFAULT 'medium',
    color VARCHAR(50) DEFAULT '#10B981',
    completion_percentage FLOAT DEFAULT 0.0,
    actual_hours_spent FLOAT DEFAULT 0.0,
    revenue_zar NUMERIC(12, 2) DEFAULT 0.00,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- ============================================================================
-- 3. Tasks
-- Denormalized user_id here too (not just via project_id) since the current handlers
-- filter directly on t."userId" and tasks can outlive/outrank their project context.
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    estimated_minutes INT DEFAULT 0,
    actual_minutes INT DEFAULT 0,
    due_date TIMESTAMPTZ,
    scheduled_date TIMESTAMPTZ,
    timer_running BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_task_status CHECK (status IN ('not_started','in_progress','in_review','done')),
    CONSTRAINT chk_task_priority CHECK (priority IN ('low','medium','high','urgent'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status) WHERE deleted_at IS NULL;

-- ============================================================================
-- 4. Goals
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    status VARCHAR(50) DEFAULT 'on_track',
    streak_days INT DEFAULT 0,
    neglect_threshold_days INT DEFAULT 3,
    completed_dates JSONB DEFAULT '[]',
    last_logged_at TIMESTAMPTZ,
    target_hours FLOAT DEFAULT 0,
    completed_hours FLOAT DEFAULT 0,
    target_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    current_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_goal_status CHECK (status IN ('on_track','at_risk','neglected'))
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- ============================================================================
-- 5. Timer sessions (user_id added for a direct check without joining to task/project)
-- ============================================================================
CREATE TABLE IF NOT EXISTS timer_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    duration_seconds INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    CONSTRAINT chk_timer_status CHECK (status IN ('active','completed','auto_ended'))
);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_id ON timer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_status ON timer_sessions(status);

-- ============================================================================
-- 6. Tracklogs (Electron desktop activity)
-- Default changed from 'default_user' to NOT NULL with no default, so a missing user_id
-- fails loudly at insert time instead of silently landing on a shared placeholder row.
-- ============================================================================
CREATE TABLE IF NOT EXISTS tracklogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    app_name VARCHAR(255) NOT NULL,
    window_title TEXT,
    category VARCHAR(50) DEFAULT 'unknown',
    duration_seconds INT DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    synced_from_local BOOLEAN DEFAULT true,
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tracklogs_user_timestamp ON tracklogs(user_id, "timestamp");

-- ============================================================================
-- 7. App settings (per user, was global before)
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
    user_id VARCHAR(255) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
);

-- ============================================================================
-- 8. Portal tokens (client-scoped; user_id kept for a direct ownership check)
-- ============================================================================
CREATE TABLE IF NOT EXISTS portal_tokens (
    token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_client_id ON portal_tokens(client_id);

-- ============================================================================
-- 9. CRM Leads (ported from Prisma "CrmLead")
-- ============================================================================
CREATE TABLE IF NOT EXISTS crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    company_name VARCHAR(255),
    source VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    score INT DEFAULT 50,
    estimated_value_zar NUMERIC(12, 2) DEFAULT 0.00,
    converted_to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_lead_status CHECK (status IN ('NEW','CONTACTED','QUALIFIED','PROPOSAL','WON','LOST'))
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_user_id ON crm_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_user_status ON crm_leads(user_id, status);

-- ============================================================================
-- 10. Canvas boards (ported from Prisma "CanvasBoard")
-- board_data left as JSONB per the original design; the API layer enforces a size cap
-- (see handlers/canvas.go), Postgres itself won't stop an oversized document.
-- ============================================================================
CREATE TABLE IF NOT EXISTS canvas_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled board',
    board_type VARCHAR(50) DEFAULT 'brainstorm',
    board_data JSONB DEFAULT '{}',
    is_favorited BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_canvas_boards_user_id ON canvas_boards(user_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 11. Habits: Pillars, Habit Templates, Habit Logs (ported from Prisma)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pillars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#10B981',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pillars_user_id ON pillars(user_id);

CREATE TABLE IF NOT EXISTS habit_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    pillar_id UUID REFERENCES pillars(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(50) DEFAULT 'daily',
    target_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_habit_templates_user_id ON habit_templates(user_id);

CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    habit_template_id UUID NOT NULL REFERENCES habit_templates(id) ON DELETE CASCADE,
    logged_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (habit_template_id, logged_date)
);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON habit_logs(user_id);

-- ============================================================================
-- 12. Notifications (ported from Prisma)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    entity_type VARCHAR(50),
    entity_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

-- ============================================================================
-- Sanity check after running: every table below should return 0 rows once the app
-- is in normal use, since it means a row exists with no owner.
-- ============================================================================
-- SELECT 'clients' t, count(*) FROM clients WHERE user_id IS NULL OR user_id = ''
-- UNION ALL SELECT 'projects', count(*) FROM projects WHERE user_id IS NULL OR user_id = ''
-- UNION ALL SELECT 'tasks', count(*) FROM tasks WHERE user_id IS NULL OR user_id = ''
-- UNION ALL SELECT 'goals', count(*) FROM goals WHERE user_id IS NULL OR user_id = '';
