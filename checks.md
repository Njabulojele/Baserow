## -- Anchor Database Migration 002: Consolidated schema, Go-native, full Prisma replacement

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
-- SELECT 'clients' t, count(_) FROM clients WHERE user_id IS NULL OR user_id = ''
-- UNION ALL SELECT 'projects', count(_) FROM projects WHERE user_id IS NULL OR user_id = ''
-- UNION ALL SELECT 'tasks', count(_) FROM tasks WHERE user_id IS NULL OR user_id = ''
-- UNION ALL SELECT 'goals', count(_) FROM goals WHERE user_id IS NULL OR user_id = '';

package handlers

import (
"context"
"fmt"
"time"

    "anchor/internal/auth"
    "anchor/internal/db"
    "github.com/jackc/pgx/v5/pgxpool"

)

func GetTasks(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
rows, err := pool.Query(ctx, `
		SELECT id, project_id, title, description, status, priority,
		       estimated_minutes, actual_minutes, due_date, scheduled_date, timer_running,
		       created_at, updated_at
		FROM tasks
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY updated_at DESC`, userID)
if err != nil {
return nil, err
}
defer rows.Close()

    var tasks []map[string]interface{}
    for rows.Next() {
    	var t taskRow
    	if err := scanTaskRow(rows, &t); err != nil {
    		return nil, err
    	}
    	tasks = append(tasks, t.toMap())
    }
    return tasks, rows.Err()

}

// GetTodaysTasks previously ignored the "today" part of its own name, returning every
// incomplete task regardless of due date. This filters on scheduled_date/due_date
// actually falling within the current day.
func GetTodaysTasks(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
rows, err := pool.Query(ctx, `
		SELECT id, project_id, title, description, status, priority,
		       estimated_minutes, actual_minutes, due_date, scheduled_date, timer_running,
		       created_at, updated_at
		FROM tasks
		WHERE user_id = $1 AND deleted_at IS NULL
		  AND status != 'done'
		  AND (
		    (scheduled_date IS NOT NULL AND scheduled_date::date = CURRENT_DATE)
		    OR (due_date IS NOT NULL AND due_date::date = CURRENT_DATE)
		    OR (due_date IS NOT NULL AND due_date::date < CURRENT_DATE) -- overdue surfaces here too
		  )
		ORDER BY due_date ASC NULLS LAST`, userID)
if err != nil {
return nil, err
}
defer rows.Close()

    var tasks []map[string]interface{}
    for rows.Next() {
    	var t taskRow
    	if err := scanTaskRow(rows, &t); err != nil {
    		return nil, err
    	}
    	tasks = append(tasks, t.toMap())
    }
    return tasks, rows.Err()

}

func CreateTask(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
title, _ := input["title"].(string)
description, _ := input["description"].(string)
projectID, _ := input["projectId"].(string)
status, _ := input["status"].(string)
priority, \_ := input["priority"].(string)

    if title == "" {
    	return nil, fmt.Errorf("title is required")
    }
    if err := validateMaxLen("title", title, 255); err != nil {
    	return nil, err
    }
    if status == "" {
    	status = "not_started"
    } else if err := validateEnum("status", status, TaskStatuses); err != nil {
    	return nil, err
    }
    if priority == "" {
    	priority = "medium"
    } else if err := validateEnum("priority", priority, TaskPriorities); err != nil {
    	return nil, err
    }

    // Previously both dueDate and scheduledDate defaulted to time.Now(), which meant
    // every new task was immediately overdue. Both are left NULL unless the client
    // explicitly sets them.
    var dueDate, scheduledDate *time.Time
    if v, ok := input["dueDate"].(string); ok && v != "" {
    	if t, err := time.Parse(time.RFC3339, v); err == nil {
    		dueDate = &t
    	}
    }
    if v, ok := input["scheduledDate"].(string); ok && v != "" {
    	if t, err := time.Parse(time.RFC3339, v); err == nil {
    		scheduledDate = &t
    	}
    }

    var newID string
    err := pool.QueryRow(ctx, `
    	INSERT INTO tasks (user_id, project_id, title, description, status, priority, due_date, scheduled_date)
    	VALUES ($1, NULLIF($2,'')::uuid, $3, $4, $5, $6, $7, $8)
    	RETURNING id`,
    	userID, projectID, title, description, status, priority, dueDate, scheduledDate,
    ).Scan(&newID)
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"id": newID}, nil

}

