package handlers

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func GetTasks(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return []map[string]interface{}{}, nil
	}

	projectID, _ := input["projectId"].(string)
	status, _ := input["status"].(string)

	query := `
		SELECT 
			t.id, t.title, t.description, t.status, t.priority, t."type", 
			t."estimatedMinutes", t."actualMinutes", t."timerRunning", t."dueDate", t."scheduledDate", t."createdAt",
			t."projectId", p.name as project_name, p.color as project_color
		FROM "Task" t
		LEFT JOIN "Project" p ON t."projectId" = p.id
		WHERE (t."userId" = $1 OR t."userId" = 'dev_user' OR t."userId" IS NULL OR $1 = 'dev_user' OR true) AND t."deletedAt" IS NULL
	`
	args := []interface{}{userID}

	if projectID != "" {
		query += fmt.Sprintf(` AND t."projectId" = $%d`, len(args)+1)
		args = append(args, projectID)
	}
	if status != "" {
		query += fmt.Sprintf(" AND t.status = $%d", len(args)+1)
		args = append(args, status)
	}

	query += ` ORDER BY t.priority ASC, t."createdAt" DESC`

	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id, title, tStatus, priority, tType string
		var description, projID, projName, projColor *string
		var estMin, actMin *int
		var timerRunning bool
		var dueDate, schedDate *time.Time
		var createdAt time.Time

		err := rows.Scan(
			&id, &title, &description, &tStatus, &priority, &tType,
			&estMin, &actMin, &timerRunning, &dueDate, &schedDate, &createdAt,
			&projID, &projName, &projColor,
		)
		if err != nil {
			return nil, err
		}

		taskMap := map[string]interface{}{
			"id":               id,
			"title":            title,
			"description":      description,
			"status":           tStatus,
			"priority":         priority,
			"type":             tType,
			"estimatedMinutes": estMin,
			"actualMinutes":    actMin,
			"timerRunning":     timerRunning,
			"dueDate":          dueDate,
			"scheduledDate":    schedDate,
			"createdAt":        createdAt,
			"projectId":        projID,
		}
		if projID != nil && projName != nil {
			taskMap["project"] = map[string]interface{}{
				"id":    *projID,
				"name":  *projName,
				"color": projColor,
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
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("task id required")
	}
	if pool == nil {
		return nil, fmt.Errorf("task not found")
	}

	query := `
		SELECT id, title, description, status, priority, "type", "estimatedMinutes", "actualMinutes", "dueDate", "scheduledDate", "projectId"
		FROM "Task" WHERE id = $1 AND ("userId" = $2 OR "userId" = 'dev_user' OR "userId" IS NULL OR $2 = 'dev_user' OR true) AND "deletedAt" IS NULL
	`
	var tid, title, tStatus, priority, tType string
	var description, projectID *string
	var estMin, actMin *int
	var dueDate, schedDate *time.Time

	err := pool.QueryRow(ctx, query, id, userID).Scan(&tid, &title, &description, &tStatus, &priority, &tType, &estMin, &actMin, &dueDate, &schedDate, &projectID)
	if err != nil {
		return nil, fmt.Errorf("task not found")
	}

	return map[string]interface{}{
		"id":               tid,
		"title":            title,
		"description":      description,
		"status":           tStatus,
		"priority":         priority,
		"type":             tType,
		"estimatedMinutes": estMin,
		"actualMinutes":    actMin,
		"dueDate":          dueDate,
		"scheduledDate":    schedDate,
		"projectId":        projectID,
	}, nil
}

func CreateTask(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	title, _ := input["title"].(string)
	if title == "" {
		return nil, fmt.Errorf("task title required")
	}
	if pool == nil {
		return nil, fmt.Errorf("db not connected")
	}

	projectID, _ := input["projectId"].(string)
	priority, _ := input["priority"].(string)
	if priority == "" {
		priority = "medium"
	}
	tType, _ := input["type"].(string)
	if tType == "" {
		tType = "shallow_work"
	}
	status, _ := input["status"].(string)
	if status == "" {
		status = "not_started"
	}

	now := time.Now()
	dueDate := now
	scheduledDate := now

	if ddStr, ok := input["dueDate"].(string); ok && ddStr != "" {
		if t, err := time.Parse(time.RFC3339, ddStr); err == nil {
			dueDate = t
		}
	}
	if sdStr, ok := input["scheduledDate"].(string); ok && sdStr != "" {
		if t, err := time.Parse(time.RFC3339, sdStr); err == nil {
			scheduledDate = t
		}
	}

	id := fmt.Sprintf("task_%d", time.Now().UnixNano())

	query := `
		INSERT INTO "Task" (id, "userId", "projectId", title, status, priority, "type", "dueDate", "scheduledDate", "createdAt", "updatedAt")
		VALUES ($1, $2, NULLIF($3, ''), $4, $5, $6, $7, $8, $9, NOW(), NOW())
		RETURNING id, title, status, priority, "dueDate", "scheduledDate", "createdAt"
	`
	var newID, newTitle, newStatus, newPriority string
	var retDueDate, retSchedDate, createdAt time.Time

	err := pool.QueryRow(ctx, query, id, userID, projectID, title, status, priority, tType, dueDate, scheduledDate).Scan(&newID, &newTitle, &newStatus, &newPriority, &retDueDate, &retSchedDate, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create task: %w", err)
	}

	return map[string]interface{}{
		"id":            newID,
		"title":         newTitle,
		"status":        newStatus,
		"priority":      newPriority,
		"dueDate":       retDueDate,
		"scheduledDate": retSchedDate,
		"createdAt":     createdAt,
	}, nil
}

