package handlers

import (
	"context"
	"fmt"
	"time"

	"anchor-backend/internal/auth"
	"anchor-backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

func GetTasks(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	if input == nil {
		input = make(map[string]interface{})
	}
	projectID, _ := input["projectId"].(string)
	status, _ := input["status"].(string)

	query := `
		SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority,
		       t.estimated_minutes, t.actual_minutes, t.timer_running,
		       t.due_date, t.scheduled_date, t.created_at, t.updated_at,
		       p.name as project_name, p.color as project_color
		FROM tasks t
		LEFT JOIN projects p ON t.project_id = p.id
		WHERE t.user_id = $1 AND t.deleted_at IS NULL`
	args := []interface{}{userID}

	if projectID != "" {
		args = append(args, projectID)
		query += fmt.Sprintf(` AND t.project_id = $%d`, len(args))
	}
	if status != "" && status != "all" {
		// Map status synonyms
		switch status {
		case "todo", "to_do", "not_started":
			status = "not_started"
		case "in_progress", "doing":
			status = "in_progress"
		case "completed", "done":
			status = "done"
		}
		args = append(args, status)
		query += fmt.Sprintf(` AND t.status = $%d`, len(args))
	}
	query += ` ORDER BY t.created_at DESC`

	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id, title, tStatus, priority string
		var projID *string
		var description, projName, projColor *string
		var estMin, actMin *int
		var timerRunning bool
		var dueDate, schedDate *time.Time
		var createdAt, updatedAt interface{}

		if err := rows.Scan(&id, &projID, &title, &description, &tStatus, &priority,
			&estMin, &actMin, &timerRunning, &dueDate, &schedDate, &createdAt, &updatedAt,
			&projName, &projColor); err != nil {
			continue
		}
		taskMap := map[string]interface{}{
			"id": id, "projectId": projID, "title": title, "description": description,
			"status": tStatus, "priority": priority,
			"estimatedMinutes": estMin, "actualMinutes": actMin, "timerRunning": timerRunning,
			"dueDate": dueDate, "scheduledDate": schedDate,
			"createdAt": createdAt, "updatedAt": updatedAt,
		}
		if projID != nil && projName != nil {
			taskMap["project"] = map[string]interface{}{
				"id": *projID, "name": *projName, "color": projColor,
			}
		}
		tasks = append(tasks, taskMap)
	}
	if tasks == nil {
		tasks = []map[string]interface{}{}
	}
	return tasks, nil
}

func GetTask(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "tasks", id, userID, true); err != nil {
		return nil, err
	}

	var tid, title, tStatus, priority string
	var projID, description *string
	var estMin, actMin *int
	var dueDate, schedDate *time.Time

	err := pool.QueryRow(ctx, `
		SELECT id, project_id, title, description, status, priority,
		       estimated_minutes, actual_minutes, due_date, scheduled_date
		FROM tasks WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, id, userID,
	).Scan(&tid, &projID, &title, &description, &tStatus, &priority, &estMin, &actMin, &dueDate, &schedDate)
	if err != nil {
		return nil, db.ErrNotFound
	}
	return map[string]interface{}{
		"id": tid, "projectId": projID, "title": title, "description": description,
		"status": tStatus, "priority": priority,
		"estimatedMinutes": estMin, "actualMinutes": actMin,
		"dueDate": dueDate, "scheduledDate": schedDate,
	}, nil
}

func CreateTask(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
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

	// Previously both defaulted to time.Now(), making every task immediately overdue.
	// Now both are NULL unless the client explicitly sets them.
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

	taskID, _ := input["id"].(string)
	var newID string
	err := pool.QueryRow(ctx, `
		INSERT INTO tasks (id, user_id, project_id, title, description, status, priority, due_date, scheduled_date)
		VALUES (COALESCE(NULLIF($1, ''), gen_random_uuid()::text), $2, NULLIF($3,''), $4, $5, $6, $7, $8, $9)
		RETURNING id`,
		taskID, userID, projectID, title, description, status, priority, dueDate, scheduledDate,
	).Scan(&newID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": newID}, nil
}

func UpdateTask(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
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
	if priority, ok := input["priority"].(string); ok && priority != "" {
		if err := validateEnum("priority", priority, TaskPriorities); err != nil {
			return nil, err
		}
	}

	setClauses := []string{`updated_at = NOW()`}
	args := []interface{}{id, userID}
	nextParam := 3

	if v, ok := input["title"].(string); ok && v != "" {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", nextParam))
		args = append(args, v)
		nextParam++
	}
	if v, ok := input["status"].(string); ok && v != "" {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", nextParam))
		args = append(args, v)
		nextParam++
		if v == "done" {
			setClauses = append(setClauses, `completed_at = NOW()`)
		}
	}
	if v, ok := input["priority"].(string); ok && v != "" {
		setClauses = append(setClauses, fmt.Sprintf("priority = $%d", nextParam))
		args = append(args, v)
		nextParam++
	}
	if v, ok := input["description"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", nextParam))
		args = append(args, v)
		nextParam++
	}

	if len(setClauses) == 1 {
		return nil, fmt.Errorf("no fields to update")
	}

	query := fmt.Sprintf(`UPDATE tasks SET %s WHERE id = $1 AND user_id = $2 RETURNING id, status, updated_at`,
		joinClauses(setClauses))

	var updatedID, updatedStatus string
	var updatedAt interface{}
	if err := pool.QueryRow(ctx, query, args...).Scan(&updatedID, &updatedStatus, &updatedAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": updatedID, "status": updatedStatus, "updatedAt": updatedAt}, nil
}

func DeleteTask(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "tasks", id, userID, true); err != nil {
		return nil, err
	}
	_, err := pool.Exec(ctx, `UPDATE tasks SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}