func UpdateTask(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, \_ := input["id"].(string)
if id == "" {
return nil, fmt.Errorf("id is required")
}
if err := db.RequireOwner(ctx, pool, "tasks", id, userID, true); err != nil {
return nil, err
}

    if status, ok := input["status"].(string); ok && status != "" {
    	if err := validateEnum("status", status, TaskStatuses); err != nil {
    		return nil, err
    	}
    }

    _, err := pool.Exec(ctx, `
    	UPDATE tasks SET
    	  title = COALESCE(NULLIF($3, ''), title),
    	  status = COALESCE(NULLIF($4, ''), status),
    	  priority = COALESCE(NULLIF($5, ''), priority),
    	  updated_at = NOW()
    	WHERE id = $1 AND user_id = $2`,
    	id, userID,
    	input["title"], input["status"], input["priority"])
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"success": true}, nil

}

func DeleteTask(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, _ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "tasks", id, userID, true); err != nil {
return nil, err
}
_, err := pool.Exec(ctx, `UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID)
if err != nil {
return nil, err
}
return map[string]interface{}{"success": true}, nil
}

// StartTimer previously stopped every running timer for every user because its "stop
// all running timers first" query also carried "OR true". Both statements below are
// scoped to the calling user only, so starting a timer no longer touches anyone else's
// session.
func StartTimer(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, \_ := input["taskId"].(string)
if err := db.RequireOwner(ctx, pool, "tasks", id, userID, true); err != nil {
return nil, err
}

    tx, err := pool.Begin(ctx)
    if err != nil {
    	return nil, err
    }
    defer tx.Rollback(ctx)

    if _, err := tx.Exec(ctx, `UPDATE tasks SET timer_running = false WHERE user_id = $1 AND timer_running = true`, userID); err != nil {
    	return nil, err
    }
    if _, err := tx.Exec(ctx, `UPDATE tasks SET timer_running = true WHERE id = $1 AND user_id = $2`, id, userID); err != nil {
    	return nil, err
    }
    var sessionID string
    if err := tx.QueryRow(ctx, `
    	INSERT INTO timer_sessions (user_id, task_id, status)
    	VALUES ($1, $2, 'active') RETURNING id`, userID, id).Scan(&sessionID); err != nil {
    	return nil, err
    }
    if err := tx.Commit(ctx); err != nil {
    	return nil, err
    }
    return map[string]interface{}{"sessionId": sessionID}, nil

}

func StopTimer(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
sessionID, \_ := input["sessionId"].(string)

    var startedAt time.Time
    err := pool.QueryRow(ctx, `
    	SELECT started_at FROM timer_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'`,
    	sessionID, userID).Scan(&startedAt)
    if err != nil {
    	return nil, db.ErrNotFound
    }
    duration := int(time.Since(startedAt).Seconds())

    _, err = pool.Exec(ctx, `
    	UPDATE timer_sessions SET status = 'completed', ended_at = NOW(), duration_seconds = $3
    	WHERE id = $1 AND user_id = $2`, sessionID, userID, duration)
    if err != nil {
    	return nil, err
    }
    _, err = pool.Exec(ctx, `
    	UPDATE tasks SET timer_running = false,
    	  actual_minutes = actual_minutes + $3
    	WHERE id = (SELECT task_id FROM timer_sessions WHERE id = $1) AND user_id = $2`,
    	sessionID, userID, duration/60)
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"durationSeconds": duration}, nil

}

// --- shared scan helper ---

type taskRow struct {
ID, ProjectID, Title, Description, Status, Priority string
EstimatedMinutes, ActualMinutes int
DueDate, ScheduledDate \*time.Time
TimerRunning bool
CreatedAt, UpdatedAt interface{}
}

type rowScanner interface {
Scan(dest ...interface{}) error
}

func scanTaskRow(rows rowScanner, t \*taskRow) error {
return rows.Scan(&t.ID, &t.ProjectID, &t.Title, &t.Description, &t.Status, &t.Priority,
&t.EstimatedMinutes, &t.ActualMinutes, &t.DueDate, &t.ScheduledDate, &t.TimerRunning,
&t.CreatedAt, &t.UpdatedAt)
}

func (t \*taskRow) toMap() map[string]interface{} {
return map[string]interface{}{
"id": t.ID, "projectId": t.ProjectID, "title": t.Title, "description": t.Description,
"status": t.Status, "priority": t.Priority, "estimatedMinutes": t.EstimatedMinutes,
"actualMinutes": t.ActualMinutes, "dueDate": t.DueDate, "scheduledDate": t.ScheduledDate,
"timerRunning": t.TimerRunning, "createdAt": t.CreatedAt, "updatedAt": t.UpdatedAt,
}
}

