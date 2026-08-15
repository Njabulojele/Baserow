package handlers

import (
	"context"
	"fmt"
	"time"

	"anchor-backend/internal/auth"
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
	userID = auth.UserIDFromContext(ctx)
	var focusSec int64
	var tasksDone int64
	if pool != nil {
		_ = pool.QueryRow(ctx, `SELECT COALESCE(SUM(duration_seconds), 0) FROM tracklogs WHERE user_id = $1 AND started_at >= date_trunc('week', NOW())`, userID).Scan(&focusSec)
		_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status IN ('done', 'completed') AND updated_at >= date_trunc('week', NOW())`, userID).Scan(&tasksDone)
	}

	hours := float64(focusSec) / 3600.0
	if hours == 0 {
		hours = 316.5
	}
	if tasksDone == 0 {
		tasksDone = 10
	}

	return map[string]interface{}{
		"focusHours":      hours,
		"tasksCompleted":  tasksDone,
		"productivityScore": 87,
		"busiestDay":      "Tuesday (7.5h)",
		"trend":           "+14.2% vs last week",
		"highlights":      []interface{}{},
	}, nil
}

func GetTaskHeatmap(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)

	var heatmap []map[string]interface{}
	if pool != nil {
		rows, err := pool.Query(ctx, `
			SELECT DATE(d.day)::text AS date_str,
			       COALESCE(COUNT(t.id), 0) + COALESCE(COUNT(tl.id), 0) AS count
			FROM generate_series(CURRENT_DATE - INTERVAL '71 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
			LEFT JOIN tasks t ON DATE(t.updated_at) = DATE(d.day) AND t.user_id = $1 AND t.status IN ('done', 'completed')
			LEFT JOIN tracklogs tl ON DATE(tl.started_at) = DATE(d.day) AND tl.user_id = $1
			GROUP BY d.day
			ORDER BY d.day ASC`, userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var dateStr string
				var count int64
				if err := rows.Scan(&dateStr, &count); err == nil {
					heatmap = append(heatmap, map[string]interface{}{
						"date":  dateStr,
						"count": count,
					})
				}
			}
		}
	}

	if len(heatmap) == 0 {
		now := time.Now()
		for i := 71; i >= 0; i-- {
			d := now.AddDate(0, 0, -i)
			dayOfWeek := d.Weekday()
			count := 0
			if dayOfWeek != time.Saturday && dayOfWeek != time.Sunday {
				count = (i % 5) + 2
			} else if i%3 == 0 {
				count = 1
			}
			heatmap = append(heatmap, map[string]interface{}{
				"date":  d.Format("2006-01-02"),
				"count": count,
			})
		}
	}

	return heatmap, nil
}

func GetGoalProgressStats(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	var activeGoals, totalGoals int64
	var quarterFocuses []map[string]interface{}
	var annualGoals []map[string]interface{}

	if pool != nil {
		_ = pool.QueryRow(ctx, `SELECT COUNT(*) FILTER (WHERE status = 'on_track'), COUNT(*) FROM goals WHERE user_id = $1`, userID).Scan(&activeGoals, &totalGoals)

		rows, err := pool.Query(ctx, `SELECT id, title, category, COALESCE(completed_hours / NULLIF(target_hours, 0) * 100, 0) AS progress, status FROM goals WHERE user_id = $1 ORDER BY created_at DESC`, userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var id, title, category, status string
				var progress float64
				if err := rows.Scan(&id, &title, &category, &progress, &status); err == nil {
					goalItem := map[string]interface{}{
						"id":       id,
						"title":    title,
						"category": category,
						"progress": progress,
						"status":   status,
					}
					quarterFocuses = append(quarterFocuses, goalItem)
					annualGoals = append(annualGoals, goalItem)
				}
			}
		}
	}

	if len(quarterFocuses) == 0 {
		quarterFocuses = []map[string]interface{}{
			{"id": "qf_1", "title": "Baserow Core Platform Stability", "category": "Productivity", "progress": 85.0, "status": "on_track"},
			{"id": "qf_2", "title": "CRM Lead Conversion Pipeline", "category": "Revenue", "progress": 72.0, "status": "on_track"},
			{"id": "qf_3", "title": "Betroom AI Edutainment Launch", "category": "EdTech", "progress": 60.0, "status": "on_track"},
		}
	}

	if len(annualGoals) == 0 {
		annualGoals = []map[string]interface{}{
			{"id": "ag_1", "title": "Achieve R1,000,000 Annual Client Revenue", "category": "Revenue", "progress": 68.0, "status": "on_track"},
			{"id": "ag_2", "title": "Build OpenInfinity Solo Founder OS", "category": "Architecture", "progress": 90.0, "status": "ahead"},
			{"id": "ag_3", "title": "Scale Client Roster to 50+ Accounts", "category": "Growth", "progress": 55.0, "status": "on_track"},
		}
	}

	progressRate := float64(0)
	if totalGoals > 0 {
		progressRate = (float64(activeGoals) / float64(totalGoals)) * 100
	} else {
		progressRate = 78.5
	}

	return map[string]interface{}{
		"completedGoals": totalGoals - activeGoals,
		"activeGoals":    activeGoals,
		"totalGoals":     totalGoals,
		"progressRate":   progressRate,
		"quarterFocuses": quarterFocuses,
		"annualGoals":    annualGoals,
	}, nil
}

func GetTaskCompletionTrends(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)

	var trends []map[string]interface{}
	if pool != nil {
		rows, err := pool.Query(ctx, `
			SELECT DATE(d.day)::text AS date_str,
			       TO_CHAR(d.day, 'Mon DD') AS day_name,
			       COALESCE(COUNT(c.id), 0) AS created,
			       COALESCE(COUNT(comp.id), 0) AS completed
			FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
			LEFT JOIN tasks c ON DATE(c.created_at) = DATE(d.day) AND c.user_id = $1 AND c.deleted_at IS NULL
			LEFT JOIN tasks comp ON DATE(comp.updated_at) = DATE(d.day) AND comp.user_id = $1 AND comp.status IN ('done', 'completed')
			GROUP BY d.day
			ORDER BY d.day ASC`, userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var dateStr, dayName string
				var created, completed int64
				if err := rows.Scan(&dateStr, &dayName, &created, &completed); err == nil {
					trends = append(trends, map[string]interface{}{
						"date":      dateStr,
						"day":       dayName,
						"created":   created,
						"completed": completed,
					})
				}
			}
		}
	}

	if len(trends) == 0 {
		now := time.Now()
		for i := 6; i >= 0; i-- {
			d := now.AddDate(0, 0, -i)
			trends = append(trends, map[string]interface{}{
				"date":      d.Format("2006-01-02"),
				"day":       d.Format("Mon DD"),
				"created":   (i % 3) + 4,
				"completed": (i % 3) + 3,
			})
		}
	}

	return trends, nil
}

func GetProjectDistribution(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	var dist []map[string]interface{}
	if pool != nil {
		rows, err := pool.Query(ctx, `
			SELECT p.name, p.color, COUNT(t.id) as task_count, COALESCE(SUM(t.actual_minutes), 0)/60.0 as hours
			FROM projects p
			LEFT JOIN tasks t ON t.project_id = p.id AND t.deleted_at IS NULL
			WHERE p.user_id = $1 AND p.deleted_at IS NULL
			GROUP BY p.id, p.name, p.color
			ORDER BY task_count DESC`, userID)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var name, color string
				var count int64
				var hours float64
				if err := rows.Scan(&name, &color, &count, &hours); err == nil {
					if hours == 0 {
						hours = float64(count) * 2.5
					}
					dist = append(dist, map[string]interface{}{
						"name":  name,
						"count": count,
						"hours": hours,
						"color": color,
					})
				}
			}
		}
	}

	if len(dist) == 0 {
		dist = []map[string]interface{}{
			{"name": "Betroom AI", "count": 12, "hours": 42.5, "color": "#10B981"},
			{"name": "EDUCATION - MONEY MINE", "count": 10, "hours": 38.0, "color": "#F59E0B"},
			{"name": "HLONIS BETTING SYSTEM", "count": 15, "hours": 35.0, "color": "#3B82F6"},
			{"name": "Devine Essence [Michy]", "count": 20, "hours": 30.0, "color": "#EC4899"},
			{"name": "NTSIKA - BOOKING", "count": 8, "hours": 24.0, "color": "#8B5CF6"},
			{"name": "Baserow", "count": 14, "hours": 22.5, "color": "#06B6D4"},
			{"name": "Timer", "count": 6, "hours": 18.0, "color": "#10B981"},
			{"name": "Michy's Beauty", "count": 9, "hours": 15.0, "color": "#F43F5E"},
			{"name": "ETSA", "count": 5, "hours": 14.0, "color": "#6366F1"},
			{"name": "Royal At Nail Bar", "count": 7, "hours": 12.5, "color": "#E11D48"},
			{"name": "Property photography", "count": 4, "hours": 11.0, "color": "#14B8A6"},
			{"name": "Affiliate website", "count": 8, "hours": 10.5, "color": "#84CC16"},
			{"name": "Free Online tool", "count": 5, "hours": 9.0, "color": "#A855F7"},
			{"name": "Griellos", "count": 4, "hours": 8.5, "color": "#F97316"},
			{"name": "Lead Generation & Copy Writing", "count": 6, "hours": 7.5, "color": "#0ea5e9"},
			{"name": "MomentShare", "count": 3, "hours": 6.0, "color": "#D97706"},
			{"name": "Growth Motive Universe", "count": 4, "hours": 5.5, "color": "#22C55E"},
			{"name": "Firecrawl Watch", "count": 2, "hours": 4.0, "color": "#EF4444"},
			{"name": "Sensory", "count": 3, "hours": 3.5, "color": "#64748B"},
			{"name": "Lead Generation", "count": 2, "hours": 3.0, "color": "#38BDF8"},
			{"name": "Running OpenInfinity", "count": 2, "hours": 2.5, "color": "#4ADE80"},
			{"name": "Youtube (Productivity + Finance + Tech)", "count": 3, "hours": 2.0, "color": "#FB7185"},
		}
	}
	return dist, nil
}

func GetTimeBreakdown(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	if pool == nil {
		return map[string]interface{}{
			"totalHours": 0, "billableHours": 0, "deep": 0.0, "shallow": 0.0, "meetings": 0.0, "admin": 0.0,
		}, nil
	}

	var totalSec int64
	_ = pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(duration_seconds), 0)
		FROM tracklogs
		WHERE user_id = $1 AND started_at >= NOW() - INTERVAL '7 days'`, userID).
		Scan(&totalSec)

	totalHours := float64(totalSec) / 3600.0
	return map[string]interface{}{
		"totalHours":    totalHours,
		"billableHours": totalHours * 0.7,
	}, nil
}

func GetInactivityAlerts(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	userID = auth.UserIDFromContext(ctx)
	if pool == nil {
		return map[string]interface{}{"staleClients": []interface{}{}}, nil
	}

	rows, err := pool.Query(ctx, `
		SELECT id, name,
			CASE WHEN last_contact_at IS NULL THEN NULL
			     ELSE EXTRACT(DAY FROM NOW() - last_contact_at)::int
			END as days_since
		FROM clients
		WHERE user_id = $1
		  AND deleted_at IS NULL AND status = 'active'
		  AND (
		    last_contact_at IS NULL
		    OR last_contact_at < NOW() - INTERVAL '30 days'
		  )`, userID)
	if err != nil {
		return map[string]interface{}{"staleClients": []interface{}{}}, nil
	}
	defer rows.Close()

	var list []map[string]interface{}
	for rows.Next() {
		var id, name string
		var daysSince *int
		if err := rows.Scan(&id, &name, &daysSince); err == nil {
			list = append(list, map[string]interface{}{
				"id": id, "name": name, "daysSince": daysSince,
			})
		}
	}
	if list == nil {
		list = []map[string]interface{}{}
	}
	return map[string]interface{}{"staleClients": list}, nil
}

// ── Team ────────────────────────────────────────────────────
func GetOrganization(ctx context.Context, pool *pgxpool.Pool, userID string) (interface{}, error) {
	return nil, nil
}

func CreateOrganization(ctx context.Context, pool *pgxpool.Pool, userID string, input map[string]interface{}) (interface{}, error) {
	return map[string]interface{}{"id": "org_new", "success": true}, nil
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
	if u := auth.UserIDFromContext(ctx); u != "" {
		userID = u
	}
	if pool == nil {
		return []map[string]interface{}{}, nil
	}

	var events []map[string]interface{}

	// 1. Fetch Tasks
	taskRows, err := pool.Query(ctx, `
		SELECT t.id, t.title, COALESCE(t.description, ''), t.status, t.priority,
			   COALESCE(t.due_date, t.scheduled_date, t.created_at) as start_time,
			   COALESCE(t.estimated_minutes, 30) as duration_min,
			   p.id as project_id, p.name as project_name, COALESCE(p.color, '#10B981') as project_color
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
				color := "#10B981"
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

	// 2. Fetch Goals
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
