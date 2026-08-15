package handlers

import (
	"context"
	"fmt"

	"anchor/internal/auth"
	"anchor/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

func GetCRMLeadsByStatus(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
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

func CreateCRMLead(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	firstName, _ := input["firstName"].(string)
	lastName, _ := input["lastName"].(string)
	email, _ := input["email"].(string)
	companyName, _ := input["companyName"].(string)
	source, _ := input["source"].(string)

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

func UpdateCRMLeadStatus(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
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
func ConvertCRMLeadToClient(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	leadID, _ := input["id"].(string)
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
