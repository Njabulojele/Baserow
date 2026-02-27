# OPENINFI BASROW PLATFORM ROBUSTNESS BLUEPRINT

_For Startups & High-Growth Business Owners_

**Version 2.0 → 3.0 | Robustness Edition**

_Prepared by OpenInfi AntiGravity System_

---

## 1. THE ROBUSTNESS PHILOSOPHY

Making a platform 'robust to the core' is not a feature list — it is a philosophy baked into architecture, data integrity, user experience, and operational resilience. This document provides the complete transformation roadmap from the current v2.0 baseline to a battle-hardened v3.0 platform that startups and solo business owners can bet their livelihoods on.

| NEVER FAIL                                                      | ALWAYS SHOW                                                           | GROW WITH USE                                                      |
| --------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Zero data loss. Zero ghost states. Every action has a fallback. | Real metrics, real progress, real insight — always visible on demand. | Performance stays fast as data scales from 100 to 100,000 records. |

---

## 2. DATABASE & DATA INTEGRITY

The database layer is the foundation of trust. A business owner who loses a deal record, a client note, or a task history loses real money and real relationships.

### 2.1 Schema Hardening

**CRITICAL SCHEMA CHANGES**

- **Soft Deletes Everywhere** — Add deletedAt: DateTime? to every model. Never hard delete. Allow recovery within 30 days.
- **Audit Log Table** — A universal AuditLog model tracking userId, action, entityType, entityId, oldValue (JSON), newValue (JSON), timestamp.
- **Optimistic Concurrency** — Add a version: Int field to mutable entities. Increment on every update. Reject stale writes.
- **DB-Level Constraints** — Use @@check constraints in Prisma for numeric ranges (e.g., probability 0-100, energy 1-5). Never trust frontend alone.
- **Enum Guards** — All status fields should use Postgres ENUMs (not plain strings) to prevent invalid state data.
- **Cascade Rules** — Review every @@relation. Explicit onDelete: Cascade or onDelete: Restrict — never implicit defaults.

### 2.2 NeonDB Production Configuration

| Setting                | Current Risk                               | Robust Solution                                                         |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| Connection Pooling     | Serverless cold starts exhaust connections | Enable PgBouncer pooling on Neon. Set connection_limit=10 in Prisma URL |
| Read Replicas          | All reads hit primary under load           | Enable Neon read replica for analytics/dashboard queries                |
| Point-in-Time Recovery | Data loss on accidental deletion           | Enable PITR in Neon — retain 7-day history minimum                      |
| Query Timeouts         | Hanging queries block the pool             | Set statement_timeout=30s and idle_in_transaction_session_timeout=60s   |
| Index Coverage         | Slow queries as data grows                 | Index: userId, orgId, createdAt, status on ALL major tables             |

### 2.3 Data Validation Layer

Never trust what comes in from the client. Add Zod schemas at the tRPC router boundary for every mutation. Validate shapes, ranges, string lengths, and enum membership before the query ever touches Prisma.

---

## 3. BACKEND RESILIENCE

The backend must handle failure gracefully — not just success. Every point of failure needs a plan.

### 3.1 tRPC & API Layer

**API HARDENING CHECKLIST**

- **Global Error Boundary** — A tRPC middleware that catches every unhandled error, logs it with context (userId, route, inputs), and returns a structured error payload.
- **Rate Limiting** — Upstash Redis + @upstash/ratelimit on sensitive routes. Limits: 100 req/min for reads, 20 req/min for mutations, 5 req/min for AI operations.
- **Input Sanitization** — Strip HTML, limit string lengths, and reject null bytes on all text inputs. Use DOMPurify on the server for any rich text fields.
- **Idempotency Keys** — For payment webhooks (PayFast) and critical mutations, store processed event IDs to prevent double-execution.
- **Request Tracing** — Assign a requestId (UUID) to every incoming request. Thread it through logs, Inngest jobs, and Socket.io events for full traceability.

### 3.2 Express Research Engine Hardening

**RESEARCH ENGINE RESILIENCE**

- **Job Queue Persistence** — Persist Inngest job state in DB. If the Express server restarts mid-research, jobs resume from last checkpoint — not start.
- **Puppeteer Sandboxing** — Run each browser instance in isolated sandbox mode. Hard-limit each session to 90 seconds. Kill orphaned processes with a watchdog timer.
- **Circuit Breaker** — If 3 consecutive Puppeteer sessions fail, auto-pause AI scraping for 5 minutes and alert the user — don't silently loop on errors.
- **Output Validation** — Before piping AI-extracted leads into the CRM, run them through a validation schema. Reject records missing required fields.
- **Retry Strategy** — Inngest retries: 3 attempts with exponential backoff (1s → 5s → 30s). After exhaustion, mark the job as FAILED and notify.
- **Health Endpoint** — Expose /health and /status on the Express server. Monitor with an uptime service (BetterStack or UptimeRobot).