func CompleteTask(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "tasks", id, userID, true); err != nil {
		return nil, err
	}
	var tid, status string
	err := pool.QueryRow(ctx, `
		UPDATE tasks SET status = 'done', updated_at = NOW()
		WHERE id = $1 AND user_id = $2 RETURNING id, status`, id, userID,
	).Scan(&tid, &status)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": tid, "status": status}, nil
}

// GetTodaysTasks returns active incomplete tasks.
func GetTodaysTasks(ctx context.Context, pool *pgxpool.Pool, userID, orgID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	rows, err := pool.Query(ctx, `
		SELECT id, title, status, priority, estimated_minutes, actual_minutes, due_date, scheduled_date
		FROM tasks
		WHERE user_id = $1 AND deleted_at IS NULL
		  AND status NOT IN ('done', 'completed')
		ORDER BY created_at DESC
		LIMIT 50`, userID)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id, title, status, priority string
		var estMin, actMin *int
		var dueDate, schedDate *time.Time
		_ = rows.Scan(&id, &title, &status, &priority, &estMin, &actMin, &dueDate, &schedDate)
		tasks = append(tasks, map[string]interface{}{
			"id": id, "title": title, "status": status, "priority": priority,
			"estimatedMinutes": estMin, "actualMinutes": actMin,
			"dueDate": dueDate, "scheduledDate": schedDate,
		})
	}
	if tasks == nil {
		tasks = []map[string]interface{}{}
	}
	return tasks, nil
}

func GetBacklogTasks(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	rows, err := pool.Query(ctx, `
		SELECT id, title, status, priority, estimated_minutes, actual_minutes, due_date, scheduled_date
		FROM tasks
		WHERE user_id = $1 AND deleted_at IS NULL
		  AND status NOT IN ('done', 'completed')
		  AND scheduled_date IS NULL
		ORDER BY created_at DESC
		LIMIT 50`, userID)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id, title, status, priority string
		var estMin, actMin *int
		var dueDate, schedDate *time.Time
		_ = rows.Scan(&id, &title, &status, &priority, &estMin, &actMin, &dueDate, &schedDate)
		tasks = append(tasks, map[string]interface{}{
			"id": id, "title": title, "status": status, "priority": priority,
			"estimatedMinutes": estMin, "actualMinutes": actMin,
			"dueDate": dueDate, "scheduledDate": schedDate,
		})
	}
	if tasks == nil {
		tasks = []map[string]interface{}{}
	}
	return tasks, nil
}