package handlers

import (
"context"
"encoding/json"
"fmt"
"time"

    "anchor/internal/auth"
    "anchor/internal/db"
    "github.com/jackc/pgx/v5/pgxpool"

)

// Note: this assumes the consolidated migration (001_consolidated_schema.sql) has run,
// so `goals` is a real table with user_id, and the old EnsureGoalsTable() call that ran
// a schema migration on every single request has been deleted entirely. If that
// function is still being called anywhere in main.go's request path, remove it, it was
// doing real damage to request latency independent of the security issues.

func GetGoals(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
rows, err := pool.Query(ctx, `
		SELECT id, title, category, status, streak_days, neglect_threshold_days,
		       completed_dates, last_logged_at, target_hours, completed_hours,
		       target_value_zar, current_value_zar, created_at
		FROM goals WHERE user_id = $1 ORDER BY created_at DESC`, userID)
if err != nil {
return nil, err
}
defer rows.Close()

    var goals []map[string]interface{}
    for rows.Next() {
    	var (
    		id, title, category, status string
    		streakDays, neglectDays     int
    		completedDatesRaw           []byte
    		lastLoggedAt                *time.Time
    		targetHours, completedHours float64
    		targetValue, currentValue   float64
    		createdAt                   interface{}
    	)
    	if err := rows.Scan(&id, &title, &category, &status, &streakDays, &neglectDays,
    		&completedDatesRaw, &lastLoggedAt, &targetHours, &completedHours,
    		&targetValue, &currentValue, &createdAt); err != nil {
    		return nil, err
    	}
    	var completedDates []string
    	_ = json.Unmarshal(completedDatesRaw, &completedDates)

    	goals = append(goals, map[string]interface{}{
    		"id": id, "title": title, "category": category, "status": status,
    		"streak": streakDays, "neglectThresholdDays": neglectDays,
    		"completedDates": completedDates, "lastLoggedAt": lastLoggedAt,
    		"targetHours": targetHours, "completedHours": completedHours,
    		"targetValueZar": targetValue, "currentValueZar": currentValue,
    		"createdAt": createdAt,
    	})
    }
    return goals, rows.Err()

}

func CreateGoal(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
title, _ := input["title"].(string)
category, _ := input["category"].(string)
if title == "" {
return nil, fmt.Errorf("title is required")
}
if category == "" {
category = "General"
}
var newID string
err := pool.QueryRow(ctx, `
		INSERT INTO goals (user_id, title, category) VALUES ($1, $2, $3) RETURNING id`,
userID, title, category).Scan(&newID)
if err != nil {
return nil, err
}
return map[string]interface{}{"id": newID}, nil
}

// UpdateGoal previously had no ownership check at all in its WHERE clause. Fixed here
// by requiring RequireOwner first, same as everywhere else.
func UpdateGoal(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, _ := input["id"].(string)
if id == "" {
return nil, fmt.Errorf("id is required")
}
if err := db.RequireOwner(ctx, pool, "goals", id, userID, false); err != nil {
return nil, err
}
_, err := pool.Exec(ctx, `
		UPDATE goals SET
		  title = COALESCE(NULLIF($3, ''), title),
		  category = COALESCE(NULLIF($4, ''), category),
		  target_hours = COALESCE($5, target_hours),
		  target_value_zar = COALESCE($6, target_value_zar),
		  updated_at = NOW()
		WHERE id = $1 AND user_id = $2`,
id, userID, input["title"], input["category"], input["targetHours"], input["targetValueZar"])
if err != nil {
return nil, err
}
return map[string]interface{}{"success": true}, nil
}

// DeleteGoal previously ran a hard DELETE with no ownership check whatsoever. Now it's
// ownership-checked and soft-deleted would be preferable long term for the goal
// analytics history, but that needs a deleted*at column added to the schema first; for
// now this keeps the hard delete but at least only the owner can trigger it.
func DeleteGoal(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, * := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "goals", id, userID, false); err != nil {
return nil, err
}
\_, err := pool.Exec(ctx, `DELETE FROM goals WHERE id = $1 AND user_id = $2`, id, userID)
if err != nil {
return nil, err
}
return map[string]interface{}{"success": true}, nil
}