### 3.3 Inngest Job Management

| Job Type                | Failure Mode                          | Robust Pattern                                                         |
| ----------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| Research scraping       | Times out, loses progress             | Checkpoint after each URL scraped. Store partial results continuously. |
| Email drip campaigns    | Sends duplicates on retry             | Idempotency key per recipient+campaign. Check DB before every send.    |
| CRM automation triggers | Fires multiple times on rapid updates | Debounce trigger events with 5-second dedup window in Inngest.         |
| AI text generation      | Token limits exceeded silently        | Validate prompt length pre-flight. Chunk large inputs automatically.   |

---

## 4. REAL-TIME INFRASTRUCTURE

WebSocket reliability is what separates a "live" platform from a stale one. Every disconnection and re-connection must be invisible to the user.

### 4.1 Connection Resilience

**SOCKET.IO HARDENING**

- **Reconnection Logic** — Configure socket.io client: reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 10000, randomizationFactor: 0.5
- **State Reconciliation on Reconnect** — On reconnect, the client fires a state-sync event. Server responds with current room state — not just new deltas.
- **Presence Tombstoning** — When a user disconnects, mark them as AWAY for 60 seconds before removing. Prevents flickering on unstable connections.
- **Room Cleanup** — On server restart, broadcast a force-rejoin event. All clients silently re-subscribe to their rooms.
- **Message Queue Buffer** — Buffer outgoing activity events for 2 seconds on the client. Batch-send to reduce socket noise by ~80%.
- **Sticky Sessions** — If scaling Express horizontally, use Redis adapter (@socket.io/redis-adapter) with Upstash Redis for cross-instance message routing.

### 4.2 Presence Accuracy

The presence engine must be reliable enough that a team leader can glance at the Team Hub and know exactly what everyone is doing, in real time, with confidence.

| Scenario           | Current Behavior                 | Robust Behavior                                            |
| ------------------ | -------------------------------- | ---------------------------------------------------------- |
| Browser tab close  | Socket disconnects after timeout | beforeunload fires explicit leave event instantly          |
| Mobile background  | Socket silently drops            | Visibility API triggers AWAY status within 10s             |
| Server restart     | All presence lost                | Clients auto-reconnect; presence rebuilt within 30s        |
| Duplicate sessions | Multiple green dots per user     | Server deduplicates by userId; last-write-wins on location |

---

## 5. FRONTEND UX & PERFORMANCE

A robust platform feels fast, responds to errors gracefully, and never leaves the user wondering what happened. Every action must have visible feedback.

### 5.1 Loading & Error States

**THE GOLDEN RULE: EVERY ASYNC ACTION NEEDS 3 STATES**

- **Loading State** — Skeleton screens (not spinners) for data, disabled buttons with loading indicator for mutations.
- **Success State** — Toast confirmation with undo option for critical deletions. Duration: 4 seconds, dismissible.
- **Error State** — Inline error next to the field that failed. Global toast for network errors. Never a blank screen.

### 5.2 Optimistic Updates

For all high-frequency actions (task completion, drag-drop in Kanban, canvas node move), apply the change to the Zustand store immediately — before the server confirms. Roll back on error with a notification. This creates a desktop-app feel.

### 5.3 Performance Targets

| Metric             | Target                | Implementation                                                                  |
| ------------------ | --------------------- | ------------------------------------------------------------------------------- |
| Initial Load (LCP) | < 1.8s                | RSC for data fetching, lazy-load heavy features (Canvas, Research)              |
| Navigation (FCP)   | < 300ms               | Next.js prefetching on hover, tRPC query prefetch on route entry                |
| List Rendering     | < 100ms for 500 items | Tanstack Virtual (virtualizer) for all long lists: Tasks, Leads, Clients        |
| Canvas FPS         | > 55fps               | Avoid setState on mousemove — use requestAnimationFrame + direct DOM transforms |
| API Response P99   | < 400ms               | DB indexes, query result caching via tRPC + react-query, DB connection pooling  |

### 5.4 Offline Resilience

**OFFLINE & DEGRADED MODE**

