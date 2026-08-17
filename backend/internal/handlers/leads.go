package handlers

import (
	"context"
	"fmt"

	"anchor-backend/internal/auth"
	"anchor-backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

func GetCRMLeadsByStatus(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	rows, err := pool.Query(ctx, `
		SELECT id, first_name, last_name, email, company_name, source, status, score, estimated_value_zar, created_at
		FROM crm_leads WHERE user_id = $1 ORDER BY score DESC`, userID)
	if err != nil {
		return map[string]interface{}{}, nil
	}
	defer rows.Close()

	byStatus := map[string][]map[string]interface{}{}
	for rows.Next() {
		var id, status string
		var firstName, lastName, email, companyName, source *string
		var score int
		var estimatedValue float64
		var createdAt interface{}

		if err := rows.Scan(&id, &firstName, &lastName, &email, &companyName, &source,
			&status, &score, &estimatedValue, &createdAt); err != nil {
			return nil, err
		}
		lead := map[string]interface{}{
			"id": id, "firstName": firstName, "lastName": lastName, "email": email,
			"companyName": companyName, "source": source, "status": status,
			"score": score, "estimatedValueZar": estimatedValue, "createdAt": createdAt,
		}
		byStatus[status] = append(byStatus[status], lead)
	}
	return byStatus, rows.Err()
}

func GetCRMLeadStats(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	var total, won, lost int64
	var totalValue float64
	_ = pool.QueryRow(ctx, `
		SELECT COUNT(*),
		       COUNT(*) FILTER (WHERE status = 'WON'),
		       COUNT(*) FILTER (WHERE status = 'LOST'),
		       COALESCE(SUM(estimated_value_zar), 0)
		FROM crm_leads WHERE user_id = $1`, userID,
	).Scan(&total, &won, &lost, &totalValue)

	winRate := 0.0
	if total > 0 {
		winRate = float64(won) / float64(total) * 100
	}
	return map[string]interface{}{
		"total": total, "won": won, "lost": lost,
		"winRate": winRate, "totalPipelineValue": totalValue,
	}, nil
}

func CreateCRMLead(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	firstName, _ := input["firstName"].(string)
	lastName, _ := input["lastName"].(string)
	email, _ := input["email"].(string)
	companyName, _ := input["companyName"].(string)
	source, _ := input["source"].(string)

	if firstName == "" && lastName == "" {
		return nil, fmt.Errorf("firstName or lastName is required")
	}
	if err := validateEmail(email); err != nil {
		return nil, err
	}

	leadID, _ := input["id"].(string)
	var newID string
	err := pool.QueryRow(ctx, `
		INSERT INTO crm_leads (id, user_id, first_name, last_name, email, company_name, source, status, score)
		VALUES (COALESCE(NULLIF($1, ''), gen_random_uuid()::text), $2, NULLIF($3,''), NULLIF($4,''), NULLIF($5,''), NULLIF($6,''), NULLIF($7,''), 'NEW', 50)
		RETURNING id`,
		leadID, userID, firstName, lastName, email, companyName, source).Scan(&newID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": newID, "status": "NEW"}, nil
}

func UpdateCRMLeadStatus(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	status, _ := input["status"].(string)

	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
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

// ConvertCRMLeadToClient previously read the source lead with no ownership check,
// meaning user A could convert user B's lead into a client under user A's account.
// All steps now run inside a transaction fully scoped to the calling user.
func ConvertCRMLeadToClient(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	leadID, _ := input["id"].(string)
	if leadID == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "crm_leads", leadID, userID, false); err != nil {
		return nil, err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var firstName, lastName string
	var email, companyName *string
	var estValue float64
	err = tx.QueryRow(ctx, `
		SELECT first_name, last_name, email, company_name, COALESCE(estimated_value_zar, 0) FROM crm_leads
		WHERE id = $1 AND user_id = $2`, leadID, userID,
	).Scan(&firstName, &lastName, &email, &companyName, &estValue)
	if err != nil {
		return nil, db.ErrNotFound
	}

	fullName := ""
	if firstName != "" {
		fullName = firstName
	}
	if lastName != "" {
		if fullName != "" {
			fullName += " "
		}
		fullName += lastName
	}
	if fullName == "" {
		fullName = "Unknown"
	}

	var clientID string
	err = tx.QueryRow(ctx, `
		INSERT INTO clients (id, user_id, name, company_name, email, status, lifetime_value_zar)
		VALUES (gen_random_uuid()::text, $1, $2, $3, $4, 'active', $5) RETURNING id`,
		userID, fullName, companyName, email, estValue).Scan(&clientID)
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
	return map[string]interface{}{"clientId": clientID, "success": true}, nil
}

func DeleteCRMLead(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "crm_leads", id, userID, false); err != nil {
		return nil, err
	}
	_, err := pool.Exec(ctx, `DELETE FROM crm_leads WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}