func GetOverdueTasks(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	rows, err := pool.Query(ctx, `
		SELECT id, title, status, priority, estimated_minutes, actual_minutes, due_date, scheduled_date
		FROM tasks
		WHERE user_id = $1 AND deleted_at IS NULL
		  AND status NOT IN ('done', 'completed')
		  AND due_date IS NOT NULL AND due_date < NOW()
		ORDER BY due_date ASC
		LIMIT 50`, userID)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id, title, status, priority string
		var estMin, actMin *int
		var dueDate, schedDate *time.Time
		_ = rows.Scan(&id, &title, &status, &priority, &estMin, &actMin, &dueDate, &schedDate)
		tasks = append(tasks, map[string]interface{}{
			"id": id, "title": title, "status": status, "priority": priority,
			"estimatedMinutes": estMin, "actualMinutes": actMin,
			"dueDate": dueDate, "scheduledDate": schedDate,
		})
	}
	if tasks == nil {
		tasks = []map[string]interface{}{}
	}
	return tasks, nil
}

func GetActiveTimer(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if u := auth.UserIDFromContext(ctx); u != "" {
		userID = u
	}
	if pool == nil {
		return nil, nil
	}

	var sessionID string
	var taskID, goalID, projID *string
	var startedAt, lastHeartbeat *time.Time
	var title string

	err := pool.QueryRow(ctx, `
		SELECT s.id, s.task_id, s.goal_id, s.project_id, s.started_at, s.last_heartbeat_at,
		       COALESCE(t.title, g.title, 'Active Session') as title
		FROM timer_sessions s
		LEFT JOIN tasks t ON s.task_id = t.id
		LEFT JOIN goals g ON s.goal_id = g.id
		WHERE s.user_id = $1 AND s.status = 'active'
		ORDER BY s.started_at DESC LIMIT 1`, userID,
	).Scan(&sessionID, &taskID, &goalID, &projID, &startedAt, &lastHeartbeat, &title)
	if err != nil {
		return nil, nil
	}

	return map[string]interface{}{
		"id":                sessionID,
		"sessionId":         sessionID,
		"taskId":            taskID,
		"goalId":            goalID,
		"projectId":         projID,
		"title":             title,
		"startedAt":         startedAt,
		"currentTimerStart": startedAt,
		"lastHeartbeatAt":   lastHeartbeat,
		"timerRunning":      true,
	}, nil
}