- **Network Status Hook** — useNetworkStatus() — monitors navigator.onLine and WebSocket connectivity. Shows a persistent banner when degraded.
- **Local Write Queue** — When offline, store mutations in a local queue (localStorage or IndexedDB). Auto-replay when connection restores, in order.
- **Stale Data Indicators** — If data is older than 5 minutes (based on query cache timestamp), show a subtle 'Refresh to update' nudge — not a forced reload.

---

## 6. OBSERVABILITY & MONITORING

You cannot make robust what you cannot see. Visibility into your platform's health is non-negotiable for startups whose operations depend on it.

### 6.1 The Observability Stack

| Layer                | Tool (Recommended)                | Free Tier?         | Priority |
| -------------------- | --------------------------------- | ------------------ | -------- |
| Error Tracking       | Sentry.io                         | Yes (5k errors/mo) | CRITICAL |
| Uptime Monitoring    | BetterStack / UptimeRobot         | Yes                | CRITICAL |
| Application Logs     | Axiom / Logtail                   | Yes (5GB/mo)       | HIGH     |
| Performance (APM)    | Vercel Analytics + Speed Insights | Yes                | HIGH     |
| DB Query Analysis    | Neon Query Insights               | Built-in           | HIGH     |
| Real User Monitoring | PostHog                           | Yes (1M events/mo) | MEDIUM   |
| Inngest Dashboard    | Inngest Cloud UI                  | Built-in           | MEDIUM   |

### 6.2 Alerting Rules

**SET THESE ALERTS BEFORE LAUNCH**

- **Error Rate Spike** — Alert if > 10 errors/minute sustained for 2 minutes. SMS + email to founder.
- **DB Connection Exhaustion** — Alert at 80% pool usage. Auto-trigger a pool reset if 100% for > 30s.
- **Inngest Job Failures** — Alert on any job entering EXHAUSTED (all retries consumed) state.
- **Express Server Down** — UptimeRobot pings /health every 60s. Alert + auto-restart on 2 consecutive failures.
- **High Latency** — Alert if P95 API response > 2s for any route over a 5-minute window.
- **Socket.io Drop Rate** — Alert if > 30% of connections disconnect within 5 minutes — signals a deploy or crash.

---

## 7. SECURITY HARDENING

Security for a business operating system is non-optional. Client data, financial records, and CRM pipelines are high-value targets.

### 7.1 Authorization Model

**MULTI-TENANT SECURITY CHECKLIST**

- **Row-Level Security (RLS)** — Every Prisma query on tenant-scoped data MUST include a where: { orgId: ctx.user.orgId } guard. Add a middleware that auto-appends this — never rely on individual route authors.
- **OWNER Capabilities** — Destructive actions (delete org, export all data, billing changes) require OWNER role. Check explicitly — don't infer from ADMIN.
- **VIEWER Guardrails** — VIEWER role must be enforced on tRPC mutations — not just hidden in the UI. UI hiding is cosmetic; server checks are real.
- **API Key Rotation** — All Gemini/Groq/PayFast keys in environment variables. Rotate quarterly. Use Vercel's encrypted env vars — never hardcode.
- **Webhook Signature Verification** — Verify PayFast webhook payloads with HMAC signature before processing any payment state change.
- **CORS Policy** — Express server should only accept requests from verified origins (production domain + localhost:3000). Never \* in production.

### 7.2 Clerk Security Configuration

| Setting             | Action Required                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Session Duration    | Set max session lifetime to 7 days. Require re-auth for billing changes.                                        |
| MFA                 | Encourage (optional) TOTP for OWNER/ADMIN roles via Clerk dashboard.                                            |
| Suspicious Activity | Enable Clerk's bot detection and leaked credential alerts.                                                      |
| JWT Claims          | Add orgId and role to Clerk JWT session claims — read in tRPC context for fast auth checks without a DB lookup. |

---

## 8. THE MAJESTIC COMMAND CENTER

This is what separates a tool from an operating system. Business owners and founders must open the dashboard and immediately understand the state of their entire business — at a glance, with no interpretation needed.

### 8.1 The North Star Dashboard

**WHAT EVERY BUSINESS OWNER MUST SEE IN UNDER 3 SECONDS**

- **Revenue Pulse** — Live MRR, outstanding balance, deals closing this week (by probability-weighted value), and projected monthly revenue.
- **Pipeline Velocity** — Average days per deal stage. Which stage is the bottleneck. How many deals are stale (>7 days no activity).
- **Team Output Score** — Tasks completed today vs yesterday. Active team members right now (via presence engine). Burn rate vs budget hours.
- **Client Health Summary** — Count of RED / YELLOW / GREEN clients. Last interaction date. Who needs urgent attention (overdue follow-up).
- **Energy vs Output Correlation** — User's logged energy this week vs task completion rate. Show whether high-energy days produce more output — coach with data.
- **Goal Progress** — Top 3 active goals with progress bars, days remaining, and completion velocity (on track / at risk / off track).

