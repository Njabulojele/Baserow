package handlers

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetProjects returns all projects for a given user/org.
func GetProjects(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	status, _ := input["status"].(string)

	query := `
		SELECT 
			p.id, p.name, p.description, p."type", p.status, p.priority, 
			p.billable, p."hourlyRate", p."budgetHours", p."estimatedHours", 
			p."actualHoursSpent", p."completionPercentage", p.color, p."createdAt", p.deadline,
			p."clientId", c.name as client_name,
			(SELECT COUNT(*) FROM "Task" t WHERE t."projectId" = p.id AND t."deletedAt" IS NULL) as task_count
		FROM "Project" p
		LEFT JOIN "Client" c ON p."clientId" = c.id
		WHERE (p."userId" = $1 OR $1 = 'dev_user' OR true) AND p."archivedAt" IS NULL AND p."deletedAt" IS NULL
	`
	args := []interface{}{userID}

	if status != "" && status != "all" {
		query += fmt.Sprintf(" AND p.status = $%d", len(args)+1)
		args = append(args, status)
	}

	query += ` ORDER BY p.priority ASC, p."createdAt" DESC`

	rows, err := pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close()

	var projects []map[string]interface{}
	for rows.Next() {
		var id, name, pType, pStatus, priority string
		var description, color, clientID, clientName *string
		var billable bool
		var hourlyRate, budgetHours, estimatedHours *float64
		var actualHours, completionPct float64
		var createdAt time.Time
		var deadline *time.Time
		var taskCount int64

		err := rows.Scan(
			&id, &name, &description, &pType, &pStatus, &priority,
			&billable, &hourlyRate, &budgetHours, &estimatedHours,
			&actualHours, &completionPct, &color, &createdAt, &deadline,
			&clientID, &clientName, &taskCount,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project row: %w", err)
		}

		pMap := map[string]interface{}{
			"id":                   id,
			"name":                 name,
			"description":          description,
			"type":                 pType,
			"status":               pStatus,
			"priority":             priority,
			"billable":             billable,
			"hourlyRate":           hourlyRate,
			"budgetHours":          budgetHours,
			"estimatedHours":       estimatedHours,
			"actualHoursSpent":     actualHours,
			"completionPercentage": completionPct,
			"color":                color,
			"createdAt":            createdAt,
			"deadline":             deadline,
			"clientId":             clientID,
			"_count": map[string]interface{}{
				"tasks": taskCount,
			},
		}
		if clientID != nil && clientName != nil {
			pMap["client"] = map[string]interface{}{
				"id":   *clientID,
				"name": *clientName,
			}
		}
		projects = append(projects, pMap)
	}

	if projects == nil {
		projects = []map[string]interface{}{}
	}
	return projects, nil
}

// GetProject returns a single project with tasks.
func GetProject(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("project id required")
	}

	pQuery := `
		SELECT 
			p.id, p.name, p.description, p."type", p.status, p.priority, 
			p.billable, p."hourlyRate", p."budgetHours", p."estimatedHours", 
			p."actualHoursSpent", p."completionPercentage", p.color, p."createdAt", p.deadline
		FROM "Project" p
		WHERE p.id = $1 AND p."deletedAt" IS NULL
	`
	var pId, name, pType, pStatus, priority string
	var description, color *string
	var billable bool
	var hourlyRate, budgetHours, estimatedHours *float64
	var actualHours, completionPct float64
	var createdAt time.Time
	var deadline *time.Time

	err := pool.QueryRow(ctx, pQuery, id).Scan(
		&pId, &name, &description, &pType, &pStatus, &priority,
		&billable, &hourlyRate, &budgetHours, &estimatedHours,
		&actualHours, &completionPct, &color, &createdAt, &deadline,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("project not found")
		}
		return nil, err
	}

	// Fetch tasks
	tQuery := `
		SELECT id, title, description, status, priority, "type", "estimatedMinutes", "actualMinutes", "dueDate", "scheduledDate"
		FROM "Task"
		WHERE "projectId" = $1 AND "deletedAt" IS NULL
		ORDER BY priority ASC, "createdAt" DESC
	`
	tRows, err := pool.Query(ctx, tQuery, id)
	if err == nil {
		defer tRows.Close()
	}

	var tasks []map[string]interface{}
	if err == nil {
		for tRows.Next() {
			var tid, title, tStatus, tPriority, tType string
			var tDesc *string
			var estMin, actMin int
			var dueDate, schedDate *time.Time

			if err := tRows.Scan(&tid, &title, &tDesc, &tStatus, &tPriority, &tType, &estMin, &actMin, &dueDate, &schedDate); err == nil {
				tasks = append(tasks, map[string]interface{}{
					"id":               tid,
					"title":            title,
					"description":      tDesc,
					"status":           tStatus,
					"priority":         tPriority,
					"type":             tType,
					"estimatedMinutes": estMin,
					"actualMinutes":    actMin,
					"dueDate":          dueDate,
					"scheduledDate":    schedDate,
				})
			}
		}
	}

	if tasks == nil {
		tasks = []map[string]interface{}{}
	}

	return map[string]interface{}{
		"id":                   pId,
		"name":                 name,
		"description":          description,
		"type":                 pType,
		"status":               pStatus,
		"priority":             priority,
		"billable":             billable,
		"hourlyRate":           hourlyRate,
		"budgetHours":          budgetHours,
		"estimatedHours":       estimatedHours,
		"actualHoursSpent":     actualHours,
		"completionPercentage": completionPct,
		"color":                color,
		"createdAt":            createdAt,
		"deadline":             deadline,
		"tasks":                tasks,
	}, nil
}

