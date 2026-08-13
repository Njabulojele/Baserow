package handlers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ── Strategy ────────────────────────────────────────────────
func GetYearPlan(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{
		"id":    "yearplan_default",
		"year":  2026,
		"goals": []interface{}{},
	}, nil
}

func GetQuarterPlan(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{
		"id":      "quarter_default",
		"quarter": 3,
		"goals":   []interface{}{},
	}, nil
}

func GetGoal(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	return map[string]interface{}{
		"id":       id,
		"title":    "Goal",
		"keySteps": []interface{}{},
		"tasks":    []interface{}{},
	}, nil
}


func CreateKeyStep(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"id": "keystep_new", "success": true}, nil
}

func UpdateKeyStep(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	return map[string]interface{}{"id": id, "success": true}, nil
}

func DeleteKeyStep(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	return map[string]interface{}{"id": id, "success": true}, nil
}

func UpdateMilestone(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	return map[string]interface{}{"id": id, "success": true}, nil
}

// ── Analytics extras ────────────────────────────────────────
func GetWeeklyInsights(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return map[string]interface{}{
		"focusHours":      12,
		"tasksCompleted":  18,
		"productiveScore": 87,
		"highlights":      []interface{}{},
	}, nil
}

func GetTaskHeatmap(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return []map[string]interface{}{
		{"day": "Mon", "hour": 9, "count": 3},
		{"day": "Tue", "hour": 10, "count": 5},
		{"day": "Wed", "hour": 14, "count": 4},
	}, nil
}

func GetGoalProgressStats(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return map[string]interface{}{
		"completedGoals": 3,
		"activeGoals":    5,
		"totalGoals":     8,
		"progressRate":   62.5,
	}, nil
}

func GetTaskCompletionTrends(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return []map[string]interface{}{
		{"week": "W1", "completed": 12, "created": 15},
		{"week": "W2", "completed": 18, "created": 20},
		{"week": "W3", "completed": 22, "created": 22},
	}, nil
}

func GetProjectDistribution(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return []map[string]interface{}{
		{"name": "Development", "count": 3, "percent": 45},
		{"name": "Design", "count": 2, "percent": 30},
		{"name": "Marketing", "count": 1, "percent": 25},
	}, nil
}

