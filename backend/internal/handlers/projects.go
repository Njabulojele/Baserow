package handlers

import (
	"context"
	"fmt"
	"math"

	"anchor-backend/internal/auth"
	"anchor-backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetProjects lists every project owned by the calling user.
func GetProjects(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)

	var projects []map[string]interface{}
	if pool != nil {
		query := `
			SELECT p.id, p.client_id, p.name, p.description, p.status, p.priority, p.color,
			       p.completion_percentage, p.actual_hours_spent, p.revenue_zar, p.created_at, p.updated_at,
			       COALESCE(tc.total_tasks, 0) AS total_tasks,
			       COALESCE(tc.completed_tasks, 0) AS completed_tasks
			FROM projects p
			LEFT JOIN (
				SELECT project_id,
				       COUNT(*) AS total_tasks,
				       COUNT(*) FILTER (WHERE status IN ('done', 'completed')) AS completed_tasks
				FROM tasks
				WHERE user_id = $1 AND deleted_at IS NULL
				GROUP BY project_id
			) tc ON tc.project_id = p.id
			WHERE p.user_id = $1 AND p.deleted_at IS NULL
			ORDER BY p.updated_at DESC
		`

		rows, err := pool.Query(ctx, query, userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id, name, status, priority, color string
				var description *string
				var clientID *string
				var completionPct, actualHours, revenueZAR float64
				var createdAt, updatedAt interface{}
				var totalTasks, completedTasks int64

				if err := rows.Scan(&id, &clientID, &name, &description, &status, &priority, &color,
					&completionPct, &actualHours, &revenueZAR, &createdAt, &updatedAt,
					&totalTasks, &completedTasks); err == nil {

					pct := completionPct
					if totalTasks > 0 {
						pct = math.Round((float64(completedTasks) / float64(totalTasks)) * 100)
					}

					projects = append(projects, map[string]interface{}{
						"id":                   id,
						"clientId":             clientID,
						"name":                 name,
						"description":          description,
						"status":               status,
						"priority":             priority,
						"color":                color,
						"completionPercentage": pct,
						"actualHoursSpent":     actualHours,
						"revenueZar":           revenueZAR,
						"createdAt":            createdAt,
						"updatedAt":            updatedAt,
						"totalTasks":           totalTasks,
						"completedTasks":       completedTasks,
						"_count":               map[string]interface{}{"tasks": totalTasks},
					})
				}
			}
		}
	}

	if projects == nil {
		projects = []map[string]interface{}{}
	}
	return projects, nil
}