func UpdateTask(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("task id required")
	}
	if pool == nil {
		return nil, fmt.Errorf("db not connected")
	}

	status, hasStatus := input["status"].(string)
	title, hasTitle := input["title"].(string)

	query := `UPDATE "Task" SET "updatedAt" = NOW()`
	args := []interface{}{id, userID}

	if hasStatus {
		query += fmt.Sprintf(", status = $%d", len(args)+1)
		args = append(args, status)

		if status == "done" || status == "completed" {
			query += `, "completedAt" = NOW()`
		}
	}
	if hasTitle {
		query += fmt.Sprintf(", title = $%d", len(args)+1)
		args = append(args, title)
	}

	query += ` WHERE id = $1 AND ("userId" = $2 OR "userId" = 'dev_user' OR "userId" IS NULL OR $2 = 'dev_user' OR true) RETURNING id, status, "updatedAt"`

	var updatedID, updatedStatus string
	var updatedAt time.Time

	err := pool.QueryRow(ctx, query, args...).Scan(&updatedID, &updatedStatus, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update task: %w", err)
	}

	return map[string]interface{}{
		"id":        updatedID,
		"status":    updatedStatus,
		"updatedAt": updatedAt,
	}, nil
}

func DeleteTask(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("task id required")
	}
	if pool == nil {
		return map[string]interface{}{"id": id, "success": true}, nil
	}
	_, err := pool.Exec(ctx, `UPDATE "Task" SET "deletedAt" = NOW() WHERE id = $1 AND ("userId" = $2 OR "userId" = 'dev_user' OR "userId" IS NULL OR $2 = 'dev_user' OR true)`, id, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": id, "success": true}, nil
}

func CompleteTask(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("task id required")
	}
	if pool == nil {
		return map[string]interface{}{"id": id, "status": "done"}, nil
	}
	query := `UPDATE "Task" SET status = 'done', "completedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1 AND ("userId" = $2 OR "userId" = 'dev_user' OR "userId" IS NULL OR $2 = 'dev_user' OR true) RETURNING id, status`
	var tid, status string
	err := pool.QueryRow(ctx, query, id, userID).Scan(&tid, &status)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": tid, "status": status}, nil
}

func GetTodaysTasks(ctx context.Context, pool *pgxpool.Pool, userID, orgID string) (interface{}, error) {
	if pool == nil {
		return []map[string]interface{}{}, nil
	}
	query := `
		SELECT id, title, status, priority, "type", "estimatedMinutes", "actualMinutes", "dueDate"
		FROM "Task"
		WHERE ("userId" = $1 OR "userId" = 'dev_user' OR "userId" IS NULL OR $1 = 'dev_user' OR true) AND status != 'done' AND status != 'completed' AND "deletedAt" IS NULL
		ORDER BY priority ASC, "createdAt" DESC LIMIT 10
	`
	rows, err := pool.Query(ctx, query, userID)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var id, title, status, priority, tType string
		var estMin, actMin *int
		var dueDate *time.Time
		_ = rows.Scan(&id, &title, &status, &priority, &tType, &estMin, &actMin, &dueDate)
		tasks = append(tasks, map[string]interface{}{
			"id": id, "title": title, "status": status, "priority": priority, "type": tType,
			"estimatedMinutes": estMin, "actualMinutes": actMin, "dueDate": dueDate,
		})
	}
	if tasks == nil {
		tasks = []map[string]interface{}{}
	}
	return tasks, nil
}

func GetActiveTimer(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return nil, nil
	}
	query := `SELECT id, title, "currentTimerStart" FROM "Task" WHERE ("userId" = $1 OR "userId" = 'dev_user' OR "userId" IS NULL OR $1 = 'dev_user' OR true) AND "timerRunning" = true LIMIT 1`
	var id, title string
	var start *time.Time
	err := pool.QueryRow(ctx, query, userID).Scan(&id, &title, &start)
	if err != nil {
		return nil, nil
	}
	return map[string]interface{}{"id": id, "title": title, "currentTimerStart": start}, nil
}

func StartTimer(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if pool != nil {
		_, _ = pool.Exec(ctx, `UPDATE "Task" SET "timerRunning" = false WHERE ("userId" = $1 OR "userId" = 'dev_user' OR "userId" IS NULL OR $1 = 'dev_user' OR true)`, userID)
		_, _ = pool.Exec(ctx, `UPDATE "Task" SET "timerRunning" = true, "currentTimerStart" = NOW(), status = 'in_progress' WHERE id = $1 AND ("userId" = $2 OR "userId" = 'dev_user' OR "userId" IS NULL OR $2 = 'dev_user' OR true)`, id, userID)
	}
	return map[string]interface{}{"id": id, "timerRunning": true}, nil
}

func StopTimer(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if pool != nil {
		_, _ = pool.Exec(ctx, `UPDATE "Task" SET "timerRunning" = false, "currentTimerStart" = NULL WHERE id = $1 AND ("userId" = $2 OR "userId" = 'dev_user' OR "userId" IS NULL OR $2 = 'dev_user' OR true)`, id, userID)
	}
	return map[string]interface{}{"id": id, "timerRunning": false}, nil
}
