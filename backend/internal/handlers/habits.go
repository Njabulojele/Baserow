package handlers

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func GetPillars(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return []map[string]interface{}{}, nil
	}

	query := `
		SELECT p.id, p.name, p.icon, p.color, p."dailyMinutes", p."order", p."isActive"
		FROM "Pillar" p WHERE (p."userId" = $1 OR p."userId" = 'dev_user' OR p."userId" IS NULL OR $1 = 'dev_user' OR true) AND p."isActive" = true
		ORDER BY p."order" ASC
	`
	rows, err := pool.Query(ctx, query, userID)
	if err != nil {
		return []interface{}{}, nil
	}
	defer rows.Close()

	var pillars []map[string]interface{}
	pillarMap := map[string]*map[string]interface{}{}

	for rows.Next() {
		var id, name, icon, color string
		var dailyMinutes, order int
		var isActive bool
		_ = rows.Scan(&id, &name, &icon, &color, &dailyMinutes, &order, &isActive)

		pObj := map[string]interface{}{
			"id":             id,
			"name":           name,
			"icon":           icon,
			"color":          color,
			"dailyMinutes":   dailyMinutes,
			"order":          order,
			"isActive":       isActive,
			"habitTemplates": []map[string]interface{}{},
		}
		pillars = append(pillars, pObj)
		pillarMap[id] = &pillars[len(pillars)-1]
	}

	// Single query to fetch all habit templates for active pillars
	htQuery := `
		SELECT id, "pillarId", title, description, "estimatedMinutes", platform, "platformIcon", recurrence 
		FROM "HabitTemplate" 
		WHERE "isActive" = true ORDER BY "order" ASC
	`
	htRows, htErr := pool.Query(ctx, htQuery)
	if htErr == nil {
		defer htRows.Close()
		for htRows.Next() {
			var htid, pillarID, title, recurrence string
			var desc, platform, platformIcon *string
			var estMin int
			_ = htRows.Scan(&htid, &pillarID, &title, &desc, &estMin, &platform, &platformIcon, &recurrence)

			if pRef, ok := pillarMap[pillarID]; ok {
				templates := (*pRef)["habitTemplates"].([]map[string]interface{})
				templates = append(templates, map[string]interface{}{
					"id": htid, "title": title, "description": desc, "estimatedMinutes": estMin, "platform": platform, "platformIcon": platformIcon, "recurrence": recurrence,
				})
				(*pRef)["habitTemplates"] = templates
			}
		}
	}

	if pillars == nil {
		pillars = []map[string]interface{}{}
	}
	return pillars, nil
}

func GetDailyChecklist(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	dateStr := time.Now().Format("2006-01-02")
	if d, ok := input["date"].(string); ok && d != "" {
		if t, err := time.Parse(time.RFC3339, d); err == nil {
			dateStr = t.Format("2006-01-02")
		} else if len(d) >= 10 {
			dateStr = d[:10]
		}
	}

	if pool == nil {
		return map[string]interface{}{
			"date":            dateStr,
			"pillars":         []interface{}{},
			"completedHabits": 0,
			"totalHabits":     0,
		}, nil
	}

	// Single query to fetch all logs for today
	logsMap := map[string]struct {
		completed   bool
		completedAt *time.Time
	}{}
	lRows, lErr := pool.Query(ctx, `SELECT "habitTemplateId", completed, "completedAt" FROM "HabitLog" WHERE date = $1::date`, dateStr)
	if lErr == nil {
		defer lRows.Close()
		for lRows.Next() {
			var htID string
			var isDone bool
			var doneAt *time.Time
			_ = lRows.Scan(&htID, &isDone, &doneAt)
			logsMap[htID] = struct {
				completed   bool
				completedAt *time.Time
			}{isDone, doneAt}
		}
	}

	// Get Pillars with templates
	pillars, _ := GetPillars(ctx, pool, userID)
	pList, _ := pillars.([]map[string]interface{})

	var formattedPillars []map[string]interface{}
	totalHabits := 0
	completedHabits := 0

	for _, p := range pList {
		pID := p["id"].(string)
		templates, _ := p["habitTemplates"].([]map[string]interface{})

		var items []map[string]interface{}
		pCompleted := 0

		for _, t := range templates {
			htID := t["id"].(string)
			totalHabits++

			logData := logsMap[htID]

			if logData.completed {
				pCompleted++
				completedHabits++
			}

			items = append(items, map[string]interface{}{
				"id": htID, "title": t["title"], "estimatedMinutes": t["estimatedMinutes"],
				"platform": t["platform"], "completed": logData.completed, "completedAt": logData.completedAt,
			})
		}

		formattedPillars = append(formattedPillars, map[string]interface{}{
			"id": pID, "name": p["name"], "icon": p["icon"], "color": p["color"],
			"habits": items, "completedHabits": pCompleted, "totalHabits": len(templates),
		})
	}

	return map[string]interface{}{
		"date":            dateStr,
		"pillars":         formattedPillars,
		"completedHabits": completedHabits,
		"totalHabits":     totalHabits,
	}, nil
}

func ToggleHabit(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	habitTemplateID, _ := input["habitTemplateId"].(string)
	dateStr := time.Now().Format("2006-01-02")
	if pool == nil {
		return map[string]interface{}{"completed": true}, nil
	}

	query := `
		INSERT INTO "HabitLog" (id, "userId", "habitTemplateId", date, completed, "completedAt")
		VALUES ($1, $2, $3, $4::date, true, NOW())
		ON CONFLICT ("habitTemplateId", date)
		DO UPDATE SET completed = NOT "HabitLog".completed, "completedAt" = NOW()
		RETURNING completed
	`
	id := fmt.Sprintf("hlog_%d", time.Now().UnixNano())
	var completed bool
	err := pool.QueryRow(ctx, query, id, userID, habitTemplateID, dateStr).Scan(&completed)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{"completed": completed}, nil
}
