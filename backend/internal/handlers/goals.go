package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"anchor-backend/internal/auth"
	"anchor-backend/internal/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Note: EnsureGoalsTable() has been deleted. Goals is now a real table from the
// consolidated migration (002_consolidated_schema.sql). There is no schema migration
// running on every request anymore.

func GetGoals(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	rows, err := pool.Query(ctx, `
		SELECT id, title, category, status, streak_days, neglect_threshold_days,
		       completed_dates, last_logged_at, target_hours, completed_hours,
		       target_value_zar, current_value_zar, created_at
		FROM goals WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var goals []map[string]interface{}
	for rows.Next() {
		var id, title, category, status string
		var streakDays, neglectDays int
		var completedDatesRaw []byte
		var lastLoggedAt *time.Time
		var targetHours, completedHours float64
		var targetValue, currentValue float64
		var createdAt interface{}

		if err := rows.Scan(&id, &title, &category, &status, &streakDays, &neglectDays,
			&completedDatesRaw, &lastLoggedAt, &targetHours, &completedHours,
			&targetValue, &currentValue, &createdAt); err != nil {
			return nil, err
		}
		var completedDates []string
		_ = json.Unmarshal(completedDatesRaw, &completedDates)
		if completedDates == nil {
			completedDates = []string{}
		}

		goals = append(goals, map[string]interface{}{
			"id": id, "title": title, "category": category, "pillar": category,
			"status": status, "streak": streakDays, "neglectThresholdDays": neglectDays,
			"completedDates": completedDates, "lastLoggedAt": lastLoggedAt,
			"targetHours": targetHours, "completedHours": completedHours,
			"targetValueZar": targetValue, "currentValueZar": currentValue,
			"createdAt": createdAt,
		})
	}
	if goals == nil {
		goals = []map[string]interface{}{}
	}
	return goals, rows.Err()
}

func CreateGoal(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	title, _ := input["title"].(string)
	category, _ := input["category"].(string)
	if pillar, ok := input["pillar"].(string); ok && pillar != "" {
		category = pillar
	}

	if title == "" {
		return nil, fmt.Errorf("title is required")
	}
	if err := validateMaxLen("title", title, 255); err != nil {
		return nil, err
	}
	if category == "" {
		category = "General"
	}

	goalID, _ := input["id"].(string)
	var newID string
	err := pool.QueryRow(ctx, `
		INSERT INTO goals (id, user_id, title, category) VALUES (COALESCE(NULLIF($1, ''), gen_random_uuid()::text), $2, $3, $4) RETURNING id`,
		goalID, userID, title, category).Scan(&newID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"id": newID, "success": true}, nil
}

// UpdateGoal previously had no ownership check at all in its WHERE clause.
func UpdateGoal(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "goals", id, userID, false); err != nil {
		return nil, err
	}

	category, _ := input["category"].(string)
	if pillar, ok := input["pillar"].(string); ok && pillar != "" {
		category = pillar
	}

	_, err := pool.Exec(ctx, `
		UPDATE goals SET
		  title = COALESCE(NULLIF($3, ''), title),
		  category = COALESCE(NULLIF($4, ''), category),
		  target_hours = COALESCE($5, target_hours),
		  target_value_zar = COALESCE($6, target_value_zar),
		  updated_at = NOW()
		WHERE id = $1 AND user_id = $2`,
		id, userID, input["title"], category, input["targetHours"], input["targetValueZar"])
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}

// DeleteGoal previously ran a hard DELETE with no ownership check. Now ownership-checked.
// A deleted_at column would be cleaner long-term for analytics history preservation.
func DeleteGoal(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "goals", id, userID, false); err != nil {
		return nil, err
	}
	_, err := pool.Exec(ctx, `DELETE FROM goals WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}

// ToggleGoalCompletion previously had no userID anywhere — any user could toggle any
// other user's goal and inflate/wipe streaks. The client-supplied date was also trusted
// blindly, allowing retroactive completions for any date. Both are fixed below.
func ToggleGoalCompletion(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	goalID, _ := input["id"].(string)
	if goalID == "" {
		return nil, fmt.Errorf("id is required")
	}
	if err := db.RequireOwner(ctx, pool, "goals", goalID, userID, false); err != nil {
		return nil, err
	}

	dateStr, _ := input["date"].(string)
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}
	parsedDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}
	now := time.Now()
	if parsedDate.After(now.Add(24 * time.Hour)) {
		return nil, fmt.Errorf("date cannot be in the future")
	}
	if parsedDate.Before(now.AddDate(0, 0, -30)) {
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
			continue // un-completing: skip this date
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

func LogGoalSession(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	goalID, _ := input["goalId"].(string)
	if goalID == "" {
		return nil, fmt.Errorf("goalId is required")
	}
	if err := db.RequireOwner(ctx, pool, "goals", goalID, userID, false); err != nil {
		return nil, err
	}

	durationFloat, _ := input["durationSeconds"].(float64)
	durationSec := int(durationFloat)
	if durationSec <= 0 || durationSec > 12*3600 {
		return nil, fmt.Errorf("durationSeconds must be between 1 and 43200")
	}

	_, err := pool.Exec(ctx, `
		INSERT INTO timer_sessions (user_id, goal_id, status, duration_seconds, started_at, ended_at)
		VALUES ($1, $2, 'completed', $3, NOW() - ($3 * interval '1 second'), NOW())`,
		userID, goalID, durationSec)
	if err != nil {
		return nil, err
	}
	_, _ = pool.Exec(ctx, `
		UPDATE goals SET completed_hours = completed_hours + $2, last_logged_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND user_id = $3`, goalID, float64(durationSec)/3600.0, userID)

	return map[string]interface{}{"success": true}, nil
}

func LogTimerSession(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	durationFloat, _ := input["durationSeconds"].(float64)
	durationSec := int(durationFloat)
	if durationSec <= 0 || durationSec > 12*3600 {
		return nil, fmt.Errorf("durationSeconds must be between 1 and 43200")
	}

	taskID, _ := input["taskId"].(string)
	projectID, _ := input["projectId"].(string)

	// Validate ownership of referenced task/project if provided
	if taskID != "" {
		if err := db.RequireOwner(ctx, pool, "tasks", taskID, userID, true); err != nil {
			taskID = "" // just drop the reference rather than fail the whole insert
		}
	}
	if projectID != "" {
		if err := db.RequireOwner(ctx, pool, "projects", projectID, userID, true); err != nil {
			projectID = ""
		}
	}

	_, err := pool.Exec(ctx, `
		INSERT INTO timer_sessions (user_id, task_id, project_id, duration_seconds, status, started_at, ended_at)
		VALUES ($1, NULLIF($2,'')::uuid, NULLIF($3,'')::uuid, $4, 'completed', NOW() - ($4 * interval '1 second'), NOW())`,
		userID, taskID, projectID, durationSec)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"success": true}, nil
}

func GetStreaks(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	var maxStreak, totalGoals int
	_ = pool.QueryRow(ctx, `
		SELECT COALESCE(MAX(streak_days), 0), COUNT(*) FROM goals WHERE user_id = $1`, userID,
	).Scan(&maxStreak, &totalGoals)
	return map[string]interface{}{
		"currentStreak": maxStreak,
		"bestStreak":    maxStreak,
		"totalHabits":   totalGoals,
	}, nil
}

// SeedDefaults is a no-op in the new schema.
func SeedDefaults(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return map[string]interface{}{"seeded": true}, nil
}