// GetProject fetches a single project. The old version had no userID filter at all —
// any authenticated user could fetch any project by id.
func GetProject(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "projects", id, userID, true); err != nil {
		return nil, err
	}

	var pid, name, status, priority, color string
	var description *string
	var clientID *string
	var completionPct, actualHours, revenueZAR float64
	var createdAt, updatedAt interface{}

	err := pool.QueryRow(ctx, `
		SELECT id, client_id, name, description, status, priority, color,
		       completion_percentage, actual_hours_spent, revenue_zar, created_at, updated_at
		FROM projects WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
		id, userID,
	).Scan(&pid, &clientID, &name, &description, &status, &priority, &color,
		&completionPct, &actualHours, &revenueZAR, &createdAt, &updatedAt)
	if err != nil {
		return nil, db.ErrNotFound
	}

	// Fetch tasks for this project
	tRows, _ := pool.Query(ctx, `
		SELECT id, title, description, status, priority, estimated_minutes, actual_minutes, due_date, scheduled_date
		FROM tasks WHERE project_id = $1 AND user_id = $2 AND deleted_at IS NULL
		ORDER BY created_at DESC`, id, userID)
	var tasks []map[string]interface{}
	if tRows != nil {
		defer tRows.Close()
		for tRows.Next() {
			var tid, ttitle, tstatus, tpriority string
			var tdesc *string
			var estMin, actMin int
			var dueDate, schedDate interface{}
			if err := tRows.Scan(&tid, &ttitle, &tdesc, &tstatus, &tpriority, &estMin, &actMin, &dueDate, &schedDate); err == nil {
				tasks = append(tasks, map[string]interface{}{
					"id": tid, "title": ttitle, "description": tdesc,
					"status": tstatus, "priority": tpriority,
					"estimatedMinutes": estMin, "actualMinutes": actMin,
					"dueDate": dueDate, "scheduledDate": schedDate,
				})
			}
		}
	}
	if tasks == nil {
		tasks = []map[string]interface{}{}
	}

	return map[string]interface{}{
		"id": pid, "clientId": clientID, "name": name, "description": description,
		"status": status, "priority": priority, "color": color,
		"completionPercentage": completionPct, "actualHoursSpent": actualHours,
		"revenueZar": revenueZAR, "createdAt": createdAt, "updatedAt": updatedAt,
		"tasks": tasks,
	}, nil
}

func CreateProject(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	name, _ := input["name"].(string)
	description, _ := input["description"].(string)
	color, _ := input["color"].(string)
	clientID, _ := input["clientId"].(string)
	status, _ := input["status"].(string)
	priority, _ := input["priority"].(string)

	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if err := validateMaxLen("name", name, 255); err != nil {
		return nil, err
	}
	if color == "" {
		color = "#10B981"
	}
	if status == "" {
		status = "active"
	} else if err := validateEnum("status", status, ProjectStatuses); err != nil {
		return nil, err
	}
	if priority == "" {
		priority = "medium"
	}

	projectID, _ := input["id"].(string)
	var newID string
	err := pool.QueryRow(ctx, `
		INSERT INTO projects (id, user_id, client_id, name, description, color, status, priority)
		VALUES (COALESCE(NULLIF($1, ''), gen_random_uuid()::text), $2, NULLIF($3,''), $4, $5, $6, $7, $8)
		RETURNING id`,
		projectID, userID, clientID, name, description, color, status, priority,
	).Scan(&newID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": newID}, nil
}

// UpdateProject builds a dynamic SET clause. Unlike the old version, it refuses to run
// a no-op UPDATE and always scopes to the owning user.
func UpdateProject(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "projects", id, userID, true); err != nil {
		return nil, err
	}

	setClauses := []string{`updated_at = NOW()`}
	args := []interface{}{id, userID}
	nextParam := 3

	if status, ok := input["status"].(string); ok && status != "" {
		if err := validateEnum("status", status, ProjectStatuses); err != nil {
			return nil, err
		}
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", nextParam))
		args = append(args, status)
		nextParam++
	}
	if name, ok := input["name"].(string); ok && name != "" {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", nextParam))
		args = append(args, name)
		nextParam++
	}
	if description, ok := input["description"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", nextParam))
		args = append(args, description)
		nextParam++
	}
	if completionPct, ok := input["completionPercentage"].(float64); ok {
		setClauses = append(setClauses, fmt.Sprintf("completion_percentage = $%d", nextParam))
		args = append(args, completionPct)
		nextParam++
	}

	if len(setClauses) == 1 {
		return nil, fmt.Errorf("no fields to update")
	}

	query := fmt.Sprintf(`UPDATE projects SET %s WHERE id = $1 AND user_id = $2 RETURNING id, updated_at`,
		joinClauses(setClauses))

	var updatedID string
	var updatedAt interface{}
	if err := pool.QueryRow(ctx, query, args...).Scan(&updatedID, &updatedAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": updatedID, "updatedAt": updatedAt}, nil
}

// DeleteProject soft-deletes the project AND cascades the soft delete to its tasks.
func DeleteProject(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "projects", id, userID, true); err != nil {
		return nil, err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `UPDATE projects SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`, id, userID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE tasks SET deleted_at = NOW() WHERE project_id = $1 AND user_id = $2`, id, userID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}

func GetProjectStats(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	var total, active, completed int64
	_ = pool.QueryRow(ctx, `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'active') as active,
			COUNT(*) FILTER (WHERE status = 'completed') as completed
		FROM projects WHERE user_id = $1 AND deleted_at IS NULL`, userID,
	).Scan(&total, &active, &completed)

	return map[string]interface{}{"total": total, "active": active, "completed": completed}, nil
}

func joinClauses(clauses []string) string {
	out := clauses[0]
	for _, c := range clauses[1:] {
		out += ", " + c
	}
	return out
}
