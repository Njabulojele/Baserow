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
	if u := auth.UserIDFromContext(ctx); u != "" && u != "dev_user_local_only" {
		userID = u
	}
	if pool == nil {
		return map[string]interface{}{"success": true}, nil
	}

	durationFloat, _ := input["durationSeconds"].(float64)
	durationSec := int(durationFloat)
	if durationSec <= 0 || durationSec > 24*3600 {
		return nil, fmt.Errorf("durationSeconds must be between 1 and 86400")
	}

	taskID, _ := input["taskId"].(string)
	projectID, _ := input["projectId"].(string)
	goalID, _ := input["goalId"].(string)
	sessionType, _ := input["sessionType"].(string)
	if sessionType == "" {
		sessionType = "focus"
	}
	title, _ := input["title"].(string)
	notes, _ := input["notes"].(string)
	completed, _ := input["completed"].(bool)

	// Validate ownership if provided
	if taskID != "" {
		if err := db.RequireOwner(ctx, pool, "tasks", taskID, userID, true); err != nil {
			taskID = ""
		}
	}
	if projectID != "" {
		if err := db.RequireOwner(ctx, pool, "projects", projectID, userID, true); err != nil {
			projectID = ""
		}
	}
	if goalID != "" {
		if err := db.RequireOwner(ctx, pool, "goals", goalID, userID, true); err != nil {
			goalID = ""
		}
	}

	_, err := pool.Exec(ctx, `
		INSERT INTO timer_sessions (id, user_id, task_id, project_id, goal_id, duration_seconds, status, session_type, title, notes, started_at, ended_at)
		VALUES (gen_random_uuid()::text, $1, NULLIF($2::text,''), NULLIF($3::text,''), NULLIF($4::text,''), $5::int, 'completed', $6, $7, $8, NOW() - ($5::int * interval '1 second'), NOW())`,
		userID, taskID, projectID, goalID, durationSec, sessionType, title, notes)
	if err != nil {
		return nil, err
	}

	// Dual-write into activity_events
	entityType := "session"
	entityID := sessionType
	if projectID != "" {
		entityType = "project"
		entityID = projectID
	} else if goalID != "" {
		entityType = "goal"
		entityID = goalID
	} else if taskID != "" {
		entityType = "task"
		entityID = taskID
	}
	_, _ = pool.Exec(ctx, `
		INSERT INTO activity_events (user_id, event_type, entity_type, entity_id, created_at)
		VALUES ($1, 'timer_logged', $2, $3, NOW())`, userID, entityType, entityID)

	// Handle goal completion / hours accumulation
	if goalID != "" {
		_, _ = pool.Exec(ctx, `
			UPDATE goals SET completed_hours = completed_hours + $2, last_logged_at = NOW(), updated_at = NOW()
			WHERE id = $1 AND (user_id = $3 OR user_id = 'dev_user')`, goalID, float64(durationSec)/3600.0, userID)
		if completed {
			dateStr := time.Now().Format("2006-01-02")
			_, _ = pool.Exec(ctx, `
				UPDATE goals 
				SET streak_days = streak_days + 1,
				    status = 'completed',
				    completed_dates = array_to_json(array_append(ARRAY(SELECT json_array_elements_text(COALESCE(NULLIF(completed_dates::text, ''), '[]')::json)), $2))
				WHERE id = $1 AND (user_id = $3 OR user_id = 'dev_user')`, goalID, dateStr, userID)
		}
	}

	// Handle task completion / actual minutes
	if taskID != "" {
		actMin := int(durationSec / 60)
		if actMin < 1 {
			actMin = 1
		}
		if completed {
			_, _ = pool.Exec(ctx, `
				UPDATE tasks 
				SET status = 'done', completed_at = NOW(), timer_running = false,
				    actual_minutes = COALESCE(actual_minutes, 0) + $2, updated_at = NOW()
				WHERE id = $1 AND (user_id = $3 OR user_id = 'dev_user')`, taskID, actMin, userID)
		} else {
			_, _ = pool.Exec(ctx, `
				UPDATE tasks 
				SET actual_minutes = COALESCE(actual_minutes, 0) + $2, updated_at = NOW()
				WHERE id = $1 AND (user_id = $3 OR user_id = 'dev_user')`, taskID, actMin, userID)
		}
	}

	return map[string]interface{}{"success": true}, nil
}

