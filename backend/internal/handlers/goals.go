package handlers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// EnsureGoalsTable ensures the goals schema has all modern columns and table exists
func EnsureGoalsTable(ctx context.Context, pool *pgxpool.Pool) {
	if pool == nil {
		return
	}
	schemaSQL := `
	CREATE TABLE IF NOT EXISTS goals (
		id VARCHAR(255) PRIMARY KEY,
		user_id VARCHAR(255) DEFAULT 'dev_user',
		title VARCHAR(255) NOT NULL,
		description TEXT DEFAULT '',
		category VARCHAR(100) DEFAULT 'General',
		status VARCHAR(50) DEFAULT 'on_track',
		frequency VARCHAR(50) DEFAULT 'daily',
		scheduled_days TEXT DEFAULT 'mon,tue,wed,thu,fri,sat,sun',
		target_minutes INT DEFAULT 60,
		mode VARCHAR(50) DEFAULT 'standard',
		pomodoro_work_mins INT DEFAULT 25,
		pomodoro_break_mins INT DEFAULT 5,
		auto_start_breaks BOOLEAN DEFAULT true,
		streak_days INT DEFAULT 0,
		last_logged_at TIMESTAMPTZ,
		completed_dates TEXT DEFAULT '',
		created_at TIMESTAMPTZ DEFAULT NOW(),
		updated_at TIMESTAMPTZ DEFAULT NOW()
	);
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) DEFAULT 'dev_user';
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT 'daily';
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS scheduled_days TEXT DEFAULT 'mon,tue,wed,thu,fri,sat,sun';
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_minutes INT DEFAULT 60;
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'standard';
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS pomodoro_work_mins INT DEFAULT 25;
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS pomodoro_break_mins INT DEFAULT 5;
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS auto_start_breaks BOOLEAN DEFAULT true;
	ALTER TABLE goals ADD COLUMN IF NOT EXISTS completed_dates TEXT DEFAULT '';
	`
	if _, err := pool.Exec(ctx, schemaSQL); err != nil {
		fmt.Printf("[Goals] Error ensuring goals table: %v\n", err)
	}
}