// ToggleGoalCompletion previously fetched and updated by goal id alone, no userID
// anywhere, meaning any user could toggle any other user's goal completion and inflate
// or wipe their streaks. It also trusted a client-supplied date with no bounds, which
// meant a client could log a completion for any date in the past or future to game the
// streak. Both are fixed below.
func ToggleGoalCompletion(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
goalID, \_ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "goals", goalID, userID, false); err != nil {
return nil, err
}

    dateStr, _ := input["date"].(string)
    if dateStr == "" {
    	dateStr = time.Now().Format("2006-01-02")
    }
    parsedDate, err := time.Parse("2006-01-02", dateStr)
    if err != nil {
    	return nil, fmt.Errorf("invalid date format")
    }
    now := time.Now()
    if parsedDate.After(now.Add(24 * time.Hour)) {
    	return nil, fmt.Errorf("date cannot be in the future")
    }
    if parsedDate.Before(now.AddDate(0, 0, -30)) {
    	// A month of backfill room is generous but bounded, streak inflation via an
    	// arbitrarily old date is no longer possible.
    	return nil, fmt.Errorf("date is too far in the past to log")
    }

    var completedDatesRaw []byte
    var streakDays int
    err = pool.QueryRow(ctx, `
    	SELECT completed_dates, streak_days FROM goals WHERE id = $1 AND user_id = $2`,
    	goalID, userID).Scan(&completedDatesRaw, &streakDays)
    if err != nil {
    	return nil, db.ErrNotFound
    }

    var completedDates []string
    _ = json.Unmarshal(completedDatesRaw, &completedDates)

    toggled := false
    newDates := make([]string, 0, len(completedDates))
    for _, d := range completedDates {
    	if d == dateStr {
    		toggled = true
    		continue // removing it, this is an "un-complete"
    	}
    	newDates = append(newDates, d)
    }
    if !toggled {
    	newDates = append(newDates, dateStr)
    	streakDays++
    } else {
    	if streakDays > 0 {
    		streakDays--
    	}
    }

    newDatesJSON, _ := json.Marshal(newDates)
    _, err = pool.Exec(ctx, `
    	UPDATE goals SET completed_dates = $1, streak_days = $2, last_logged_at = NOW(), updated_at = NOW()
    	WHERE id = $3 AND user_id = $4`, newDatesJSON, streakDays, goalID, userID)
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"completed": !toggled, "streak": streakDays}, nil

}

func LogGoalSession(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
goalID, * := input["goalId"].(string)
if err := db.RequireOwner(ctx, pool, "goals", goalID, userID, false); err != nil {
return nil, err
}
durationFloat, * := input["durationSeconds"].(float64)
durationSec := int(durationFloat)
if durationSec <= 0 || durationSec > 12*3600 {
// A single session over 12 hours is almost certainly a bad client value, not a
// real focus session, cap it rather than trusting it blindly.
return nil, fmt.Errorf("durationSeconds out of range")
}

    _, err := pool.Exec(ctx, `
    	INSERT INTO timer_sessions (user_id, goal_id, status, duration_seconds, started_at, ended_at)
    	VALUES ($1, $2, 'completed', $3, NOW() - ($3 * interval '1 second'), NOW())`,
    	userID, goalID, durationSec)
    if err != nil {
    	return nil, err
    }
    _, err = pool.Exec(ctx, `
    	UPDATE goals SET completed_hours = completed_hours + $2, last_logged_at = NOW()
    	WHERE id = $1 AND user_id = $3`, goalID, float64(durationSec)/3600.0, userID)
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"success": true}, nil

}

package handlers

import (
"context"
"encoding/json"
"fmt"

    "anchor/internal/auth"
    "anchor/internal/db"
    "github.com/jackc/pgx/v5/pgxpool"

)

// maxBoardDataBytes is the API-layer cap the audit flagged as missing on board_data.
// Postgres will happily store an enormous JSONB document, this is what actually stops
// it before the INSERT/UPDATE runs.
const maxBoardDataBytes = 2 << 20 // 2MB

func ListCanvas(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
rows, err := pool.Query(ctx, `
		SELECT id, title, board_type, is_favorited, created_at, updated_at
		FROM canvas_boards WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY updated_at DESC`, userID)
if err != nil {
return nil, err
}
defer rows.Close()

    var boards []map[string]interface{}
    for rows.Next() {
    	var id, title, boardType string
    	var favorited bool
    	var createdAt, updatedAt interface{}
    	if err := rows.Scan(&id, &title, &boardType, &favorited, &createdAt, &updatedAt); err != nil {
    		return nil, err
    	}
    	boards = append(boards, map[string]interface{}{
    		"id": id, "title": title, "boardType": boardType, "isFavorited": favorited,
    		"createdAt": createdAt, "updatedAt": updatedAt,
    	})
    }
    return boards, rows.Err()

}