func GetTimerStats(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if u := auth.UserIDFromContext(ctx); u != "" && u != "dev_user_local_only" {
		userID = u
	}
	if pool == nil {
		return map[string]interface{}{
			"todayFocusSeconds":  0,
			"todayBreakSeconds":  0,
			"weekFocusSeconds":   0,
			"todaySessionsCount": 0,
			"streakDays":         0,
			"completedGoals":     0,
			"daysActive":         0,
		}, nil
	}

	var todayFocus, todayBreak, weekFocus, totalSessions int64
	var completedGoals, streakDays, visitsCount int64

	// 1. Focus vs Break seconds today
	_ = pool.QueryRow(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN session_type NOT IN ('break', 'short_break', 'long_break') THEN duration_seconds ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN session_type IN ('break', 'short_break', 'long_break') THEN duration_seconds ELSE 0 END), 0),
			COALESCE(COUNT(*), 0)
		FROM timer_sessions 
		WHERE (user_id = $1 OR user_id = 'dev_user' OR user_id = 'dev_user_local_only' OR $1 = 'dev_user')
		  AND started_at >= date_trunc('day', NOW())`, userID).Scan(&todayFocus, &todayBreak, &totalSessions)

	// 2. Week focus
	_ = pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(duration_seconds), 0)
		FROM timer_sessions 
		WHERE (user_id = $1 OR user_id = 'dev_user' OR user_id = 'dev_user_local_only' OR $1 = 'dev_user')
		  AND started_at >= date_trunc('week', NOW())
		  AND session_type NOT IN ('break', 'short_break', 'long_break')`, userID).Scan(&weekFocus)

	// 3. Completed goals & streak
	_ = pool.QueryRow(ctx, `
		SELECT 
			COALESCE(COUNT(CASE WHEN status = 'completed' THEN 1 END), 0),
			COALESCE(MAX(streak_days), 0)
		FROM goals 
		WHERE (user_id = $1 OR user_id = 'dev_user' OR $1 = 'dev_user')`, userID).Scan(&completedGoals, &streakDays)

	// 4. Visits / Activity count ("how often i come on")
	_ = pool.QueryRow(ctx, `
		SELECT COALESCE(COUNT(DISTINCT date_trunc('day', created_at)), 0)
		FROM activity_events 
		WHERE (user_id = $1 OR user_id = 'dev_user' OR $1 = 'dev_user')`, userID).Scan(&visitsCount)

	return map[string]interface{}{
		"todayFocusSeconds":  todayFocus,
		"todayBreakSeconds":  todayBreak,
		"weekFocusSeconds":   weekFocus,
		"todaySessionsCount": totalSessions,
		"streakDays":         streakDays,
		"completedGoals":     completedGoals,
		"daysActive":         visitsCount,
	}, nil
}

func GetTimerRecentSessions(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if u := auth.UserIDFromContext(ctx); u != "" && u != "dev_user_local_only" {
		userID = u
	}
	if pool == nil {
		return []map[string]interface{}{}, nil
	}

	limit := 25
	rows, err := pool.Query(ctx, `
		SELECT s.id, s.duration_seconds, COALESCE(s.session_type, 'focus'), 
		       COALESCE(s.title, ''), COALESCE(s.notes, ''), s.started_at,
		       COALESCE(p.id, ''), COALESCE(p.name, ''), COALESCE(p.color, '#a9927d'),
		       COALESCE(t.id, ''), COALESCE(t.title, ''),
		       COALESCE(g.id, ''), COALESCE(g.title, '')
		FROM timer_sessions s
		LEFT JOIN projects p ON s.project_id = p.id
		LEFT JOIN tasks t ON s.task_id = t.id
		LEFT JOIN goals g ON s.goal_id = g.id
		WHERE (s.user_id = $1 OR s.user_id = 'dev_user' OR s.user_id = 'dev_user_local_only' OR $1 = 'dev_user')
		ORDER BY s.started_at DESC
		LIMIT $2`, userID, limit)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	defer rows.Close()

	var sessions []map[string]interface{}
	for rows.Next() {
		var id, sessionType, title, notes, projID, projName, projColor, taskID, taskTitle, goalID, goalTitle string
		var durationSec int
		var startedAt time.Time

		if err := rows.Scan(&id, &durationSec, &sessionType, &title, &notes, &startedAt,
			&projID, &projName, &projColor, &taskID, &taskTitle, &goalID, &goalTitle); err == nil {
			sessions = append(sessions, map[string]interface{}{
				"id":              id,
				"durationSeconds": durationSec,
				"sessionType":     sessionType,
				"title":           title,
				"notes":           notes,
				"startedAt":       startedAt.Format(time.RFC3339),
				"projectId":       projID,
				"projectName":     projName,
				"projectColor":    projColor,
				"taskId":          taskID,
				"taskTitle":       taskTitle,
				"goalId":          goalID,
				"goalTitle":       goalTitle,
			})
		}
	}
	if sessions == nil {
		sessions = []map[string]interface{}{}
	}
	return sessions, nil
}

func LogActivityVisit(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if u := auth.UserIDFromContext(ctx); u != "" && u != "dev_user_local_only" {
		userID = u
	}
	if pool == nil {
		return map[string]interface{}{"success": true}, nil
	}
	page, _ := input["page"].(string)
	if page == "" {
		page = "dashboard"
	}
	_, _ = pool.Exec(ctx, `
		INSERT INTO activity_events (user_id, event_type, entity_type, entity_id, created_at)
		VALUES ($1, 'user_visit', 'page', $2, NOW())`, userID, page)
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