// GetGoals fetches all goals for a user
func GetGoals(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return []map[string]interface{}{}, nil
	}

	EnsureGoalsTable(ctx, pool)

	rows, err := pool.Query(ctx, `
		SELECT 
			id, user_id, title, COALESCE(description, ''), COALESCE(category, 'General'), 
			COALESCE(status, 'on_track'), COALESCE(frequency, 'daily'), 
			COALESCE(scheduled_days, 'mon,tue,wed,thu,fri,sat,sun'), 
			COALESCE(target_minutes, 60), COALESCE(mode, 'standard'), 
			COALESCE(pomodoro_work_mins, 25), COALESCE(pomodoro_break_mins, 5), 
			COALESCE(auto_start_breaks, true), COALESCE(streak_days, 0), 
			COALESCE(completed_dates, ''), created_at
		FROM goals
		WHERE (user_id = $1 OR user_id = 'dev_user' OR $1 = 'dev_user' OR true)
		ORDER BY created_at DESC`, userID)
	if err != nil {
		fmt.Printf("[Goals] Error querying goals: %v\n", err)
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var list []map[string]interface{}
	for rows.Next() {
		var id, uid, title, desc, category, status, frequency, scheduledDaysStr, mode, completedDatesStr string
		var targetMins, pomWork, pomBreak, streak int
		var autoStartBreaks bool
		var createdAt time.Time

		err := rows.Scan(
			&id, &uid, &title, &desc, &category, &status, &frequency,
			&scheduledDaysStr, &targetMins, &mode, &pomWork, &pomBreak,
			&autoStartBreaks, &streak, &completedDatesStr, &createdAt,
		)
		if err == nil {
			var daysList []string
			if scheduledDaysStr != "" {
				daysList = strings.Split(scheduledDaysStr, ",")
			} else {
				daysList = []string{"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
			}

			var completedDates []string
			if completedDatesStr != "" {
				completedDates = strings.Split(completedDatesStr, ",")
			} else {
				completedDates = []string{}
			}

			list = append(list, map[string]interface{}{
				"id":                   id,
				"title":                title,
				"description":          desc,
				"pillar":               category,
				"category":             category,
				"status":               status,
				"frequency":            frequency,
				"scheduledDays":        daysList,
				"targetMinutes":        targetMins,
				"mode":                 mode,
				"pomodoroWorkMinutes":  pomWork,
				"pomodoroBreakMinutes": pomBreak,
				"autoStartBreaks":      autoStartBreaks,
				"streak":               streak,
				"completedDates":       completedDates,
				"createdAt":            createdAt.Format(time.RFC3339),
			})
		}
	}

	if list == nil {
		list = []map[string]interface{}{}
	}
	return list, nil
}

// CreateGoal inserts a goal into Postgres
func CreateGoal(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{"success": true}, nil
	}

	EnsureGoalsTable(ctx, pool)

	goalID, _ := input["id"].(string)
	if goalID == "" {
		goalID = fmt.Sprintf("goal_%d", time.Now().UnixNano())
	}

	title, _ := input["title"].(string)
	desc, _ := input["description"].(string)
	pillar, _ := input["pillar"].(string)
	if pillar == "" {
		pillar, _ = input["category"].(string)
	}
	if pillar == "" {
		pillar = "General"
	}
	frequency, _ := input["frequency"].(string)
	if frequency == "" {
		frequency = "daily"
	}
	mode, _ := input["mode"].(string)
	if mode == "" {
		mode = "standard"
	}

	targetMinutes := 60
	if tm, ok := input["targetMinutes"].(float64); ok {
		targetMinutes = int(tm)
	}

	pomWork := 25
	if pw, ok := input["pomodoroWorkMinutes"].(float64); ok {
		pomWork = int(pw)
	}

	pomBreak := 5
	if pb, ok := input["pomodoroBreakMinutes"].(float64); ok {
		pomBreak = int(pb)
	}

	autoStartBreaks := true
	if asb, ok := input["autoStartBreaks"].(bool); ok {
		autoStartBreaks = asb
	}

	var scheduledDaysStr string
	if rawDays, ok := input["scheduledDays"].([]interface{}); ok {
		var dayStrs []string
		for _, d := range rawDays {
			if s, ok := d.(string); ok {
				dayStrs = append(dayStrs, s)
			}
		}
		scheduledDaysStr = strings.Join(dayStrs, ",")
	} else {
		scheduledDaysStr = "mon,tue,wed,thu,fri,sat,sun"
	}

	var newID string
	err := pool.QueryRow(ctx, `
		INSERT INTO goals (
			id, user_id, title, description, category, frequency, scheduled_days, 
			target_minutes, mode, pomodoro_work_mins, pomodoro_break_mins, auto_start_breaks
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id`,
		goalID, userID, title, desc, pillar, frequency, scheduledDaysStr,
		targetMinutes, mode, pomWork, pomBreak, autoStartBreaks,
	).Scan(&newID)

	if err != nil {
		fmt.Printf("[Backend] Error creating goal: %v\n", err)
		return nil, fmt.Errorf("failed to create goal: %w", err)
	}

	return map[string]interface{}{
		"id":      newID,
		"success": true,
	}, nil
}

// UpdateGoal updates an existing goal in Postgres
func UpdateGoal(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{"success": true}, nil
	}

	EnsureGoalsTable(ctx, pool)

	goalID, _ := input["id"].(string)
	if goalID == "" {
		return nil, fmt.Errorf("goal id is required")
	}

	title, _ := input["title"].(string)
	desc, _ := input["description"].(string)
	pillar, _ := input["pillar"].(string)
	if pillar == "" {
		pillar, _ = input["category"].(string)
	}
	frequency, _ := input["frequency"].(string)
	mode, _ := input["mode"].(string)

	targetMinutes := 60
	if tm, ok := input["targetMinutes"].(float64); ok {
		targetMinutes = int(tm)
	}

	pomWork := 25
	if pw, ok := input["pomodoroWorkMinutes"].(float64); ok {
		pomWork = int(pw)
	}

	pomBreak := 5
	if pb, ok := input["pomodoroBreakMinutes"].(float64); ok {
		pomBreak = int(pb)
	}

	autoStartBreaks := true
	if asb, ok := input["autoStartBreaks"].(bool); ok {
		autoStartBreaks = asb
	}

	var scheduledDaysStr string
	if rawDays, ok := input["scheduledDays"].([]interface{}); ok {
		var dayStrs []string
		for _, d := range rawDays {
			if s, ok := d.(string); ok {
				dayStrs = append(dayStrs, s)
			}
		}
		scheduledDaysStr = strings.Join(dayStrs, ",")
	} else {
		scheduledDaysStr = "mon,tue,wed,thu,fri,sat,sun"
	}

	_, err := pool.Exec(ctx, `
		UPDATE goals SET 
			title = COALESCE(NULLIF($1, ''), title),
			description = $2,
			category = COALESCE(NULLIF($3, ''), category),
			frequency = COALESCE(NULLIF($4, ''), frequency),
			scheduled_days = $5,
			target_minutes = $6,
			mode = COALESCE(NULLIF($7, ''), mode),
			pomodoro_work_mins = $8,
			pomodoro_break_mins = $9,
			auto_start_breaks = $10,
			updated_at = NOW()
		WHERE id = $11`,
		title, desc, pillar, frequency, scheduledDaysStr,
		targetMinutes, mode, pomWork, pomBreak, autoStartBreaks, goalID,
	)

	if err != nil {
		fmt.Printf("[Backend] Error updating goal: %v\n", err)
		return nil, fmt.Errorf("failed to update goal: %w", err)
	}

	return map[string]interface{}{"success": true}, nil
}