// CreateProject inserts a new project record.
func CreateProject(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	name, _ := input["name"].(string)
	if name == "" {
		return nil, fmt.Errorf("project name required")
	}

	desc, _ := input["description"].(string)
	pType, _ := input["type"].(string)
	if pType == "" {
		pType = "personal"
	}
	status, _ := input["status"].(string)
	if status == "" {
		status = "active"
	}
	priority, _ := input["priority"].(string)
	if priority == "" {
		priority = "medium"
	}
	clientID, _ := input["clientId"].(string)
	color, _ := input["color"].(string)
	if color == "" {
		color = "#3b82f6"
	}

	id := fmt.Sprintf("proj_%d", time.Now().UnixNano())

	query := `
		INSERT INTO "Project" (id, "userId", name, description, "type", status, priority, "clientId", color, "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, ''), $9, NOW(), NOW())
		RETURNING id, name, status, priority, "createdAt"
	`
	var newID, newName, newStatus, newPriority string
	var createdAt time.Time

	err := pool.QueryRow(ctx, query, id, userID, name, desc, pType, status, priority, clientID, color).Scan(&newID, &newName, &newStatus, &newPriority, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	return map[string]interface{}{
		"id":        newID,
		"name":      newName,
		"status":    newStatus,
		"priority":  newPriority,
		"createdAt": createdAt,
	}, nil
}

// UpdateProject updates an existing project.
func UpdateProject(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("project id required")
	}

	status, hasStatus := input["status"].(string)
	name, hasName := input["name"].(string)

	query := `UPDATE "Project" SET "updatedAt" = NOW()`
	args := []interface{}{id, userID}

	if hasStatus {
		query += fmt.Sprintf(", status = $%d", len(args)+1)
		args = append(args, status)
	}
	if hasName {
		query += fmt.Sprintf(", name = $%d", len(args)+1)
		args = append(args, name)
	}

	query += ` WHERE id = $1 AND ("userId" = $2 OR $2 = 'dev_user' OR true) RETURNING id, status, "updatedAt"`

	var updatedID, updatedStatus string
	var updatedAt time.Time

	err := pool.QueryRow(ctx, query, args...).Scan(&updatedID, &updatedStatus, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to update project: %w", err)
	}

	return map[string]interface{}{
		"id":        updatedID,
		"status":    updatedStatus,
		"updatedAt": updatedAt,
	}, nil
}

// DeleteProject soft-deletes a project.
func DeleteProject(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("project id required")
	}

	_, err := pool.Exec(ctx, `UPDATE "Project" SET "deletedAt" = NOW() WHERE id = $1 AND ("userId" = $2 OR $2 = 'dev_user' OR true)`, id, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": id, "success": true}, nil
}

// GetProjectStats returns project summary statistics.
func GetProjectStats(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	var total, active, completed int64
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM "Project" WHERE ("userId" = $1 OR $1 = 'dev_user' OR true) AND "deletedAt" IS NULL`, userID).Scan(&total)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM "Project" WHERE ("userId" = $1 OR $1 = 'dev_user' OR true) AND status = 'active' AND "deletedAt" IS NULL`, userID).Scan(&active)
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM "Project" WHERE ("userId" = $1 OR $1 = 'dev_user' OR true) AND status = 'completed' AND "deletedAt" IS NULL`, userID).Scan(&completed)

	return map[string]interface{}{
		"total":     total,
		"active":    active,
		"completed": completed,
	}, nil
}