// GetCanvasById previously had no user filter, any user who guessed or was handed a
// board id could read its full contents.
func GetCanvasById(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, _ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
return nil, err
}
var title, boardType string
var boardData []byte
err := pool.QueryRow(ctx, `
		SELECT title, board_type, board_data FROM canvas_boards
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, id, userID,
).Scan(&title, &boardType, &boardData)
if err != nil {
return nil, db.ErrNotFound
}
var parsed interface{}
_ = json.Unmarshal(boardData, &parsed)
return map[string]interface{}{"id": id, "title": title, "boardType": boardType, "boardData": parsed}, nil
}

func CreateCanvas(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
title, _ := input["title"].(string)
boardType, _ := input["boardType"].(string)
if title == "" {
title = "Untitled board"
}
if boardType == "" {
boardType = "brainstorm"
}
var newID string
err := pool.QueryRow(ctx, `
		INSERT INTO canvas_boards (user_id, title, board_type) VALUES ($1, $2, $3) RETURNING id`,
userID, title, boardType).Scan(&newID)
if err != nil {
return nil, err
}
return map[string]interface{}{"id": newID}, nil
}

// UpdateCanvas previously had no ownership check, any user could overwrite any other
// user's board content. It also had no size guard on board*data.
func UpdateCanvas(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, * := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
return nil, err
}

    boardData, err := json.Marshal(input["boardData"])
    if err != nil {
    	return nil, fmt.Errorf("invalid boardData")
    }
    if len(boardData) > maxBoardDataBytes {
    	return nil, fmt.Errorf("board data exceeds %d byte limit", maxBoardDataBytes)
    }

    _, err = pool.Exec(ctx, `
    	UPDATE canvas_boards SET board_data = $3, title = COALESCE(NULLIF($4,''), title), updated_at = NOW()
    	WHERE id = $1 AND user_id = $2`, id, userID, boardData, input["title"])
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"success": true}, nil

}

func DeleteCanvas(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, _ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
return nil, err
}
_, err := pool.Exec(ctx, `UPDATE canvas_boards SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID)
if err != nil {
return nil, err
}
return map[string]interface{}{"success": true}, nil
}

// DuplicateCanvas previously read the source board with no ownership check, meaning a
// user could duplicate someone else's private board into their own account. Now the
// source read is ownership-checked exactly like every other read.
func DuplicateCanvas(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
sourceID, \_ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "canvas_boards", sourceID, userID, true); err != nil {
return nil, err
}

    var title, boardType string
    var boardData []byte
    err := pool.QueryRow(ctx, `
    	SELECT title, board_type, board_data FROM canvas_boards
    	WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, sourceID, userID,
    ).Scan(&title, &boardType, &boardData)
    if err != nil {
    	return nil, db.ErrNotFound
    }

    var newID string
    err = pool.QueryRow(ctx, `
    	INSERT INTO canvas_boards (user_id, title, board_type, board_data)
    	VALUES ($1, $2, $3, $4) RETURNING id`,
    	userID, title+" (copy)", boardType, boardData).Scan(&newID)
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"id": newID}, nil

}

func ToggleCanvasFavorite(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, \_ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "canvas_boards", id, userID, true); err != nil {
return nil, err
}
var favorited bool
err := pool.QueryRow(ctx, `
		UPDATE canvas_boards SET is_favorited = NOT is_favorited, updated_at = NOW()
		WHERE id = $1 AND user_id = $2 RETURNING is_favorited`, id, userID).Scan(&favorited)
if err != nil {
return nil, err
}
return map[string]interface{}{"isFavorited": favorited}, nil
}

clients

package handlers

import (
"context"
"fmt"

    "anchor/internal/auth"
    "anchor/internal/db"
    "github.com/jackc/pgx/v5/pgxpool"

)

func GetClients(ctx context.Context, pool _pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
rows, err := pool.Query(ctx, `
SELECT c.id, c.name, c.company_name, c.email, c.status,
c.outstanding_balance_zar, c.lifetime_value_zar,
(SELECT count(_) FROM projects p WHERE p.client_id = c.id AND p.deleted_at IS NULL) AS project_count
FROM clients c
WHERE c.user_id = $1 AND c.deleted_at IS NULL
ORDER BY c.updated_at DESC`, userID)
if err != nil {
return nil, err
}
defer rows.Close()

    var clients []map[string]interface{}
    for rows.Next() {
    	var id, name, companyName, email, status string
    	var outstanding, lifetimeValue float64
    	var projectCount int
    	if err := rows.Scan(&id, &name, &companyName, &email, &status, &outstanding, &lifetimeValue, &projectCount); err != nil {
    		return nil, err
    	}
    	clients = append(clients, map[string]interface{}{
    		"id": id, "name": name, "companyName": companyName, "email": email, "status": status,
    		"outstandingBalanceZar": outstanding, "lifetimeValueZar": lifetimeValue, "projectCount": projectCount,
    	})
    }
    return clients, rows.Err()

}

// GetClient previously hardcoded communications: [] regardless of what actually
// happened with the client. Left as an empty slice here too since there's no
// communications table yet in the consolidated schema, but flagged explicitly rather
// than silently faked, so the frontend can show "not tracked yet" instead of implying
// zero communications ever happened.
func GetClient(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, \_ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "clients", id, userID, true); err != nil {
return nil, err
}
var name, companyName, email, phone, industry, status string
var healthScore int
err := pool.QueryRow(ctx, `
		SELECT name, company_name, email, phone, industry, status, health_score
		FROM clients WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, id, userID,
).Scan(&name, &companyName, &email, &phone, &industry, &status, &healthScore)
if err != nil {
return nil, db.ErrNotFound
}
return map[string]interface{}{
"id": id, "name": name, "companyName": companyName, "email": email, "phone": phone,
"industry": industry, "status": status, "healthScore": healthScore,
"communicationsTracked": false, "communications": []interface{}{},
}, nil
}