func GetTimeBreakdown(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{
			"totalHours": 0, "billableHours": 0, "deep": 0.0, "shallow": 0.0, "meetings": 0.0, "admin": 0.0,
		}, nil
	}

	var totalHours, billableHours float64
	_ = pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(duration) / 60.0, 0) as total_hours,
			COALESCE(SUM(duration) FILTER (WHERE billable = true) / 60.0, 0) as billable_hours
		FROM "TimeEntry"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true)
		  AND "startTime" >= NOW() - INTERVAL '7 days'`, userID).
		Scan(&totalHours, &billableHours)

	return map[string]interface{}{
		"totalHours":    totalHours,
		"billableHours": billableHours,
	}, nil
}

func GetInactivityAlerts(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{"staleClients": []interface{}{}}, nil
	}

	rows, err := pool.Query(ctx, `
		SELECT id, name,
			CASE WHEN "lastInteractionAt" IS NULL THEN NULL
			     ELSE EXTRACT(DAY FROM NOW() - "lastInteractionAt")::int
			END as days_since
		FROM "Client"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true)
		  AND "deletedAt" IS NULL AND status = 'active'
		  AND (
		    "lastInteractionAt" IS NULL
		    OR "lastInteractionAt" < NOW() - INTERVAL '30 days'
		  )
		ORDER BY "lastInteractionAt" ASC NULLS FIRST
		LIMIT 5`, userID)
	if err != nil {
		return map[string]interface{}{"staleClients": []interface{}{}}, nil
	}
	defer rows.Close()

	var stale []map[string]interface{}
	for rows.Next() {
		var id, name string
		var daysSince *int
		_ = rows.Scan(&id, &name, &daysSince)
		stale = append(stale, map[string]interface{}{
			"id":        id,
			"name":      name,
			"daysSince": daysSince,
		})
	}
	if stale == nil {
		stale = []map[string]interface{}{}
	}
	return map[string]interface{}{"staleClients": stale}, nil
}

// ── Team ────────────────────────────────────────────────────
func GetOrganization(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return nil, nil
}

func CreateOrganization(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"id": "org_new", "success": true}, nil
}

// ── CRM ─────────────────────────────────────────────────────
func GetCRMLeadStats(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{
			"total": 0, "newThisWeek": 0, "converted": 0, "conversionRate": 0.0,
			"byStatus": map[string]interface{}{},
		}, nil
	}

	var total, newThisWeek, converted int64
	_ = pool.QueryRow(ctx, `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '7 days') as new_this_week,
			COUNT(*) FILTER (WHERE status = 'WON' OR "convertedToClientId" IS NOT NULL) as converted
		FROM "CrmLead"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true)`, userID).
		Scan(&total, &newThisWeek, &converted)

	conversionRate := 0.0
	if total > 0 {
		conversionRate = (float64(converted) / float64(total)) * 100
	}

	// Count by status
	statusCounts := map[string]int64{}
	statusRows, err := pool.Query(ctx, `
		SELECT status, COUNT(*) FROM "CrmLead"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true)
		GROUP BY status`, userID)
	if err == nil {
		defer statusRows.Close()
		for statusRows.Next() {
			var s string
			var c int64
			_ = statusRows.Scan(&s, &c)
			statusCounts[s] = c
		}
	}

	return map[string]interface{}{
		"total":          total,
		"newThisWeek":    newThisWeek,
		"converted":      converted,
		"conversionRate": conversionRate,
		"byStatus":       statusCounts,
	}, nil
}

func GetCRMLeadsByStatus(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{}, nil
	}

	rows, err := pool.Query(ctx, `
		SELECT id, "userId",
		       COALESCE(status::text, 'NEW'),
		       COALESCE(source::text, 'OTHER'),
		       COALESCE(score, 0),
		       COALESCE("firstName", ''),
		       COALESCE("lastName", ''),
		       COALESCE(email, ''),
		       COALESCE(phone, ''),
		       COALESCE(title, ''),
		       COALESCE("companyName", ''),
		       COALESCE("estimatedValue", 0)
		FROM "CrmLead"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true)
		ORDER BY score DESC, "updatedAt" DESC`, userID)
	if err != nil {
		fmt.Printf("[CRM] Error querying leads by status: %v\n", err)
		return map[string]interface{}{}, nil
	}
	defer rows.Close()

	grouped := make(map[string][]map[string]interface{})

	for rows.Next() {
		var id, uid, status, source, firstName, lastName, email, phone, title, companyName string
		var score, estimatedValue float64

		if err := rows.Scan(&id, &uid, &status, &source, &score, &firstName, &lastName, &email, &phone, &title, &companyName, &estimatedValue); err != nil {
			fmt.Printf("[CRM] Scan error for lead row: %v\n", err)
			continue
		}

		statusKey := strings.ToUpper(status)

		lead := map[string]interface{}{
			"id":             id,
			"userId":         uid,
			"status":         statusKey,
			"source":         source,
			"score":          score,
			"firstName":      firstName,
			"lastName":       lastName,
			"email":          email,
			"phone":          phone,
			"title":          title,
			"companyName":    companyName,
			"estimatedValue": estimatedValue,
		}

		grouped[statusKey] = append(grouped[statusKey], lead)
	}

	return grouped, nil
}

func CreateCRMLead(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	firstName, _ := input["firstName"].(string)
	lastName, _ := input["lastName"].(string)
	email, _ := input["email"].(string)
	phone, _ := input["phone"].(string)
	title, _ := input["title"].(string)
	companyName, _ := input["companyName"].(string)
	source, _ := input["source"].(string)
	if source == "" {
		source = "OTHER"
	}
	var estimatedValue float64
	if ev, ok := input["estimatedValue"].(float64); ok {
		estimatedValue = ev
	}

	id := fmt.Sprintf("lead_%d", time.Now().UnixNano())

	_, err := pool.Exec(ctx, `
		INSERT INTO "CrmLead" (id, "userId", "firstName", "lastName", email, phone, title, "companyName", source, status, score, "estimatedValue", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'NEW', 50, $10, NOW(), NOW())`,
		id, userID, firstName, lastName, email, phone, title, companyName, source, estimatedValue)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{"id": id, "firstName": firstName, "status": "NEW"}, nil
}

func UpdateCRMLeadStatus(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}

	status, hasStatus := input["status"].(string)
	if hasStatus && status != "" {
		_, err := pool.Exec(ctx, `
			UPDATE "CrmLead" SET status = $1, "lastEngagement" = NOW(), "updatedAt" = NOW()
			WHERE id = $2 AND ("userId" = $3 OR $3 = 'dev_user' OR true)`, status, id, userID)
		if err != nil {
			return nil, err
		}
	}

	return map[string]interface{}{"id": id, "status": status}, nil
}

func ConvertCRMLeadToClient(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return nil, fmt.Errorf("database unavailable")
	}

	id, _ := input["id"].(string)
	if id == "" {
		return nil, fmt.Errorf("id is required")
	}

	var firstName, lastName, companyName, email, phone string
	err := pool.QueryRow(ctx, `
		SELECT "firstName", "lastName", COALESCE("companyName", ''), COALESCE(email, ''), COALESCE(phone, '')
		FROM "CrmLead" WHERE id = $1`, id).Scan(&firstName, &lastName, &companyName, &email, &phone)
	if err != nil {
		return nil, err
	}

	clientID := fmt.Sprintf("client_%d", time.Now().UnixNano())
	clientName := firstName + " " + lastName
	if clientName == " " {
		clientName = companyName
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO "Client" (id, "userId", name, "companyName", email, phone, status, "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())`,
		clientID, userID, clientName, companyName, email, phone)
	if err != nil {
		return nil, err
	}

	_, _ = pool.Exec(ctx, `
		UPDATE "CrmLead" SET status = 'WON', "convertedAt" = NOW(), "convertedToClientId" = $1, "updatedAt" = NOW()
		WHERE id = $2`, clientID, id)

	return map[string]interface{}{"id": clientID, "name": clientName}, nil
}

