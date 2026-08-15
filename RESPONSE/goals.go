package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"anchor/internal/auth"
	"anchor/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Note: this assumes the consolidated migration (001_consolidated_schema.sql) has run,
// so `goals` is a real table with user_id, and the old EnsureGoalsTable() call that ran
// a schema migration on every single request has been deleted entirely. If that
// function is still being called anywhere in main.go's request path, remove it, it was
// doing real damage to request latency independent of the security issues.

func GetGoals(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	rows, err := pool.Query(ctx, `
		SELECT id, title, category, status, streak_days, neglect_threshold_days,
		       completed_dates, last_logged_at, target_hours, completed_hours,
		       target_value_zar, current_value_zar, created_at
		FROM goals WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var goals []map[string]interface{}
	for rows.Next() {
		var (
			id, title, category, status string
			streakDays, neglectDays     int
			completedDatesRaw           []byte
			lastLoggedAt                *time.Time
			targetHours, completedHours float64
			targetValue, currentValue   float64
			createdAt                   interface{}
		)
		if err := rows.Scan(&id, &title, &category, &status, &streakDays, &neglectDays,
			&completedDatesRaw, &lastLoggedAt, &targetHours, &completedHours,
			&targetValue, &currentValue, &createdAt); err != nil {
			return nil, err
		}
		var completedDates []string
		_ = json.Unmarshal(completedDatesRaw, &completedDates)

		goals = append(goals, map[string]interface{}{
			"id": id, "title": title, "category": category, "status": status,
			"streak": streakDays, "neglectThresholdDays": neglectDays,
			"completedDates": completedDates, "lastLoggedAt": lastLoggedAt,
			"targetHours": targetHours, "completedHours": completedHours,
			"targetValueZar": targetValue, "currentValueZar": currentValue,
			"createdAt": createdAt,
		})
	}
	return goals, rows.Err()
}

func CreateGoal(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	title, _ := input["title"].(string)
	category, _ := input["category"].(string)
	if title == "" {
		return nil, fmt.Errorf("title is required")
	}
	if category == "" {
		category = "General"
	}
	var newID string
	err := pool.QueryRow(ctx, `
		INSERT INTO goals (user_id, title, category) VALUES ($1, $2, $3) RETURNING id`,
		userID, title, category).Scan(&newID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": newID}, nil
}

// UpdateGoal previously had no ownership check at all in its WHERE clause. Fixed here
// by requiring RequireOwner first, same as everywhere else.
func UpdateGoal(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "goals", id, userID, false); err != nil {
		return nil, err
	}
	_, err := pool.Exec(ctx, `
		UPDATE goals SET
		  title = COALESCE(NULLIF($3, ''), title),
		  category = COALESCE(NULLIF($4, ''), category),
		  target_hours = COALESCE($5, target_hours),
		  target_value_zar = COALESCE($6, target_value_zar),
		  updated_at = NOW()
		WHERE id = $1 AND user_id = $2`,
		id, userID, input["title"], input["category"], input["targetHours"], input["targetValueZar"])
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}

// DeleteGoal previously ran a hard DELETE with no ownership check whatsoever. Now it's
// ownership-checked and soft-deleted would be preferable long term for the goal
// analytics history, but that needs a deleted_at column added to the schema first; for
// now this keeps the hard delete but at least only the owner can trigger it.
func DeleteGoal(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if err := db.RequireOwner(ctx, pool, "goals", id, userID, false); err != nil {
		return nil, err
	}
	_, err := pool.Exec(ctx, `DELETE FROM goals WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}

// ToggleGoalCompletion previously fetched and updated by goal id alone, no userID
// anywhere, meaning any user could toggle any other user's goal completion and inflate
// or wipe their streaks. It also trusted a client-supplied date with no bounds, which
// meant a client could log a completion for any date in the past or future to game the
// streak. Both are fixed below.
func ToggleGoalCompletion(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	goalID, _ := input["id"].(string)
	if err := db.RequireOwner(ctx, pool, "goals", goalID, userID, false); err != nil {
		return nil, err
	}

	dateStr, _ := input["date"].(string)
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}
	parsedDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, fmt.Errorf("invalid date format")
	}
	now := time.Now()
	if parsedDate.After(now.Add(24 * time.Hour)) {
		return nil, fmt.Errorf("date cannot be in the future")
	}
	if parsedDate.Before(now.AddDate(0, 0, -30)) {
		// A month of backfill room is generous but bounded, streak inflation via an
		// arbitrarily old date is no longer possible.
		return nil, fmt.Errorf("date is too far in the past to log")
	}

	var completedDatesRaw []byte
	var streakDays int
	err = pool.QueryRow(ctx, `
		SELECT completed_dates, streak_days FROM goals WHERE id = $1 AND user_id = $2`,
		goalID, userID).Scan(&completedDatesRaw, &streakDays)
	if err != nil {
		return nil, db.ErrNotFound
	}

	var completedDates []string
	_ = json.Unmarshal(completedDatesRaw, &completedDates)

	toggled := false
	newDates := make([]string, 0, len(completedDates))
	for _, d := range completedDates {
		if d == dateStr {
			toggled = true
			continue // removing it, this is an "un-complete"
		}
		newDates = append(newDates, d)
	}
	if !toggled {
		newDates = append(newDates, dateStr)
		streakDays++
	} else {
		if streakDays > 0 {
			streakDays--
		}
	}

	newDatesJSON, _ := json.Marshal(newDates)
	_, err = pool.Exec(ctx, `
		UPDATE goals SET completed_dates = $1, streak_days = $2, last_logged_at = NOW(), updated_at = NOW()
		WHERE id = $3 AND user_id = $4`, newDatesJSON, streakDays, goalID, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"completed": !toggled, "streak": streakDays}, nil
}

func LogGoalSession(ctx context.Context, pool *pgxpool.Pool, input map[string]interface{}) (interface{}, error) {
	userID := auth.UserIDFromContext(ctx)
	goalID, _ := input["goalId"].(string)
	if err := db.RequireOwner(ctx, pool, "goals", goalID, userID, false); err != nil {
		return nil, err
	}
	durationFloat, _ := input["durationSeconds"].(float64)
	durationSec := int(durationFloat)
	if durationSec <= 0 || durationSec > 12*3600 {
		// A single session over 12 hours is almost certainly a bad client value, not a
		// real focus session, cap it rather than trusting it blindly.
		return nil, fmt.Errorf("durationSeconds out of range")
	}

	_, err := pool.Exec(ctx, `
		INSERT INTO timer_sessions (user_id, goal_id, status, duration_seconds, started_at, ended_at)
		VALUES ($1, $2, 'completed', $3, NOW() - ($3 * interval '1 second'), NOW())`,
		userID, goalID, durationSec)
	if err != nil {
		return nil, err
	}
	_, err = pool.Exec(ctx, `
		UPDATE goals SET completed_hours = completed_hours + $2, last_logged_at = NOW()
		WHERE id = $1 AND user_id = $3`, goalID, float64(durationSec)/3600.0, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}