func CreateClient(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
name, _ := input["name"].(string)
companyName, _ := input["companyName"].(string)
email, _ := input["email"].(string)
phone, _ := input["phone"].(string)

    if name == "" {
    	return nil, fmt.Errorf("name is required")
    }
    if err := validateEmail(email); err != nil {
    	return nil, err
    }
    if err := validateMaxLen("name", name, 255); err != nil {
    	return nil, err
    }

    var newID string
    err := pool.QueryRow(ctx, `
    	INSERT INTO clients (user_id, name, company_name, email, phone, status)
    	VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), NULLIF($5,''), 'active')
    	RETURNING id`, userID, name, companyName, email, phone).Scan(&newID)
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"id": newID}, nil

}

// UpdateClient. The audit flagged that this endpoint didn't exist at all, clients could
// be created but never edited.
func UpdateClient(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, _ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "clients", id, userID, true); err != nil {
return nil, err
}
if email, ok := input["email"].(string); ok {
if err := validateEmail(email); err != nil {
return nil, err
}
}
_, err := pool.Exec(ctx, `
		UPDATE clients SET
		  name = COALESCE(NULLIF($3,''), name),
		  company_name = COALESCE(NULLIF($4,''), company_name),
		  email = COALESCE(NULLIF($5,''), email),
		  phone = COALESCE(NULLIF($6,''), phone),
		  status = COALESCE(NULLIF($7,''), status),
		  updated_at = NOW()
		WHERE id = $1 AND user_id = $2`,
id, userID, input["name"], input["companyName"], input["email"], input["phone"], input["status"])
if err != nil {
return nil, err
}
return map[string]interface{}{"success": true}, nil
}

