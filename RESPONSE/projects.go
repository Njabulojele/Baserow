package handlers

import (
	"context"
	"fmt"

	"anchor/internal/auth"
	"anchor/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GetProjects lists every project owned by the calling user. Unlike the old version,
// there is no "OR true" fallback, this is the only filter.
func GetProjects(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)

	rows, err := pool.Query(ctx, `
		SELECT id, client_id, name, description, status, priority, color,
		       completion_percentage, actual_hours_spent, revenue_zar, created_at, updated_at
		FROM projects
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []map[string]interface{}
	for rows.Next() {
		var p struct {
			ID, Name, Description, Status, Priority, Color string
			ClientID                                       *string
			CompletionPercentage, ActualHoursSpent          float64
			RevenueZAR                                      float64
			CreatedAt, UpdatedAt                            interface{}
		}
		if err := rows.Scan(&p.ID, &p.ClientID, &p.Name, &p.Description, &p.Status,
			&p.Priority, &p.Color, &p.CompletionPercentage, &p.ActualHoursSpent,
			&p.RevenueZAR, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, map[string]interface{}{
			"id": p.ID, "clientId": p.ClientID, "name": p.Name, "description": p.Description,
			"status": p.Status, "priority": p.Priority, "color": p.Color,
			"completionPercentage": p.CompletionPercentage, "actualHoursSpent": p.ActualHoursSpent,
			"revenueZar": p.RevenueZAR, "createdAt": p.CreatedAt, "updatedAt": p.UpdatedAt,
		})
	}
	return projects, rows.Err()
}

// GetProject fetches a single project. This is the endpoint the audit flagged as having
// no userID filter whatsoever, any authenticated user could fetch any project by id.
// RequireOwner closes that: it 404s before the real SELECT ever runs if the caller
// doesn't own the row.
func GetProject(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}

	if err := db.RequireOwner(ctx, pool, "projects", id, userID, true); err != nil {
		return nil, err
	}

	var p struct {
		ID, Name, Description, Status, Priority, Color string
		ClientID                                       *string
		CompletionPercentage, ActualHoursSpent          float64
		RevenueZAR                                      float64
		CreatedAt, UpdatedAt                            interface{}
	}
	err := pool.QueryRow(ctx, `
		SELECT id, client_id, name, description, status, priority, color,
		       completion_percentage, actual_hours_spent, revenue_zar, created_at, updated_at
		FROM projects WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
		id, userID,
	).Scan(&p.ID, &p.ClientID, &p.Name, &p.Description, &p.Status, &p.Priority, &p.Color,
		&p.CompletionPercentage, &p.ActualHoursSpent, &p.RevenueZAR, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, db.ErrNotFound
	}

	return map[string]interface{}{
		"id": p.ID, "clientId": p.ClientID, "name": p.Name, "description": p.Description,
		"status": p.Status, "priority": p.Priority, "color": p.Color,
		"completionPercentage": p.CompletionPercentage, "actualHoursSpent": p.ActualHoursSpent,
		"revenueZar": p.RevenueZAR, "createdAt": p.CreatedAt, "updatedAt": p.UpdatedAt,
	}, nil
}

func CreateProject(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	name, _ := input["name"].(string)
	description, _ := input["description"].(string)
	color, _ := input["color"].(string)
	clientID, _ := input["clientId"].(string)

	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if err := validateMaxLen("name", name, 255); err != nil {
		return nil, err
	}
	if color == "" {
		color = "#10B981"
	}

	var newID string
	err := pool.QueryRow(ctx, `
		INSERT INTO projects (user_id, client_id, name, description, color, status)
		VALUES ($1, NULLIF($2,'')::uuid, $3, $4, $5, 'active')
		RETURNING id`,
		userID, clientID, name, description, color,
	).Scan(&newID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": newID}, nil
}

// UpdateProject builds a dynamic SET clause but, unlike the old version, refuses to run
// a no-op UPDATE (touching only updated_at) and always scopes to the owning user.
func UpdateProject(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
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

	if len(setClauses) == 1 {
		// Only updated_at would change. Nothing meaningful was actually sent.
		return nil, fmt.Errorf("no fields to update")
	}

	query := fmt.Sprintf(`UPDATE projects SET %s WHERE id = $1 AND user_id = $2
		RETURNING id, updated_at`, joinClauses(setClauses))

	var updatedID string
	var updatedAt interface{}
	if err := pool.QueryRow(ctx, query, args...).Scan(&updatedID, &updatedAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": updatedID, "updatedAt": updatedAt}, nil
}

// DeleteProject soft-deletes the project AND cascades the soft delete to its tasks.
// The audit flagged the cascade as missing, so tasks were being orphaned under an
// archived project and still showing up as active work.
func DeleteProject(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
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

func joinClauses(clauses []string) string {
	out := clauses[0]
	for _, c := range clauses[1:] {
		out += ", " + c
	}
	return out
}
