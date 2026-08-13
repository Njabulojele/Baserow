package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"anchor-backend/internal/auth"
	"anchor-backend/internal/cache"
	"anchor-backend/internal/db"
	"anchor-backend/internal/engine"
	"anchor-backend/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type HeartbeatPayload struct {
	Timestamp string `json:"timestamp"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize Database Pool
	pool, err := db.Init(ctx)
	if err != nil {
		log.Printf("[DB Notice] Could not initialize Postgres pool: %v", err)
	}

	// Auto-create tracklogs table if not exists
	if pool != nil {
		_, _ = pool.Exec(ctx, `
			CREATE TABLE IF NOT EXISTS tracklogs (
				id SERIAL PRIMARY KEY,
				user_id TEXT,
				app_name TEXT NOT NULL,
				window_title TEXT NOT NULL,
				category TEXT NOT NULL DEFAULT 'productive',
				duration_seconds INT NOT NULL DEFAULT 0,
				timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);
		`)
	}

	// Initialize Cache Layer
	c, err := cache.NewCache(redisURL)
	if err != nil {
		log.Printf("[Redis Notice] Redis initialization notice: %v", err)
	}

	// Initialize Clerk Auth Verifier
	jwksURL := os.Getenv("CLERK_JWKS_URL")
	if jwksURL == "" {
		jwksURL = "https://hot-thrush-96.clerk.accounts.dev/.well-known/jwks.json"
	}
	verifier := auth.NewClerkVerifier(jwksURL)

	// Start Background Consistency Engine
	eng := engine.NewEngine(c)
	go eng.Start(ctx)

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001", "*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	hc := &handlers.HandlerContext{
		DB:       pool,
		Verifier: verifier,
	}

	// Central tRPC Go Batch Router
	r.HandleFunc("/api/trpc/*", handlers.HandleTRPCBatch(hc))

	// Health check endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":    "healthy",
			"service":   "Baserow Productivity Go API Engine",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	// Session Heartbeat Endpoint
	r.Patch("/api/sessions/{id}/heartbeat", func(w http.ResponseWriter, r *http.Request) {
		sessionID := chi.URLParam(r, "id")
		var hb HeartbeatPayload
		_ = json.NewDecoder(r.Body).Decode(&hb)

		cacheKey := fmt.Sprintf("session:heartbeat:%s", sessionID)
		_ = c.Set(r.Context(), cacheKey, time.Now().Format(time.RFC3339), 5*time.Minute)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"session_id": sessionID,
			"status":     "heartbeat_received",
			"synced_at":  time.Now().Format(time.RFC3339),
		})
	})

	// Real Tracklog & Activity Data endpoint (queries real TimeEntry & tracklogs in Postgres)
	tracklogHandler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if pool == nil {
			json.NewEncoder(w).Encode(map[string]interface{}{
				"working_hours_total": "0h 0m",
				"target_hours":        8,
				"productive_hours":    "0h 0m",
				"focused_hours":       "0h 0m",
				"unproductive_time":   "0m",
				"apps":                []interface{}{},
				"events":              []interface{}{},
			})
			return
		}

		type AppEntry struct {
			Name     string `json:"name"`
			Duration string `json:"duration"`
			Percent  int    `json:"percent"`
			Color    string `json:"color"`
		}
		type EventEntry struct {
			Time     string `json:"time"`
			App      string `json:"app"`
			Title    string `json:"title"`
			Duration string `json:"duration"`
			Status   string `json:"status"`
		}

		fmtDuration := func(secs int64) string {
			h := secs / 3600
			m := (secs % 3600) / 60
			s := secs % 60
			if h > 0 {
				return fmt.Sprintf("%dh %dm", h, m)
			} else if m > 0 {
				return fmt.Sprintf("%dm %ds", m, s)
			}
			return fmt.Sprintf("%ds", s)
		}

		var totalSecs, productiveSecs, focusedSecs int64

		// 1. Query TimeEntry records from PostgreSQL
		teRows, err := pool.Query(r.Context(), `
			SELECT 
				COALESCE(t.title, p.name, 'Task Timer'),
				COALESCE(p.name, 'Baserow OS'),
				te.duration,
				te."startTime"
			FROM "TimeEntry" te
			LEFT JOIN "Task" t ON te."taskId" = t.id
			LEFT JOIN "Project" p ON te."projectId" = p.id
			ORDER BY te."startTime" DESC LIMIT 50
		`)

		events := []EventEntry{}
		appMap := map[string]int64{}

		if err == nil {
			defer teRows.Close()
			for teRows.Next() {
				var title, projName string
				var durationMins int64
				var startTime time.Time

				if err := teRows.Scan(&title, &projName, &durationMins, &startTime); err == nil {
					secs := durationMins * 60
					if secs <= 0 {
						secs = 60
					}
					totalSecs += secs
					productiveSecs += secs

					appMap[projName] += secs

					events = append(events, EventEntry{
						Time:     startTime.Local().Format("03:04 PM"),
						App:      projName,
						Title:    title,
						Duration: fmtDuration(secs),
						Status:   "Productive",
					})
				}
			}
		}

		// 2. Also query tracklogs table if desktop app logged entries
		tRows, err := pool.Query(r.Context(), `
			SELECT app_name, window_title, duration_seconds, category, timestamp
			FROM tracklogs ORDER BY timestamp DESC LIMIT 20
		`)
		if err == nil {
			defer tRows.Close()
			for tRows.Next() {
				var appName, windowTitle, cat string
				var durSecs int64
				var ts time.Time
				if err := tRows.Scan(&appName, &windowTitle, &durSecs, &cat, &ts); err == nil {
					totalSecs += durSecs
					if cat == "focused" {
						focusedSecs += durSecs
					} else {
						productiveSecs += durSecs
					}
					appMap[appName] += durSecs
					events = append(events, EventEntry{
						Time:     ts.Local().Format("03:04 PM"),
						App:      appName,
						Title:    windowTitle,
						Duration: fmtDuration(durSecs),
						Status:   "Productive",
					})
				}
			}
		}

		appColors := []string{"bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-amber-400", "bg-rose-500", "bg-cyan-500"}
		apps := []AppEntry{}
		i := 0
		for name, secs := range appMap {
			pct := 0
			if totalSecs > 0 {
				pct = int((secs * 100) / totalSecs)
			}
			apps = append(apps, AppEntry{
				Name:     name,
				Duration: fmtDuration(secs),
				Percent:  pct,
				Color:    appColors[i%len(appColors)],
			})
			i++
		}

		json.NewEncoder(w).Encode(map[string]interface{}{
			"working_hours_total": fmtDuration(totalSecs),
			"target_hours":        8,
			"productive_hours":    fmtDuration(productiveSecs),
			"focused_hours":       fmtDuration(focusedSecs),
			"unproductive_time":   "0m",
			"apps":                apps,
			"events":              events,
		})
	}

	r.Get("/api/tracklog", tracklogHandler)
	r.Get("/api/v1/tracklog", tracklogHandler)

	r.Get("/api/v1/notifications/unread-count", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"count": 0,
		})
	})

	r.Get("/api/portal/{token}", func(w http.ResponseWriter, r *http.Request) {
		token := chi.URLParam(r, "token")
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"client_name":  "OpenInfinity Pty Ltd",
			"portal_token": token,
			"projects": []map[string]interface{}{
				{"name": "Divine Essence Luxury Redesign", "progress": 85, "status": "In Progress"},
				{"name": "Baserow OS Platform Build", "progress": 92, "status": "In Progress"},
			},
		})
	})

	fmt.Printf("[Baserow Go API Engine] Server listening on http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}
