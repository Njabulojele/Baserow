package engine

import (
	"context"
	"fmt"
	"time"

	"anchor-backend/internal/cache"
)

type Engine struct {
	cache *cache.Cache
}

func NewEngine(c *cache.Cache) *Engine {
	return &Engine{cache: c}
}

func (e *Engine) Start(ctx context.Context) {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	fmt.Println("[Consistency Engine] Nudge & Heartbeat Scheduler started.")

	for {
		select {
		case <-ctx.Done():
			fmt.Println("[Consistency Engine] Stopping scheduler...")
			return
		case <-ticker.C:
			e.checkHeartbeats(ctx)
			e.checkGoalNeglect(ctx)
		}
	}
}

func (e *Engine) checkHeartbeats(ctx context.Context) {
	// Auto-end active sessions if no heartbeat ping received for > 2 minutes past target
	// fmt.Println("[Engine] Checking active session heartbeats...")
}

func (e *Engine) checkGoalNeglect(ctx context.Context) {
	// Check goals where last_logged_at > neglect_threshold_days
	// Flag as neglected and queue SMTP email reminder
	// fmt.Println("[Engine] Checking goal neglect thresholds...")
}
