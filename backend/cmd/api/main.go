package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
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

	// Auto-create tracklogs & activity_events tables if not exists
	if pool != nil {
		_, _ = pool.Exec(ctx, `
			CREATE TABLE IF NOT EXISTS tracklogs (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				app_name TEXT NOT NULL,
				window_title TEXT NOT NULL,
				category TEXT NOT NULL DEFAULT 'productive',
				duration_seconds INT NOT NULL DEFAULT 0,
				started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				ended_at TIMESTAMPTZ,
				timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
			);

			CREATE TABLE IF NOT EXISTS app_rules (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL DEFAULT 'user_demo',
				app_name TEXT NOT NULL,
				category TEXT NOT NULL DEFAULT 'productive',
				created_at TIMESTAMPTZ DEFAULT NOW(),
				updated_at TIMESTAMPTZ DEFAULT NOW(),
				CONSTRAINT unique_user_app UNIQUE (user_id, app_name)
			);

			INSERT INTO app_rules (id, user_id, app_name, category) VALUES
			  ('rule_vscode', 'user_demo', 'Visual Studio Code', 'productive'),
			  ('rule_code', 'user_demo', 'Code', 'productive'),
			  ('rule_cursor', 'user_demo', 'Cursor', 'productive'),
			  ('rule_term', 'user_demo', 'Terminal', 'productive'),
			  ('rule_iterm', 'user_demo', 'iTerm2', 'productive'),
			  ('rule_baserow', 'user_demo', 'Baserow Productivity OS', 'productive'),
			  ('rule_figma', 'user_demo', 'Figma', 'productive'),
			  ('rule_slack', 'user_demo', 'Slack', 'neutral'),
			  ('rule_notion', 'user_demo', 'Notion', 'productive'),
			  ('rule_twitter', 'user_demo', 'Twitter', 'unproductive'),
			  ('rule_x', 'user_demo', 'X', 'unproductive'),
			  ('rule_youtube', 'user_demo', 'YouTube', 'unproductive')
			ON CONFLICT (user_id, app_name) DO NOTHING;

			UPDATE "TimeEntry" SET duration = 45 WHERE duration > 480;
			UPDATE tracklogs SET duration_seconds = 1800 WHERE duration_seconds > 28800;
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

	// Start Background Timer Session Auto-Cleanup Ticker (every 1 minute)
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				handlers.CleanupStaleTimerSessions(ctx, pool)
			}
		}
	}()

	// 13-Second Keep-Alive Self-Ping Routine (Prevents Render & Cloud instances from sleeping)
	go func() {
		ticker := time.NewTicker(13 * time.Second)
		defer ticker.Stop()
		client := &http.Client{Timeout: 4 * time.Second}
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				target := os.Getenv("RENDER_EXTERNAL_URL")
				if target == "" {
					target = os.Getenv("SELF_PING_URL")
				}
				if target == "" {
					target = fmt.Sprintf("http://localhost:%s/health", port)
				} else {
					target = strings.TrimRight(target, "/") + "/health"
				}

				req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
				if err == nil {
					resp, err := client.Do(req)
					if err == nil && resp != nil {
						_ = resp.Body.Close()
					}
				}
			}
		}
	}()

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	corsOrigin := os.Getenv("CORS_ORIGIN")
	allowedOrigins := []string{"http://localhost:3000", "http://localhost:3001", "https://*.vercel.app"}
	if corsOrigin != "" {
		allowedOrigins = append(allowedOrigins, corsOrigin)
	} else {
		allowedOrigins = append(allowedOrigins, "*")
	}

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
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

		if r.Method == http.MethodPost {
			var body struct {
				UserID          string `json:"user_id"`
				AppName         string `json:"app_name"`
				WindowTitle     string `json:"window_title"`
				DurationSeconds int    `json:"duration_seconds"`
				Category        string `json:"category"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.AppName == "" {
				http.Error(w, "Invalid payload", http.StatusBadRequest)
				return
			}
			if body.UserID == "" {
				body.UserID = "user_demo"
			}
			if body.DurationSeconds <= 0 {
				body.DurationSeconds = 1
			}

			if pool != nil {
				// Query category from app_rules if not supplied
				cat := body.Category
				if cat == "" {
					_ = pool.QueryRow(r.Context(),
						`SELECT category FROM app_rules WHERE (user_id = $1 OR user_id = 'user_demo') AND app_name = $2 LIMIT 1`,
						body.UserID, body.AppName,
					).Scan(&cat)
					if cat == "" {
						cat = "productive"
					}
				}

				id := fmt.Sprintf("trlog_%d", time.Now().UnixNano())
				_, err := pool.Exec(r.Context(), `
					INSERT INTO tracklogs (id, user_id, app_name, window_title, category, duration_seconds, started_at, timestamp)
					VALUES ($1, $2, $3, $4, $5, $6, NOW() - ($6 || ' seconds')::interval, NOW())
				`, id, body.UserID, body.AppName, body.WindowTitle, cat, body.DurationSeconds)

				if err != nil {
					log.Printf("[Tracklog Ingest Error] %v", err)
				}
			}

			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{"status": "success"})
			return
		}

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
			Category string `json:"category"`
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

		var totalSecs, productiveSecs, focusedSecs, unproductiveSecs int64

		// 1. Query TimeEntry records from PostgreSQL (capped to 120 mins max per single session to filter runaway timers)
		teRows, err := pool.Query(r.Context(), `
			SELECT 
				COALESCE(t.title, p.name, 'Task Timer'),
				COALESCE(p.name, 'Baserow OS'),
				LEAST(te.duration, 120) as duration,
				te."startTime"
			FROM "TimeEntry" te
			LEFT JOIN "Task" t ON te."taskId" = t.id
			LEFT JOIN "Project" p ON te."projectId" = p.id
			WHERE te.duration IS NOT NULL AND te.duration < 1440
			ORDER BY te."startTime" DESC LIMIT 30
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
				}
			}
		}

		// 2. Query aggregated tracklogs using GROUP BY app_name and JOIN app_rules (filtering runaway duration_seconds > 28800)
		tRows, err := pool.Query(r.Context(), `
			SELECT 
				t.app_name,
				COALESCE(ar.category, t.category, 'productive') as category,
				SUM(LEAST(t.duration_seconds, 14400)) as total_duration
			FROM tracklogs t
			LEFT JOIN app_rules ar ON (ar.user_id = t.user_id OR ar.user_id = 'user_demo') AND ar.app_name = t.app_name
			WHERE t.duration_seconds < 28800
			GROUP BY t.app_name, COALESCE(ar.category, t.category, 'productive')
			ORDER BY total_duration DESC
		`)
		if err == nil {
			defer tRows.Close()
			for tRows.Next() {
				var appName, cat string
				var durSecs int64
				if err := tRows.Scan(&appName, &cat, &durSecs); err == nil {
					totalSecs += durSecs
					switch cat {
					case "focused":
						focusedSecs += durSecs
					case "unproductive":
						unproductiveSecs += durSecs
					default:
						productiveSecs += durSecs
					}
					appMap[appName] += durSecs
				}
			}
		}

		// 3. Query Active Window Feed strictly from tracklogs (Electron desktop context switches)
		eRows, err := pool.Query(r.Context(), `
			SELECT 
				t.app_name, 
				t.window_title, 
				LEAST(t.duration_seconds, 14400) as duration_seconds, 
				COALESCE(ar.category, t.category, 'productive') as category, 
				t.timestamp
			FROM tracklogs t
			LEFT JOIN app_rules ar ON (ar.user_id = t.user_id OR ar.user_id = 'user_demo') AND ar.app_name = t.app_name
			WHERE t.duration_seconds < 28800
			ORDER BY t.timestamp DESC LIMIT 15
		`)
		if err == nil {
			defer eRows.Close()
			for eRows.Next() {
				var appName, windowTitle, cat string
				var durSecs int64
				var ts time.Time
				if err := eRows.Scan(&appName, &windowTitle, &durSecs, &cat, &ts); err == nil {
					events = append(events, EventEntry{
						Time:     ts.Local().Format("03:04 PM"),
						App:      appName,
						Title:    windowTitle,
						Duration: fmtDuration(durSecs),
						Status:   strings.Title(cat),
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
			"unproductive_time":   fmtDuration(unproductiveSecs),
			"apps":                apps,
			"events":              events,
		})
	}

	r.HandleFunc("/api/tracklog", tracklogHandler)
	r.HandleFunc("/api/v1/tracklog", tracklogHandler)

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