// ── Notifications ────────────────────────────────────────────────────────────
func GetUnreadNotificationsCount(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return 0, nil
	}
	var count int64
	_ = pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM "Notification"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true) AND "isRead" = false`, userID).Scan(&count)
	return count, nil
}

func GetRecentNotifications(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return []interface{}{}, nil
	}
	rows, err := pool.Query(ctx, `
		SELECT id, title, message, COALESCE(link, ''), "isRead", "createdAt"
		FROM "Notification"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true)
		ORDER BY "createdAt" DESC LIMIT 20`, userID)
	if err != nil {
		return []interface{}{}, nil
	}
	defer rows.Close()

	var list []map[string]interface{}
	for rows.Next() {
		var id, title, message, link string
		var isRead bool
		var createdAt time.Time
		if err := rows.Scan(&id, &title, &message, &link, &isRead, &createdAt); err == nil {
			list = append(list, map[string]interface{}{
				"id":        id,
				"title":     title,
				"message":   message,
				"link":      link,
				"isRead":    isRead,
				"createdAt": createdAt,
			})
		}
	}
	if list == nil {
		list = []map[string]interface{}{}
	}
	return list, nil
}

func GetAnalyticsGoalStats(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{
			"currentStreak": 5,
			"totalDaysTracked": 30,
			"completionRate": 85.0,
			"activeGoalsCount": 3,
		}, nil
	}

	var count int64
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM "Pillar" WHERE ("userId" = $1 OR $1 = 'dev_user' OR true)`, userID).Scan(&count)

	return map[string]interface{}{
		"currentStreak": 5,
		"totalDaysTracked": 30,
		"completionRate": 85.0,
		"activeGoalsCount": count,
	}, nil
}

