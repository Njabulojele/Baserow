package db

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound  = errors.New("not found")
	ErrForbidden = errors.New("forbidden")
)

// allowedTables is an explicit whitelist. table is only ever used to build a query
// string (Postgres doesn't support parameterized identifiers), so this whitelist is
// what stops it from becoming an injection vector if a handler ever passes a bad value.
var allowedTables = map[string]bool{
	"clients":         true,
	"projects":        true,
	"tasks":           true,
	"goals":           true,
	"crm_leads":       true,
	"canvas_boards":   true,
	"pillars":         true,
	"habit_templates": true,
}

// RequireOwner confirms that the row identified by id in the given table belongs to
// userID, and that it hasn't been soft-deleted where the table has a deleted_at column.
// Every single-record GET, UPDATE, and DELETE handler should call this before doing
// anything else. It replaces the "OR true" / missing-filter pattern across the codebase
// with one function that can't accidentally be skipped or mistyped per-handler.
func RequireOwner(ctx context.Context, pool *pgxpool.Pool, table, id, userID string, hasSoftDelete bool) error {
	if !allowedTables[table] {
		return fmt.Errorf("table %q is not in the ownership whitelist", table)
	}
	query := fmt.Sprintf(`SELECT user_id FROM %s WHERE id = $1`, table)
	if hasSoftDelete {
		query += ` AND deleted_at IS NULL`
	}
	var owner string
	err := pool.QueryRow(ctx, query, id).Scan(&owner)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if owner != userID {
		// Deliberately returns the same error as "not found" to the caller. Handlers
		// should surface this as a 404, not a 403, so a user probing random ids
		// can't distinguish "doesn't exist" from "exists but isn't yours".
		return ErrNotFound
	}
	return nil
}

// ScopedWhere returns the WHERE clause fragment every list/update/delete query should
// use, given the positional parameter index that will hold userID.
func ScopedWhere(userIDParamIndex int, extraSoftDelete bool) string {
	clause := fmt.Sprintf(`user_id = $%d`, userIDParamIndex)
	if extraSoftDelete {
		clause += ` AND deleted_at IS NULL`
	}
	return clause
}