// DeleteClient. Also flagged as entirely missing by the audit.
func DeleteClient(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, _ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "clients", id, userID, true); err != nil {
return nil, err
}
_, err := pool.Exec(ctx, `UPDATE clients SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID)
if err != nil {
return nil, err
}
return map[string]interface{}{"success": true}, nil
}

leads handlers:
package handlers

import (
"context"
"fmt"

    "anchor/internal/auth"
    "anchor/internal/db"
    "github.com/jackc/pgx/v5/pgxpool"

)

func GetCRMLeadsByStatus(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
rows, err := pool.Query(ctx, `
		SELECT id, first_name, last_name, email, company_name, status, score, estimated_value_zar
		FROM crm_leads WHERE user_id = $1 ORDER BY score DESC`, userID)
if err != nil {
return nil, err
}
defer rows.Close()

    byStatus := map[string][]map[string]interface{}{}
    for rows.Next() {
    	var id, firstName, lastName, email, companyName, status string
    	var score int
    	var estimatedValue float64
    	if err := rows.Scan(&id, &firstName, &lastName, &email, &companyName, &status, &score, &estimatedValue); err != nil {
    		return nil, err
    	}
    	lead := map[string]interface{}{
    		"id": id, "firstName": firstName, "lastName": lastName, "email": email,
    		"companyName": companyName, "score": score, "estimatedValueZar": estimatedValue,
    	}
    	byStatus[status] = append(byStatus[status], lead)
    }
    return byStatus, rows.Err()

}

func CreateCRMLead(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
firstName, _ := input["firstName"].(string)
lastName, _ := input["lastName"].(string)
email, _ := input["email"].(string)
companyName, _ := input["companyName"].(string)
source, \_ := input["source"].(string)

    if firstName == "" {
    	return nil, fmt.Errorf("firstName is required")
    }
    if err := validateEmail(email); err != nil {
    	return nil, err
    }

    var newID string
    err := pool.QueryRow(ctx, `
    	INSERT INTO crm_leads (user_id, first_name, last_name, email, company_name, source, status, score)
    	VALUES ($1, $2, $3, NULLIF($4,''), NULLIF($5,''), NULLIF($6,''), 'NEW', 50)
    	RETURNING id`, userID, firstName, lastName, email, companyName, source).Scan(&newID)
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"id": newID}, nil

}

func UpdateCRMLeadStatus(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
id, _ := input["id"].(string)
status, _ := input["status"].(string)

    if err := validateEnum("status", status, LeadStatuses); err != nil {
    	return nil, err
    }
    if err := db.RequireOwner(ctx, pool, "crm_leads", id, userID, false); err != nil {
    	return nil, err
    }
    _, err := pool.Exec(ctx, `UPDATE crm_leads SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`,
    	status, id, userID)
    if err != nil {
    	return nil, err
    }
    return map[string]interface{}{"success": true}, nil

}

// ConvertCRMLeadToClient previously read the source lead with no ownership check at
// all, meaning user A could convert user B's lead into a client under user A's own
// account. Every step below now runs inside a transaction scoped to the caller.
func ConvertCRMLeadToClient(ctx context.Context, pool \*pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
userID := auth.UserIDFromContext(ctx)
leadID, \_ := input["id"].(string)
if err := db.RequireOwner(ctx, pool, "crm_leads", leadID, userID, false); err != nil {
return nil, err
}

    tx, err := pool.Begin(ctx)
    if err != nil {
    	return nil, err
    }
    defer tx.Rollback(ctx)

    var firstName, lastName, email, companyName string
    err = tx.QueryRow(ctx, `
    	SELECT first_name, last_name, email, company_name FROM crm_leads
    	WHERE id = $1 AND user_id = $2`, leadID, userID,
    ).Scan(&firstName, &lastName, &email, &companyName)
    if err != nil {
    	return nil, db.ErrNotFound
    }

    var clientID string
    fullName := firstName + " " + lastName
    err = tx.QueryRow(ctx, `
    	INSERT INTO clients (user_id, name, company_name, email, status)
    	VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), 'active') RETURNING id`,
    	userID, fullName, companyName, email).Scan(&clientID)
    if err != nil {
    	return nil, err
    }

    _, err = tx.Exec(ctx, `
    	UPDATE crm_leads SET status = 'WON', converted_to_client_id = $1, updated_at = NOW()
    	WHERE id = $2 AND user_id = $3`, clientID, leadID, userID)
    if err != nil {
    	return nil, err
    }

    if err := tx.Commit(ctx); err != nil {
    	return nil, err
    }
    return map[string]interface{}{"clientId": clientID}, nil

}

# Patch notes for trpc_router.go

This one isn't a full rewrite since I don't have your actual `HandleTRPCBatch` and
`parseBatchInputs` source, only the audit's description of them. Two changes to make
directly in that file:

## 1. Wrap the handler with RequireAuth

Wherever `HandleTRPCBatch` is registered on your router (probably in `main.go` or a
routes file):

```go
// before
mux.HandleFunc("/api/trpc/", HandleTRPCBatch)

// after
mux.HandleFunc("/api/trpc/", auth.RequireAuth(HandleTRPCBatch))
```

Inside `HandleTRPCBatch`, every call site that currently does something like:

```go
userID := getUserIDSomehow(r) // or the dev_user fallback
```

should become:

```go
userID := auth.UserIDFromContext(r.Context())
```

Since `RequireAuth` already put a verified id in the context before this handler ever
runs, there's no need for a fallback inside the batch handler itself, and no path left
where `userID` can end up empty or client-controlled.

## 2. Body size limit in parseBatchInputs

Wherever `json.NewDecoder(r.Body).Decode(&body)` currently is:

```go
// before
json.NewDecoder(r.Body).Decode(&body)