func StartTimer(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if u := auth.UserIDFromContext(ctx); u != "" {
		userID = u
	}
	if input == nil {
		return nil, fmt.Errorf("input is required")
	}

	taskID, _ := input["id"].(string)
	if taskID == "" {
		taskID, _ = input["taskId"].(string)
	}
	goalID, _ := input["goalId"].(string)

	if taskID == "" && goalID == "" {
		return nil, fmt.Errorf("taskId or goalId is required")
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Auto-close any active timer sessions for this user
	_, err = tx.Exec(ctx, `
		UPDATE timer_sessions 
		SET status = 'completed', ended_at = NOW(), 
		    duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at))::int)
		WHERE user_id = $1 AND status = 'active'`, userID)
	if err != nil {
		return nil, err
	}

	// 2. Clear running flag on tasks
	_, err = tx.Exec(ctx, `UPDATE tasks SET timer_running = false WHERE user_id = $1 AND timer_running = true`, userID)
	if err != nil {
		return nil, err
	}

	entityType := "goal"
	entityID := goalID
	var projID *string

	if taskID != "" {
		entityType = "task"
		entityID = taskID
		if err := db.RequireOwner(ctx, pool, "tasks", taskID, userID, true); err != nil {
			return nil, err
		}
		_, err = tx.Exec(ctx, `UPDATE tasks SET timer_running = true, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND user_id = $2`, taskID, userID)
		if err != nil {
			return nil, err
		}
		_ = tx.QueryRow(ctx, `SELECT project_id FROM tasks WHERE id = $1`, taskID).Scan(&projID)
	}

	// 3. Create new active session
	sessionID := fmt.Sprintf("sess_%d", time.Now().UnixNano())
	_, err = tx.Exec(ctx, `
		INSERT INTO timer_sessions (id, user_id, task_id, goal_id, project_id, status, started_at, last_heartbeat_at) 
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, 'active', NOW(), NOW())`,
		sessionID, userID, taskID, goalID, projID)
	if err != nil {
		return nil, err
	}

	// 4. Dual-write activity_events
	_, _ = tx.Exec(ctx, `
		INSERT INTO activity_events (user_id, event_type, entity_type, entity_id)
		VALUES ($1, 'timer_started', $2, $3)`, userID, entityType, entityID)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return map[string]interface{}{"id": taskID, "sessionId": sessionID, "timerRunning": true}, nil
}

func HeartbeatTimer(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if u := auth.UserIDFromContext(ctx); u != "" {
		userID = u
	}
	if input == nil {
		return map[string]interface{}{"success": false}, nil
	}

	sessionID, _ := input["sessionId"].(string)
	if sessionID == "" {
		sessionID, _ = input["id"].(string)
	}

	if sessionID != "" {
		res, err := pool.Exec(ctx, `
			UPDATE timer_sessions
			SET last_heartbeat_at = NOW()
			WHERE id = $1 AND user_id = $2 AND status = 'active'`, sessionID, userID)
		if err == nil && res.RowsAffected() > 0 {
			return map[string]interface{}{"success": true}, nil
		}
	}

	// Fallback: touch latest active session for this user
	_, _ = pool.Exec(ctx, `
		UPDATE timer_sessions
		SET last_heartbeat_at = NOW()
		WHERE user_id = $1 AND status = 'active'`, userID)

	return map[string]interface{}{"success": true}, nil
}

func StopTimer(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if u := auth.UserIDFromContext(ctx); u != "" {
		userID = u
	}
	if input == nil {
		input = make(map[string]interface{})
	}

	taskID, _ := input["id"].(string)
	sessionID, _ := input["sessionId"].(string)

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if taskID != "" {
		_, _ = tx.Exec(ctx, `UPDATE tasks SET timer_running = false, updated_at = NOW() WHERE id = $1 AND user_id = $2`, taskID, userID)
	} else {
		_, _ = tx.Exec(ctx, `UPDATE tasks SET timer_running = false WHERE user_id = $1 AND timer_running = true`, userID)
	}

	var activeSessionID, tID string
	var startedAt time.Time

	if sessionID != "" {
		_ = tx.QueryRow(ctx, `
			SELECT id, task_id, started_at FROM timer_sessions 
			WHERE id = $1 AND user_id = $2 AND status = 'active'`, sessionID, userID).Scan(&activeSessionID, &tID, &startedAt)
	} else {
		_ = tx.QueryRow(ctx, `
			SELECT id, task_id, started_at FROM timer_sessions 
			WHERE user_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`, userID).Scan(&activeSessionID, &tID, &startedAt)
	}

	if activeSessionID != "" {
		durationSec := int(time.Since(startedAt).Seconds())
		_, _ = tx.Exec(ctx, `
			UPDATE timer_sessions 
			SET status = 'completed', ended_at = NOW(), duration_seconds = $3
			WHERE id = $1 AND user_id = $2`, activeSessionID, userID, durationSec)

		targetTask := taskID
		if targetTask == "" {
			targetTask = tID
		}
		if targetTask != "" {
			_, _ = tx.Exec(ctx, `
				UPDATE tasks SET actual_minutes = actual_minutes + $3 WHERE id = $1 AND user_id = $2`,
				targetTask, userID, durationSec/60)
		}

		// Dual-write to activity_events
		_, _ = tx.Exec(ctx, `
			INSERT INTO activity_events (user_id, event_type, entity_type, entity_id)
			VALUES ($1, 'timer_stopped', 'session', $2)`, userID, activeSessionID)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return map[string]interface{}{"timerRunning": false, "stopped": true}, nil
}

// CleanupStaleTimerSessions auto-ends sessions inactive > 10 minutes
func CleanupStaleTimerSessions(ctx context.Context, pool *pgxpool.Pool) {
	if pool == nil {
		return
	}
	_, _ = pool.Exec(ctx, `
		UPDATE timer_sessions
		SET status = 'auto_ended',
		    ended_at = last_heartbeat_at,
		    duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (last_heartbeat_at - started_at))::int)
		WHERE status = 'active' AND last_heartbeat_at < NOW() - INTERVAL '10 minutes'`)
}