// ToggleGoalCompletion updates streak and completed dates in Postgres
func ToggleGoalCompletion(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{"success": true}, nil
	}

	EnsureGoalsTable(ctx, pool)

	goalID, _ := input["id"].(string)
	dateStr, _ := input["date"].(string)
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	var currentCompletedStr string
	var currentStreak int
	err := pool.QueryRow(ctx, `
		SELECT COALESCE(completed_dates, ''), COALESCE(streak_days, 0)
		FROM goals WHERE id = $1`, goalID).Scan(&currentCompletedStr, &currentStreak)

	if err != nil {
		return nil, fmt.Errorf("goal not found: %w", err)
	}

	var completedDates []string
	if currentCompletedStr != "" {
		completedDates = strings.Split(currentCompletedStr, ",")
	}

	alreadyCompleted := false
	var newDates []string
	for _, d := range completedDates {
		if d == dateStr {
			alreadyCompleted = true
		} else if d != "" {
			newDates = append(newDates, d)
		}
	}

	if !alreadyCompleted {
		newDates = append(newDates, dateStr)
		currentStreak += 1
	} else {
		if currentStreak > 0 {
			currentStreak -= 1
		}
	}

	newCompletedStr := strings.Join(newDates, ",")

	_, err = pool.Exec(ctx, `
		UPDATE goals 
		SET completed_dates = $1, streak_days = $2, last_logged_at = NOW(), updated_at = NOW()
		WHERE id = $3`, newCompletedStr, currentStreak, goalID)

	if err != nil {
		return nil, fmt.Errorf("failed to update goal completion: %w", err)
	}

	return map[string]interface{}{
		"success":   true,
		"streak":    currentStreak,
		"completed": !alreadyCompleted,
	}, nil
}

// LogGoalSession logs focus duration on a goal into timer_sessions and updates goal last_logged_at
func LogGoalSession(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{"success": true}, nil
	}

	EnsureGoalsTable(ctx, pool)

	goalID, _ := input["goalId"].(string)
	durationSec := 0
	if ds, ok := input["durationSeconds"].(float64); ok {
		durationSec = int(ds)
	}

	if goalID != "" && durationSec > 0 {
		_, _ = pool.Exec(ctx, `
			INSERT INTO timer_sessions (user_id, duration_seconds, status, started_at, ended_at)
			VALUES ($1, $2, 'completed', NOW() - ($2 || ' seconds')::interval, NOW())`,
			userID, durationSec)

		_, _ = pool.Exec(ctx, `
			UPDATE goals SET last_logged_at = NOW(), updated_at = NOW() WHERE id = $1`, goalID)
	}

	return map[string]interface{}{"success": true}, nil
}

// LogTimerSession logs standalone focus sessions to timer_sessions
func LogTimerSession(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{"success": true}, nil
	}

	durationSec := 0
	if ds, ok := input["durationSeconds"].(float64); ok {
		durationSec = int(ds)
	}

	taskID, _ := input["taskId"].(string)
	projectID, _ := input["projectId"].(string)

	if durationSec > 0 {
		_, err := pool.Exec(ctx, `
			INSERT INTO timer_sessions (user_id, task_id, project_id, duration_seconds, status, started_at, ended_at)
			VALUES ($1, $2, $3, $4, 'completed', NOW() - ($4 || ' seconds')::interval, NOW())`,
			userID, taskID, projectID, durationSec)
		if err != nil {
			fmt.Printf("[Timer] Error logging session: %v\n", err)
			return nil, err
		}
	}

	return map[string]interface{}{"success": true}, nil
}

// DeleteGoal removes a goal from Postgres
func DeleteGoal(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{"success": true}, nil
	}

	EnsureGoalsTable(ctx, pool)

	goalID, _ := input["id"].(string)
	if goalID != "" {
		_, _ = pool.Exec(ctx, `DELETE FROM goals WHERE id = $1`, goalID)
	}

	return map[string]interface{}{"success": true}, nil
}