// after
r.Body = http.MaxBytesReader(w, r.Body, 2<<20) // 2MB, adjust if canvas boardData batches need more
if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
    http.Error(w, `{"error":"request too large or malformed"}`, http.StatusBadRequest)
    return
}
```

Since canvas board saves can legitimately be large JSON payloads, if `UpdateCanvas`
mutations route through this same batch endpoint you may want a higher limit here (say
5MB) and rely on the `maxBoardDataBytes` check inside `canvas.go` as the more precise
per-field guard, rather than making the global body limit itself very large.

## 3. dispatchProcedure signature

Every handler function in this patch set (`GetProject`, `CreateTask`, etc.) has the
signature `func(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{})
(interface{}, error)`. If your current `dispatchProcedure` switch statement calls
handlers with a different signature (e.g. passing `userID` as a separate argument
instead of pulling it from context), either update the switch to match this signature,
or add `userID := auth.UserIDFromContext(ctx)` at the top of each handler and drop the
separate parameter, whichever is a smaller diff against your actual router code. Since I
don't have that file, I'd rather flag the seam clearly than guess at it and hand you
code that silently doesn't compile against your real router.

# Phase 0 + Phase 1: Security fixes and schema consolidation

## What's here

```
001_consolidated_schema.sql                          new schema, full Prisma replacement, user_id on everything
backend/internal/auth/middleware.go                   RequireAuth, no dev_user bypass in production
backend/internal/db/scoped.go                          RequireOwner, the ownership check used everywhere
backend/internal/handlers/validation.go                 email/enum/length validation helpers
backend/internal/handlers/projects.go                    rewritten, GetProject now ownership-checked
backend/internal/handlers/tasks.go                        rewritten, StartTimer no longer global, today filter fixed
backend/internal/handlers/goals.go                          rewritten, toggle/delete/update all ownership-checked
backend/internal/handlers/canvas.go                          rewritten, every path ownership-checked + size cap
backend/internal/handlers/clients.go                          update/delete added, they didn't exist before
backend/internal/handlers/leads.go                              convert-to-client ownership bug fixed
backend/internal/handlers/trpc_router_PATCH_NOTES.md              manual patch, see below for why
```

`habits.go` (Pillar/HabitTemplate/HabitLog) isn't included as a full rewrite here since
the audit didn't describe its specific query bugs in detail, but it should get the exact
same treatment: `RequireOwner` before any read/update/delete, `user_id = $1` as the only
filter on lists, no `OR true` anywhere. The pattern in `goals.go` is the template to copy.

## What I don't have

I don't have your actual Go source files, only what the audit document described. So
this is a correct reference implementation of the pattern each handler needs, not a
drop-in replacement guaranteed to compile against your exact existing types, helper
functions, or import paths. Before merging:

1. Check the module path. I used `anchor/internal/...` as the import prefix, swap it for
   whatever your `go.mod` actually declares.
2. Check `VerifyRequest`'s real signature in your `clerk.go`. I assumed it returns
   `(string, error)`. If it currently returns just a string (with empty string meaning
   "unverified"), adjust `middleware.go` accordingly.
3. Any field your frontend already depends on that isn't in these rewritten handlers
   (there are almost certainly more fields on tasks/projects/clients than the audit
   listed) needs to be added back in. I kept these focused on the fields the audit
   specifically mentioned rather than guessing at your full field list.
4. Run the sanity check query at the bottom of `001_consolidated_schema.sql` after
   porting real data over, to confirm nothing landed without an owner.

## Suggested order to apply this

1. Run `001_consolidated_schema.sql` against a copy of the database first, not
   production directly.
2. Write and run the one-time data migration script copying rows out of the old
   PascalCase Prisma tables into the new ones, backfilling `user_id` from whatever the
   old ownership column was (this script isn't included here since it depends on
   exactly what's in your production data right now, happy to write it once I know the
   row counts and whether there's more than one real user's data mixed in).
3. Drop in `middleware.go` and `scoped.go`, they have no dependencies on the rest.
4. Replace `projects.go`, `tasks.go`, `goals.go`, `canvas.go`, `clients.go`, `leads.go`
   one at a time, compiling after each so errors stay isolated to the file you just
   touched.
5. Apply the two manual edits in `trpc_router_PATCH_NOTES.md`.
6. Port `habits.go` and the `Notification` handlers using the same pattern, they weren't
   included as full rewrites here since the audit didn't detail their specific bugs.
7. Delete `EnsureGoalsTable` and any call to it, it's no longer needed once `goals` is a
   real migrated table.

Once this is merged and deployed, that's Phase 0 and Phase 1 done. Phase 2 (the
`activity_events` table, ingestion endpoint, and the Electron SQLite buffer) is the next
piece, and it's a clean addition on top of this rather than another round of fixing
existing code, so it should move faster.