### 8.2 Insight Cards That Actually Matter

**MOMENTUM SCORE**
A single 0-100 score computed from: task velocity + client health avg + active pipeline value. Trends daily. Business owners track this like a stock.

**FOCUS RADAR**
AI-surfaced alert: 'You have 3 high-value leads that haven't been touched in 5 days. One has a deal closing in 10 days.' Zero setup — runs automatically.

**RISK SURFACE**
Automated detection: overdue tasks blocking revenue, clients with declining health score, goals losing velocity. Color-coded and ranked by financial impact.

---

## 9. SCALABILITY ARCHITECTURE

A platform that cannot grow with its users is not robust. Here is the scaling ladder from 1 user to 10,000.

| Stage        | Users    | Architecture Change                                                                                     | Key Bottleneck                    |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Launch       | 1–50     | Current stack as-is. Optimize DB indexes. Enable NeonDB pooling.                                        | Cold starts on Vercel serverless  |
| Early Growth | 50–500   | Add Upstash Redis for rate limiting + session cache. Enable Neon read replica.                          | DB query volume on reports        |
| Scale        | 500–5000 | Move Express to Railway/Render with auto-scaling. Add Bull/BullMQ job queue as Inngest alternative.     | Socket.io cross-instance presence |
| Enterprise   | 5000+    | Multi-region Neon DB. Redis Cluster. CDN-edge tRPC procedures for reads. Separate billing microservice. | Multi-tenant data isolation       |

### 9.1 Canvas Performance at Scale

**CANVAS ARCHITECTURE FOR HUNDREDS OF NODES**

- **Spatial Indexing** — Implement a quadtree or R-tree index over canvas nodes. Only render nodes within the current viewport + a 20% buffer. Invisible nodes are unmounted.
- **Lazy Entity Linking** — Deep-linked Project/Task/Client cards should load their live data on-demand (when scrolled into view), not on canvas mount.
- **Collaborative Cursors** — Throttle cursor broadcasts to 20fps max. Use dead reckoning on the receiving end to interpolate smooth movement without every frame requiring a server round-trip.
- **Canvas Persistence** — Auto-save canvas state every 30 seconds via a debounced server action. Never rely on unmount to save — browsers crash.

---

## 10. IMPLEMENTATION ROADMAP

Prioritized by impact. Start with what protects existing users before adding new capabilities.

| #   | Task                                                                    | Priority | Effort  |
| --- | ----------------------------------------------------------------------- | -------- | ------- |
| 1   | Add Sentry error tracking to Next.js and Express                        | CRITICAL | 2h      |
| 2   | Enable NeonDB connection pooling + PITR backup                          | CRITICAL | 1h      |
| 3   | Add soft deletes (deletedAt) to all major models                        | CRITICAL | 4h      |
| 4   | Add AuditLog model + tRPC middleware to populate it                     | CRITICAL | 6h      |
| 5   | Add Zod validation to every tRPC mutation                               | CRITICAL | 8h      |
| 6   | Add DB indexes on orgId, userId, status, createdAt                      | CRITICAL | 2h      |
| 7   | Set up BetterStack uptime monitoring for Express /health                | HIGH     | 1h      |
| 8   | Implement optimistic updates in Task + Kanban Zustand stores            | HIGH     | 8h      |
| 9   | Add socket.io Redis adapter (Upstash) for horizontal scale readiness    | HIGH     | 4h      |
| 10  | Build North Star Dashboard with Momentum Score and Focus Radar          | HIGH     | 2 weeks |
| 11  | Add virtual scrolling (Tanstack Virtual) to Tasks, Clients, Leads lists | HIGH     | 6h      |
| 12  | Implement offline write queue with auto-replay on reconnect             | MEDIUM   | 1 week  |
| 13  | Canvas viewport culling — only render visible nodes                     | MEDIUM   | 1 week  |
| 14  | Add rate limiting (Upstash Redis) to sensitive API routes               | MEDIUM   | 4h      |
| 15  | Weekly automated DB health report emailed to OWNER                      | LOW      | 4h      |

---

_When these 15 items are done, this platform is no longer a prototype._

_It is an operating system that startups can bet their revenue on._

— OpenInfi AntiGravity System
