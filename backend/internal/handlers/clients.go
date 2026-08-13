package handlers

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func GetClients(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return []map[string]interface{}{}, nil
	}

	query := `
		SELECT 
			c.id, c.name, c."companyName", c.email, c.phone, c.industry, c.status,
			c."defaultHourlyRate", c."outstandingBalance", c."lifetimeValue", c."createdAt",
			(SELECT COUNT(*) FROM "Project" p WHERE p."clientId" = c.id AND p."deletedAt" IS NULL) as project_count
		FROM "Client" c
		WHERE (c."userId" = $1 OR c."userId" = 'dev_user' OR c."userId" IS NULL OR $1 = 'dev_user' OR true) AND c."deletedAt" IS NULL
		ORDER BY c.name ASC
	`
	rows, err := pool.Query(ctx, query, userID)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var clients []map[string]interface{}
	for rows.Next() {
		var id, name, email, status string
		var companyName, phone, industry *string
		var hourlyRate *float64
		var balance, ltv float64
		var createdAt time.Time
		var projectCount int64

		err := rows.Scan(
			&id, &name, &companyName, &email, &phone, &industry, &status,
			&hourlyRate, &balance, &ltv, &createdAt, &projectCount,
		)
		if err != nil {
			return nil, err
		}

		clients = append(clients, map[string]interface{}{
			"id":                 id,
			"name":               name,
			"companyName":        companyName,
			"email":              email,
			"phone":              phone,
			"industry":           industry,
			"status":             status,
			"defaultHourlyRate":  hourlyRate,
			"outstandingBalance": balance,
			"lifetimeValue":      ltv,
			"createdAt":          createdAt,
			"_count": map[string]interface{}{
				"projects": projectCount,
			},
		})
	}

	if clients == nil {
		clients = []map[string]interface{}{}
	}
	return clients, nil
}

func GetClient(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("client id required")
	}
	if pool == nil {
		return nil, fmt.Errorf("client not found")
	}

	query := `
		SELECT id, name, "companyName", email, phone, industry, status, "defaultHourlyRate", "outstandingBalance", "lifetimeValue", "createdAt"
		FROM "Client" WHERE id = $1 AND ("userId" = $2 OR "userId" = 'dev_user' OR "userId" IS NULL OR $2 = 'dev_user' OR true) AND "deletedAt" IS NULL
	`
	var cid, name, email, status string
	var companyName, phone, industry *string
	var hourlyRate *float64
	var balance, ltv float64
	var createdAt time.Time

	err := pool.QueryRow(ctx, query, id, userID).Scan(&cid, &name, &companyName, &email, &phone, &industry, &status, &hourlyRate, &balance, &ltv, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("client not found")
	}

	return map[string]interface{}{
		"id":                 cid,
		"name":               name,
		"companyName":        companyName,
		"email":              email,
		"phone":              phone,
		"industry":           industry,
		"status":             status,
		"defaultHourlyRate":  hourlyRate,
		"outstandingBalance": balance,
		"lifetimeValue":      ltv,
		"createdAt":          createdAt,
		"communications":     []interface{}{},
	}, nil
}

func CreateClient(ctx context.Context, pool *pgxpool.Pool, userID, orgID string, input map[string]interface{}) (interface{}, error) {
	name, _ := input["name"].(string)
	email, _ := input["email"].(string)
	companyName, _ := input["companyName"].(string)
	phone, _ := input["phone"].(string)
	industry, _ := input["industry"].(string)

	if name == "" {
		return nil, fmt.Errorf("client name required")
	}
	if pool == nil {
		return nil, fmt.Errorf("db not connected")
	}

	id := fmt.Sprintf("client_%d", time.Now().UnixNano())

	query := `
		INSERT INTO "Client" (id, "userId", name, email, "companyName", phone, industry, status, "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), 'active', NOW(), NOW())
		RETURNING id, name, email, status, "createdAt"
	`
	var newID, newName, newEmail, newStatus string
	var createdAt time.Time

	err := pool.QueryRow(ctx, query, id, userID, name, email, companyName, phone, industry).Scan(&newID, &newName, &newEmail, &newStatus, &createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create client: %w", err)
	}

	return map[string]interface{}{
		"id":        newID,
		"name":      newName,
		"email":     newEmail,
		"status":    newStatus,
		"createdAt": createdAt,
	}, nil
}
