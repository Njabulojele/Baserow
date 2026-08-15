package handlers

import (
	"context"
	"fmt"

	"anchor/internal/auth"
	"anchor/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

func GetClients(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	rows, err := pool.Query(ctx, `
		SELECT c.id, c.name, c.company_name, c.email, c.status,
		       c.outstanding_balance_zar, c.lifetime_value_zar,
		       (SELECT count(*) FROM projects p WHERE p.client_id = c.id AND p.deleted_at IS NULL) AS project_count
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
func GetClient(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
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

func CreateClient(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
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
func UpdateClient(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
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
func DeleteClient(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
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
