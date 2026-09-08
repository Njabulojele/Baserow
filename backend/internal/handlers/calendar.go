package handlers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"anchor-backend/internal/auth"
	"github.com/jackc/pgx/v5/pgxpool"
)

func resolveUserID(ctx context.Context, pool *pgxpool.Pool, userID string) string {
	candidate := auth.UserIDFromContext(ctx)
	if candidate == "" || candidate == "dev_user_local_only" || candidate == "dev_user" {
		candidate = userID
	}
	if pool != nil {
		if candidate != "" && candidate != "dev_user_local_only" && candidate != "dev_user" {
			var exists bool
			_ = pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM "User" WHERE id = $1)`, candidate).Scan(&exists)
			if exists {
				return candidate
			}
		}
		var firstID string
		if err := pool.QueryRow(ctx, `SELECT id FROM "User" WHERE id != 'dev_user' AND id != 'dev_user_local_only' ORDER BY "createdAt" DESC LIMIT 1`).Scan(&firstID); err == nil && firstID != "" {
			return firstID
		}
	}
	if candidate != "" {
		return candidate
	}
	return "dev_user"
}

/**
 * GetCalendarEvents returns all tasks, calendar events (with recurrence), and goals.
 */
func GetCalendarEvents(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = resolveUserID(ctx, pool, userID)
	if pool == nil {
		return []map[string]interface{}{}, nil
	}

	var events []map[string]interface{}

	// 1. Fetch from "CalendarEvent" table (supports isRecurring and recurrenceRule)
	calRows, err := pool.Query(ctx, `
		SELECT id, title, COALESCE(description, ''), "startTime", "endTime",
		       COALESCE("allDay", false), COALESCE("isRecurring", false),
		       COALESCE("recurrenceRule", ''), COALESCE(type, 'event'),
		       COALESCE(location, ''), COALESCE(color, '#3b82f6')
		FROM "CalendarEvent"
		WHERE ("userId" = $1 OR "userId" = 'dev_user' OR "userId" = 'dev_user_local_only' OR $1 = 'dev_user' OR $1 = 'dev_user_local_only')
		ORDER BY "startTime" ASC`, userID)
	if err == nil {
		defer calRows.Close()
		for calRows.Next() {
			var id, title, desc, evType, loc, col string
			var startTime, endTime time.Time
			var allDay, isRecurring bool
			var recurrenceRule string

			if err := calRows.Scan(&id, &title, &desc, &startTime, &endTime, &allDay, &isRecurring, &recurrenceRule, &evType, &loc, &col); err == nil {
				ev := map[string]interface{}{
					"id":             id,
					"title":          title,
					"description":    desc,
					"start":          startTime.Format(time.RFC3339),
					"end":            endTime.Format(time.RFC3339),
					"allDay":         allDay,
					"type":           evType,
					"status":         "scheduled",
					"priority":       "medium",
					"color":          col,
					"location":       loc,
					"isRecurring":    isRecurring,
					"recurrenceRule": recurrenceRule,
					"draggable":      true,
					"resizable":      true,
				}
				if isRecurring && recurrenceRule != "" {
					ev["rrule"] = recurrenceRule
				}
				events = append(events, ev)
			}
		}
	}

	// 2. Fetch Tasks from "tasks" table
	taskRows, err := pool.Query(ctx, `
		SELECT t.id, t.title, COALESCE(t.description, ''), t.status, t.priority,
		       COALESCE(t.due_date, t.scheduled_date, t.created_at) as start_time,
		       COALESCE(t.estimated_minutes, 30) as duration_min,
		       p.id as project_id, p.name as project_name, COALESCE(p.color, '#a9927d') as project_color
		FROM tasks t
		LEFT JOIN projects p ON t.project_id = p.id
		WHERE t.user_id = $1 AND t.deleted_at IS NULL
		ORDER BY start_time ASC`, userID)
	if err == nil {
		defer taskRows.Close()
		for taskRows.Next() {
			var id, title, desc, status, priority string
			var startTime time.Time
			var durationMin int
			var projID, projName, projColor *string

			if err := taskRows.Scan(&id, &title, &desc, &status, &priority, &startTime, &durationMin, &projID, &projName, &projColor); err == nil {
				endTime := startTime.Add(time.Duration(durationMin) * time.Minute)
				color := "#a9927d"
				if projColor != nil && *projColor != "" {
					color = *projColor
				}

				pId := ""
				if projID != nil {
					pId = *projID
				}

				events = append(events, map[string]interface{}{
					"id":          id,
					"title":       title,
					"description": desc,
					"start":       startTime.Format(time.RFC3339),
					"end":         endTime.Format(time.RFC3339),
					"type":        "task",
					"status":      status,
					"priority":    priority,
					"color":       color,
					"projectId":   pId,
					"draggable":   true,
					"resizable":   true,
				})
			}
		}
	}

	// 3. Fetch Goals from "goals" table
	goalRows, err := pool.Query(ctx, `
		SELECT id, title, COALESCE(category, 'Goal') as cat, status, streak_days,
		       COALESCE(last_logged_at, created_at) as start_time
		FROM goals
		WHERE user_id = $1
		ORDER BY start_time ASC`, userID)
	if err == nil {
		defer goalRows.Close()
		for goalRows.Next() {
			var id, title, cat, status string
			var streakDays int
			var startTime time.Time

			if err := goalRows.Scan(&id, &title, &cat, &status, &streakDays, &startTime); err == nil {
				endTime := startTime.Add(45 * time.Minute)
				events = append(events, map[string]interface{}{
					"id":          id,
					"title":       "🎯 " + title,
					"description": cat + fmt.Sprintf(" (Streak: %dd)", streakDays),
					"start":       startTime.Format(time.RFC3339),
					"end":         endTime.Format(time.RFC3339),
					"type":        "event",
					"status":      status,
					"priority":    "high",
					"color":       "#f59e0b",
					"projectId":   nil,
					"draggable":   false,
					"resizable":   false,
				})
			}
		}
	}

	if events == nil {
		events = []map[string]interface{}{}
	}
	return events, nil
}

/**
 * CreateCalendarEvent inserts a new event into "CalendarEvent" or "tasks".
 */
func CreateCalendarEvent(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = resolveUserID(ctx, pool, userID)
	if pool == nil {
		return nil, fmt.Errorf("database pool unavailable")
	}

	title, _ := input["title"].(string)
	if title == "" {
		return nil, fmt.Errorf("title is required")
	}

	evType, _ := input["type"].(string)
	if evType == "" {
		evType = "event"
	}

	desc, _ := input["description"].(string)
	loc, _ := input["location"].(string)
	color, _ := input["color"].(string)
	if color == "" {
		if evType == "task" {
			color = "#a9927d"
		} else {
			color = "#3b82f6"
		}
	}

	timezone, _ := input["timezone"].(string)
	if timezone == "" {
		timezone = "Africa/Johannesburg"
	}

	allDay, _ := input["allDay"].(bool)
	isRecurring, _ := input["isRecurring"].(bool)
	recurrenceRule, _ := input["recurrenceRule"].(string)

	var startTime time.Time
	if sStr, ok := input["start"].(string); ok && sStr != "" {
		t, err := time.Parse(time.RFC3339, sStr)
		if err == nil {
			startTime = t
		}
	}
	if startTime.IsZero() {
		startTime = time.Now()
	}

	var endTime time.Time
	if eStr, ok := input["end"].(string); ok && eStr != "" {
		t, err := time.Parse(time.RFC3339, eStr)
		if err == nil {
			endTime = t
		}
	}
	if endTime.IsZero() {
		endTime = startTime.Add(60 * time.Minute)
	}

	// If type is "task" and NOT recurring, also insert or mirror into "tasks"
	if evType == "task" && !isRecurring {
		priority, _ := input["priority"].(string)
		if priority == "" {
			priority = "medium"
		}
		durationMin := int(endTime.Sub(startTime).Minutes())
		if durationMin <= 0 {
			durationMin = 30
		}

		var taskID string
		err := pool.QueryRow(ctx, `
			INSERT INTO tasks (id, user_id, title, description, status, priority, scheduled_date, due_date, estimated_minutes, created_at, updated_at)
			VALUES (gen_random_uuid()::text, $1, $2, $3, 'todo', $4, $5, $5, $6, NOW(), NOW())
			RETURNING id`, userID, title, desc, priority, startTime, durationMin).Scan(&taskID)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{"id": taskID, "type": "task", "success": true}, nil
	}

	// Insert into "CalendarEvent" table
	var newID string
	err := pool.QueryRow(ctx, `
		INSERT INTO "CalendarEvent" (id, "userId", title, description, "startTime", "endTime", "allDay", timezone, "isRecurring", "recurrenceRule", type, location, color, "createdAt", "updatedAt")
		VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
		RETURNING id`, userID, title, desc, startTime, endTime, allDay, timezone, isRecurring, recurrenceRule, evType, loc, color).Scan(&newID)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{"id": newID, "type": evType, "success": true}, nil
}

/**
 * UpdateCalendarEvent updates start/end time, recurrence, or title of an event.
 */
func UpdateCalendarEvent(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = resolveUserID(ctx, pool, userID)
	if pool == nil {
		return nil, fmt.Errorf("database pool unavailable")
	}

	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}

	var startTime, endTime *time.Time
	if sStr, ok := input["start"].(string); ok && sStr != "" {
		if t, err := time.Parse(time.RFC3339, sStr); err == nil {
			startTime = &t
		}
	}
	if eStr, ok := input["end"].(string); ok && eStr != "" {
		if t, err := time.Parse(time.RFC3339, eStr); err == nil {
			endTime = &t
		}
	}

	title, _ := input["title"].(string)
	recurrenceRule, _ := input["recurrenceRule"].(string)

	// 1. Try updating "CalendarEvent"
	res, err := pool.Exec(ctx, `
		UPDATE "CalendarEvent"
		SET title = COALESCE(NULLIF($3, ''), title),
		    "startTime" = COALESCE($4, "startTime"),
		    "endTime" = COALESCE($5, "endTime"),
		    "recurrenceRule" = CASE WHEN $6 != '' THEN $6 ELSE "recurrenceRule" END,
		    "updatedAt" = NOW()
		WHERE id = $1 AND "userId" = $2`, id, userID, title, startTime, endTime, recurrenceRule)
	if err == nil && res.RowsAffected() > 0 {
		return map[string]interface{}{"success": true}, nil
	}

	// 2. Try updating "tasks"
	if startTime != nil {
		durationMin := 30
		if endTime != nil {
			d := int(endTime.Sub(*startTime).Minutes())
			if d > 0 {
				durationMin = d
			}
		}
		_, _ = pool.Exec(ctx, `
			UPDATE tasks
			SET scheduled_date = $3,
			    estimated_minutes = $4,
			    title = COALESCE(NULLIF($5, ''), title),
			    updated_at = NOW()
			WHERE id = $1 AND user_id = $2`, id, userID, *startTime, durationMin, title)
	}

	return map[string]interface{}{"success": true}, nil
}

/**
 * DeleteCalendarEvent removes the event from CalendarEvent or marks deleted in tasks.
 * Supports recurring event deletion:
 * - scope="this": appends EXDATE to the recurrenceRule to omit only the clicked occurrence date.
 * - scope="all": deletes the entire master recurring event record.
 */
func DeleteCalendarEvent(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return nil, fmt.Errorf("database pool unavailable")
	}

	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}

	scope, _ := input["scope"].(string)
	if scope == "" {
		scope = "all"
	}

	occurrenceDateStr, _ := input["occurrenceDate"].(string)

	// If deleting only this occurrence of a recurring event
	if scope == "this" && occurrenceDateStr != "" {
		var occDate time.Time
		if t, err := time.Parse(time.RFC3339, occurrenceDateStr); err == nil {
			occDate = t
		} else if t, err := time.Parse("2006-01-02T15:04:05Z07:00", occurrenceDateStr); err == nil {
			occDate = t
		} else if t, err := time.Parse("2006-01-02", occurrenceDateStr); err == nil {
			occDate = t
		}

		if !occDate.IsZero() {
			var recRule string
			err := pool.QueryRow(ctx, `SELECT COALESCE("recurrenceRule", '') FROM "CalendarEvent" WHERE id = $1`, id).Scan(&recRule)
			if err == nil && recRule != "" {
				utcDate := occDate.UTC()
				exdateStr := fmt.Sprintf("%04d%02d%02dT%02d%02d%02dZ",
					utcDate.Year(), utcDate.Month(), utcDate.Day(),
					utcDate.Hour(), utcDate.Minute(), utcDate.Second())

				var updatedRule string
				if strings.Contains(recRule, "EXDATE:") {
					// Append to existing EXDATE line
					lines := strings.Split(recRule, "\n")
					found := false
					for i, l := range lines {
						if strings.HasPrefix(strings.TrimSpace(l), "EXDATE:") {
							lines[i] = strings.TrimSpace(l) + "," + exdateStr
							found = true
							break
						}
					}
					if !found {
						lines = append(lines, "EXDATE:"+exdateStr)
					}
					updatedRule = strings.Join(lines, "\n")
				} else {
					updatedRule = recRule + "\nEXDATE:" + exdateStr
				}

				_, _ = pool.Exec(ctx, `
					UPDATE "CalendarEvent" 
					SET "recurrenceRule" = $2, "updatedAt" = NOW() 
					WHERE id = $1`, id, updatedRule)

				return map[string]interface{}{"success": true, "scope": "this"}, nil
			}
		}
	}

	// Default: "all" — Delete completely from "CalendarEvent" and "tasks"
	_, _ = pool.Exec(ctx, `DELETE FROM "CalendarEvent" WHERE id = $1`, id)
	_, _ = pool.Exec(ctx, `UPDATE tasks SET deleted_at = NOW() WHERE id = $1`, id)

	return map[string]interface{}{"success": true, "scope": "all"}, nil
}