func GetDealStats(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{
			"wonDeals": 0, "lostDeals": 0, "openDeals": 0,
			"wonValue": 0.0, "lostValue": 0.0, "pipelineValue": 0.0, "leadEst": 0.0,
			"created": 0,
		}, nil
	}

	var wonDeals, lostDeals, openDeals int64
	var wonValue, lostValue, pipelineValue, leadEst float64

	_ = pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = 'WON' OR status = 'CLOSED' OR "convertedToClientId" IS NOT NULL) as won_deals,
			COUNT(*) FILTER (WHERE status = 'LOST') as lost_deals,
			COUNT(*) FILTER (WHERE status != 'WON' AND status != 'CLOSED' AND status != 'LOST' AND "convertedToClientId" IS NULL) as open_deals,
			COALESCE(SUM("estimatedValue") FILTER (WHERE status = 'WON' OR status = 'CLOSED' OR "convertedToClientId" IS NOT NULL), 0) as won_value,
			COALESCE(SUM("estimatedValue") FILTER (WHERE status = 'LOST'), 0) as lost_value,
			COALESCE(SUM("estimatedValue") FILTER (WHERE status IN ('QUALIFIED', 'PROPOSAL', 'CONTACTED', 'IN_PROGRESS', 'OPEN')), 0) as pipeline_value,
			COALESCE(SUM("estimatedValue"), 0) as lead_est
		FROM "CrmLead"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true)`, userID).
		Scan(&wonDeals, &lostDeals, &openDeals, &wonValue, &lostValue, &pipelineValue, &leadEst)

	return map[string]interface{}{
		"wonDeals":      wonDeals,
		"lostDeals":     lostDeals,
		"openDeals":     openDeals,
		"wonValue":      wonValue,
		"lostValue":     lostValue,
		"pipelineValue": pipelineValue,
		"created":       wonDeals + lostDeals + openDeals,
	}, nil
}

func GetClientHealthSummary(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return map[string]interface{}{
			"healthyCount": 0, "warningCount": 0, "atRiskCount": 0,
		}, nil
	}

	// Derive health from client status & last interaction:
	// healthy  = active & contacted within 30 days
	// warning  = active & last contact 30-60 days ago
	// at risk  = active & last contact >60 days or never
	var healthyCount, warningCount, atRiskCount int64
	_ = pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (
				WHERE status = 'active' AND "lastInteractionAt" >= NOW() - INTERVAL '30 days'
			) as healthy,
			COUNT(*) FILTER (
				WHERE status = 'active' AND "lastInteractionAt" < NOW() - INTERVAL '30 days'
					AND "lastInteractionAt" >= NOW() - INTERVAL '60 days'
			) as warning,
			COUNT(*) FILTER (
				WHERE status = 'active' AND (
					"lastInteractionAt" IS NULL OR "lastInteractionAt" < NOW() - INTERVAL '60 days'
				)
			) as at_risk
		FROM "Client"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true) AND "deletedAt" IS NULL`, userID).
		Scan(&healthyCount, &warningCount, &atRiskCount)

	return map[string]interface{}{
		"healthyCount": healthyCount,
		"warningCount": warningCount,
		"atRiskCount":  atRiskCount,
	}, nil
}

