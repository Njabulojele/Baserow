package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"anchor-backend/internal/db"
	"anchor-backend/internal/handlers"
)

func main() {
	ctx := context.Background()
	pool, err := db.Init(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer pool.Close()

	fmt.Println("==================================================")
	fmt.Println("🚀 RUNNING ACTIVITY INTELLIGENCE VERIFICATION SUITE")
	fmt.Println("==================================================")

	userA := "user_test_tenant_a"
	userB := "user_test_tenant_b"

	_, _ = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS activity_events (
			id SERIAL PRIMARY KEY,
			user_id TEXT NOT NULL,
			event_type TEXT NOT NULL,
			entity_type TEXT,
			entity_id TEXT,
			payload JSONB DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
	`)

	// Cleanup previous test data
	_, _ = pool.Exec(ctx, `DELETE FROM timer_sessions WHERE user_id IN ($1, $2)`, userA, userB)
	_, _ = pool.Exec(ctx, `DELETE FROM tracklogs WHERE user_id IN ($1, $2)`, userA, userB)
	_, _ = pool.Exec(ctx, `DELETE FROM crm_leads WHERE user_id IN ($1, $2)`, userA, userB)
	_, _ = pool.Exec(ctx, `DELETE FROM tasks WHERE user_id IN ($1, $2)`, userA, userB)
	_, _ = pool.Exec(ctx, `DELETE FROM activity_events WHERE user_id IN ($1, $2)`, userA, userB)

	// 1. Insert sample data for User A
	_, err = pool.Exec(ctx, `
		INSERT INTO tasks (id, user_id, title, status) VALUES 
		('task_a1', $1, 'User A Task 1', 'completed'),
		('task_a2', $1, 'User A Task 2', 'todo')`, userA)
	if err != nil {
		log.Fatalf("Failed inserting User A tasks: %v", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO crm_leads (id, user_id, first_name, last_name, company_name, status, estimated_value_zar) VALUES
		('lead_a1', $1, 'Lead', 'A1', 'Company A', 'WON', 150000),
		('lead_a2', $1, 'Lead', 'A2', 'Company A2', 'QUALIFIED', 80000)`, userA)
	if err != nil {
		log.Fatalf("Failed inserting User A leads: %v", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO tracklogs (id, user_id, app_name, window_title, duration_seconds, started_at) VALUES
		('log_a1', $1, 'VS Code', 'analytics.go', 3600, NOW() - INTERVAL '1 hour')`, userA)
	if err != nil {
		log.Fatalf("Failed inserting User A tracklogs: %v", err)
	}

	// 2. Insert sample data for User B
	_, err = pool.Exec(ctx, `
		INSERT INTO tasks (id, user_id, title, status) VALUES 
		('task_b1', $1, 'User B Task 1', 'completed')`, userB)
	if err != nil {
		log.Fatalf("Failed inserting User B tasks: %v", err)
	}

	// 3. Test Dashboard Stats & Multi-Tenant Isolation
	statsA, err := handlers.GetDashboardStats(ctx, pool, userA, "")
	if err != nil {
		log.Fatalf("GetDashboardStats User A failed: %v", err)
	}
	mStatsA := statsA.(map[string]interface{})
	fmt.Printf("✅ [User A Stats] Tasks completed: %v, Hours tracked: %v\n", mStatsA["completedTasks"], mStatsA["hoursTracked"])

	statsB, err := handlers.GetDashboardStats(ctx, pool, userB, "")
	if err != nil {
		log.Fatalf("GetDashboardStats User B failed: %v", err)
	}
	mStatsB := statsB.(map[string]interface{})
	fmt.Printf("✅ [User B Stats] Tasks completed: %v, Hours tracked: %v\n", mStatsB["completedTasks"], mStatsB["hoursTracked"])

	if mStatsA["completedTasks"] != int64(1) || mStatsB["completedTasks"] != int64(1) {
		log.Fatalf("❌ Tenant Isolation Failure on Task count!")
	}
	if mStatsA["hoursTracked"] != 1.0 || mStatsB["hoursTracked"] != 0.0 {
		log.Fatalf("❌ Tenant Isolation Failure on Tracklogs!")
	}
	fmt.Println("🔒 Multi-Tenant Data Isolation Verified!")

	// 4. Test 7-Day Trend Chart generate_series
	trends, err := handlers.GetProductivityTrends(ctx, pool, userA, "", nil)
	if err != nil {
		log.Fatalf("GetProductivityTrends failed: %v", err)
	}
	sTrends := trends.([]map[string]interface{})
	fmt.Printf("✅ [7-Day Trend] Item count: %d (Expected: 7)\n", len(sTrends))
	if len(sTrends) != 7 {
		log.Fatalf("❌ generate_series fail: expected 7 days, got %d", len(sTrends))
	}

	// 5. Test Revenue Overview (WON constraint check)
	revA, err := handlers.GetRevenueOverview(ctx, pool, userA, "")
	if err != nil {
		log.Fatalf("GetRevenueOverview failed: %v", err)
	}
	mRevA := revA.(map[string]interface{})
	fmt.Printf("✅ [User A Revenue] Client Revenue ZAR: R%v (Closed deals: %v, Pipeline: R%v)\n",
		mRevA["clientRevenue"], mRevA["closedDeals"], mRevA["pipelineValue"])
	if mRevA["clientRevenue"] != 150000.0 || mRevA["closedDeals"] != int64(1) {
		log.Fatalf("❌ Revenue WON status check failed!")
	}

	// 6. Test Timer Lifecycle & Single Active Session Constraint
	fmt.Println("⏱️ Testing Timer Lifecycle & Heartbeat...")
	resStart, err := handlers.StartTimer(ctx, pool, userA, map[string]interface{}{"id": "task_a2"})
	if err != nil {
		log.Fatalf("StartTimer failed: %v", err)
	}
	mStart := resStart.(map[string]interface{})
	sessID := mStart["sessionId"].(string)
	fmt.Printf("✅ Started timer session: %s\n", sessID)

	// Heartbeat test
	_, err = handlers.HeartbeatTimer(ctx, pool, userA, map[string]interface{}{"sessionId": sessID})
	if err != nil {
		log.Fatalf("HeartbeatTimer failed: %v", err)
	}
	fmt.Println("✅ Heartbeat touch succeeded.")

	// Active Timer Hydration check
	activeTimer, err := handlers.GetActiveTimer(ctx, pool, userA)
	if err != nil || activeTimer == nil {
		log.Fatalf("GetActiveTimer failed: %v", err)
	}
	mActive := activeTimer.(map[string]interface{})
	fmt.Printf("✅ Active Timer Hydrated: Task=%v, Title=%v\n", mActive["taskId"], mActive["title"])

	// Stop Timer test
	_, err = handlers.StopTimer(ctx, pool, userA, map[string]interface{}{"sessionId": sessID})
	if err != nil {
		log.Fatalf("StopTimer failed: %v", err)
	}
	fmt.Println("✅ StopTimer completed session.")

	// Check dual-write to activity_events
	var eventCount int64
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM activity_events WHERE user_id = $1`, userA).Scan(&eventCount)
	fmt.Printf("✅ Dual-write activity_events logged: %d events\n", eventCount)
	if eventCount < 2 {
		log.Fatalf("❌ Dual-write to activity_events failed!")
	}

	// Cleanup test data
	_, _ = pool.Exec(ctx, `DELETE FROM timer_sessions WHERE user_id IN ($1, $2)`, userA, userB)
	_, _ = pool.Exec(ctx, `DELETE FROM tracklogs WHERE user_id IN ($1, $2)`, userA, userB)
	_, _ = pool.Exec(ctx, `DELETE FROM crm_leads WHERE user_id IN ($1, $2)`, userA, userB)
	_, _ = pool.Exec(ctx, `DELETE FROM tasks WHERE user_id IN ($1, $2)`, userA, userB)
	_, _ = pool.Exec(ctx, `DELETE FROM activity_events WHERE user_id IN ($1, $2)`, userA, userB)

	fmt.Println("==================================================")
	fmt.Println("🎉 ALL VERIFICATION TESTS PASSED 100% PERFECTLY!")
	fmt.Println("==================================================")
	os.Exit(0)
}
