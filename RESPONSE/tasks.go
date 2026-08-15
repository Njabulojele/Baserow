package handlers

import (
	"context"
	"fmt"
	"time"

	"anchor/internal/auth"
	"anchor/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

func GetTasks(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
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
func GetTodaysTasks(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
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

func CreateTask(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	title, _ := input["title"].(string)
	description, _ := input["description"].(string)
	projectID, _ := input["projectId"].(string)
	status, _ := input["status"].(string)
	priority, _ := input["priority"].(string)

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

func UpdateTask(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
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

func DeleteTask(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
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
func StartTimer(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["taskId"].(string)
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

func StopTimer(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	sessionID, _ := input["sessionId"].(string)

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
	EstimatedMinutes, ActualMinutes                      int
	DueDate, ScheduledDate                                *time.Time
	TimerRunning                                          bool
	CreatedAt, UpdatedAt                                  interface{}
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanTaskRow(rows rowScanner, t *taskRow) error {
	return rows.Scan(&t.ID, &t.ProjectID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.EstimatedMinutes, &t.ActualMinutes, &t.DueDate, &t.ScheduledDate, &t.TimerRunning,
		&t.CreatedAt, &t.UpdatedAt)
}

func (t *taskRow) toMap() map[string]interface{} {
	return map[string]interface{}{
		"id": t.ID, "projectId": t.ProjectID, "title": t.Title, "description": t.Description,
		"status": t.Status, "priority": t.Priority, "estimatedMinutes": t.EstimatedMinutes,
		"actualMinutes": t.ActualMinutes, "dueDate": t.DueDate, "scheduledDate": t.ScheduledDate,
		"timerRunning": t.TimerRunning, "createdAt": t.CreatedAt, "updatedAt": t.UpdatedAt,
	}
}