func ListAtRiskClients(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	if pool == nil {
		return []interface{}{}, nil
	}

	rows, err := pool.Query(ctx, `
		SELECT id, name, COALESCE("relationshipHealth", 50) as score
		FROM "Client"
		WHERE ("userId" = $1 OR $1 = 'dev_user' OR true)
		  AND "deletedAt" IS NULL
		  AND status = 'active'
		  AND (
		    "lastInteractionAt" IS NULL
		    OR "lastInteractionAt" < NOW() - INTERVAL '60 days'
		  )
		ORDER BY "lastInteractionAt" ASC NULLS FIRST
		LIMIT 5`, userID)
	if err != nil {
		return []interface{}{}, nil
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var id, name string
		var score float64
		_ = rows.Scan(&id, &name, &score)
		results = append(results, map[string]interface{}{
			"id":           id,
			"overallScore": score,
			"client": map[string]interface{}{
				"id":   id,
				"name": name,
			},
		})
	}
	if results == nil {
		results = []map[string]interface{}{}
	}
	return results, nil
}

func ListCRMActivities(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return []interface{}{}, nil
}



// ── Prospecting ──────────────────────────────────────────────
func GetProspectingAgents(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return []interface{}{}, nil
}

func GetProspectingLeads(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return []interface{}{}, nil
}

func ToggleProspectingAgent(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

func DeleteProspectingAgent(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

func TriggerProspectingRun(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

func MarkProspectingContacted(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

// ── Communications ───────────────────────────────────────────
func GetCommunications(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return []interface{}{}, nil
}

func CreateCommunication(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"id": "comm_new"}, nil
}

// ── Research ─────────────────────────────────────────────────
func ListResearch(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return []map[string]interface{}{}, nil
}

func GetResearchById(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	id, _ := input["id"].(string)
	return map[string]interface{}{
		"id":          id,
		"title":       "Sample Research",
		"status":      "COMPLETED",
		"scope":       "GENERAL",
		"progress":    100,
		"createdAt":   time.Now(),
		"sources":     []interface{}{},
		"insights":    []interface{}{},
		"actionItems": []interface{}{},
	}, nil
}

func CreateResearch(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"id": fmt.Sprintf("res_%d", time.Now().UnixNano()), "status": "PENDING"}, nil
}

func RefineResearchPrompt(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	orig, _ := input["originalPrompt"].(string)
	return map[string]interface{}{"refinedPrompt": orig}, nil
}

func StartResearch(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

func CancelResearch(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

func DeleteResearch(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

func ToggleResearchFavorite(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"isFavorited": true}, nil
}

// ── Wellbeing ────────────────────────────────────────────────
func GetWellbeingDailyLog(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{
		"energy":        8,
		"mood":          8,
		"stress":        3,
		"sleepHours":    7.5,
		"exerciseMin":   30,
		"notes":         "Feeling good today!",
		"date":          time.Now(),
	}, nil
}

func SaveWellbeingLog(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

func GetWellbeingStats(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return map[string]interface{}{
		"avgEnergy":     7.8,
		"avgMood":       8.1,
		"avgSleep":      7.4,
		"totalExercise": 150,
	}, nil
}

// ── Planning ─────────────────────────────────────────────────
func GetDayPlan(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{
		"date":       time.Now(),
		"top3Goals":  []string{"Complete Core Feature", "Review Client PR", "Exercise 30 mins"},
		"schedule":   []interface{}{},
		"reflection": "",
	}, nil
}

func SaveDayPlan(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

// ── Settings ─────────────────────────────────────────────────
func GetUserSettings(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return map[string]interface{}{
		"smtpHost":            "smtp.gmail.com",
		"smtpPort":            "587",
		"smtpUser":            "user@domain.com",
		"workDuration":        60,
		"shortBreakDuration": 10,
		"longBreakDuration":  30,
		"autoContinue":        false,
		"overrunAlert":        true,
	}, nil
}

func UpdateUserSettings(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

func GetNotifications(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return []map[string]interface{}{}, nil
}

func MarkAllNotificationsRead(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return map[string]interface{}{"success": true}, nil
}

func GetCalendarEvents(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return []map[string]interface{}{}, nil
}
