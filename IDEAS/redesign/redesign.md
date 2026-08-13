# Anchor - Personal Operating System

## Baserow Redesign Spec (Solo Founder Command Center)

## 1. Core Purpose

Solo dev running a company systemically. This app is the second brain: plan days, months, and years, track clients, track goals, run projects, and stay consistent. Numbers must be true and real, not vanity metrics. It must feel instant (sub-100ms) at every interaction.

## 2. Design System - Look and Feel

The entire application adopts the **Toota** visual language as the single source of truth for theme, layout, and styling. Other referenced apps (Tracklog, LunarDesk, Syncboard) only contribute **feature/functional patterns**, not visual style. Everything gets re-skinned into Toota's language.

- No borders anywhere. Separation comes from spacing, elevation, and subtle shadow, not lines.
- Liquid, soft UI: rounded corners, soft cards, gradient accents.
- Premium feel: generous whitespace, confident large headings, soft neutral backgrounds (off-white/light grey), dark sidebar option.
- Gradient elements used deliberately (progress bars, highlight buttons, key metrics) rather than everywhere.
- Clean sans-serif typography, bold large numbers for key metrics (matches Toota's big stat numbers like "2,683").
- Rounded pill buttons and toggle switches (Company/Personal style toggle, Last 3 days/Week/Month toggle).
- Circular avatars with small colored notification badges.
- Soft card grouping for metrics ("Metrics" row of 4 cards with icon, big number, % change, mini progress bar) - this pattern gets reused for Anchor's own KPIs.
- Light/Dark mode toggle, styled as a pill switch (as shown in Toota sidebar).
- Sidebar: icon + label nav items, active item highlighted with soft pill/rounded highlight, not a hard border.
- Animations and transitions throughout - smooth, not flashy. Everything should feel alive but not distracting.
- Component libraries: shadcn/ui as base, Aceternity UI for premium animated elements (gradients, hover effects, animated borders/backgrounds where tasteful).

**Sidebar items** (Clement's own information architecture, styled in Toota's visual language, replacing Toota's own menu items):

- Dashboard
- Clients / Pipeline
- Projects
- Tasks (LunarDesk-style, see below)
- Goals
- Calendar
- Canvas
- Timer / Focus Mode
- Tracklog (time & activity tracking)
- Reports & Analytics
- Settings

## 3. Tasks Page - LunarDesk Reference

Reproduce the LunarDesk "Tasks" page layout exactly as structured in the reference image, restyled with Toota colors/fonts/components:

- Page header: "Tasks" title + subtitle description.
- Top toolbar: search bar, Filter button, view switcher (List / Kanban / Calendar), primary "Add Task" button (Toota-style gradient/solid pill button).
- Grouped sections by status: **To Do**, **In Progress**, **In Review**, **Completed** - each with a count badge and a "View All" link, collapsible.
- Each section is a table with columns: Task ID, Task Name, Assignee (avatar), Project Name, Progress (%), Deadline, Priority (colored pill), Action (kebab menu).
- This view shows **all tasks across all projects**, plus general/unassigned tasks (since Clement is solo, "Assignee" can default to Clement but the structure stays intact for future team members).
- Priority pills keep colored badge styling (Medium/High/Low) restyled to Toota's palette.

## 4. Dashboard/Overview - Toota + Tracklog Reference

Combine Toota's Overview layout (Teams metric card, Trends Over Time chart, Best Performing bar, Metrics row) with Tracklog's Dashboard functional widgets, all restyled to look native to Toota:

- Top toggle: Company / Personal (repurposed as e.g. "Business / Personal" or "All Projects / Focus View").
- Time range toggle: Last 3 days / Last Week / Last Month / custom.
- Big headline metric card with large number + trend %, and a Time Tracking style gradient bar (like Toota's orange-to-green bar).
- "Trends Over Time" chart - bar/wave chart showing activity volume by day.
- Metrics row (4 cards) reused for real KPIs instead of Toota's generic ones:
  - Tasks completed vs pending
  - Time tracked today/this week
  - Revenue/pipeline value (Rands)
  - Goal consistency streaks
- From Tracklog dashboard, adopt (restyled to Toota look, no borders):
  - **Timeline** - stacked hourly bar chart, color-coded Productive / Focused Sessions / Unproductive, with hover tooltip showing minutes breakdown.
  - **Working Hours** widget - heatmap-style grid (contribution-graph style) + total hours worked + % of workday + tracking hours range + "Start Tracking" button.
  - **Time Breakdown** - concentric progress rings for Productive Hours / Focused Time / Unproductive.
  - **Apps Used** - list of apps/tools with usage bar and time (Figma, VS Code, Antigravity, browser, etc.) - real data from the Electron desktop tracker.
  - **Break Timer** widget - circular countdown, time since last break, break/work ratio, notification toggle, threshold setting, "Start Break" control.
  - **Sessions** list - recent tracked sessions with colored project tags and duration.
  - **Projects** panel - total project time + list of projects with progress bar and time spent.
  - **Activity** feed - tracking status + timestamped log of app/tool switches.

## 5. Real Analytics (Not Decorative)

Charts and graphs must reflect true underlying data via the tracking engine, matching the sophistication used in large company dashboards:

- Tasks completed vs tasks outstanding (overall and per project).
- Time spent per project, per category (client work, learning, gym, admin, etc.).
- Productive vs unproductive time split.
- Goal consistency streaks and gaps (e.g., flag "Learn Golang" goal untouched for 4 days).
- Monthly revenue/income goal progress (e.g., R50,000/month target) with clear visual progress state.
- Historical trend view so patterns of neglect or consistency are visible over weeks/months.

## 6. Consistency & Nudge Engine

A background engine tracks everything continuously and drives proactive nudges:

- Detects when a goal (e.g. "Learn Golang") hasn't been logged/marked for N days (e.g. 4 days) and surfaces a clear in-app alert/notification pushing the user to act.
- Detects extended app inactivity (user hasn't opened Anchor for several days) and shows a clear "welcome back" / catch-up state summarizing what was missed and what needs attention.
- Internal notifications for: upcoming calendar events, goal neglect, timer/session end, break reminders, pipeline follow-ups.
- Email notifications, starting with support for free mail providers (Gmail, Outlook.com, Yahoo, etc.) before considering custom SMTP/domains.

## 7. Clients & Pipeline

- Client and prospective client tracking structured like a sales/service pipeline (add a lead/potential client, move through stages, convert to active client).
- Clients arranged for easy tracking/scanning at a glance (status, value, activity).
- Ability to create a Project under a client, assign a Rand (ZAR) value if known.
- Full backlog visibility per project, styled like the Syncboard Kanban reference (To Do / In Progress / Review / Complete columns, task cards with tags, progress bar, subtasks/comments counts, assignee avatars) - restyled into Toota's borderless, liquid look.
- Project structure must stay flexible enough to accommodate different project types/shapes, not a rigid fixed template.

## 8. Client Web Portal (External Sharing)

- Ability to invite a client via email to a scoped web view.
- Client only sees their own project(s): To Do / Ongoing / Completed status, no access to other clients' or Clement's other projects.
- Lightweight, read-focused external portal, styled consistently with the main app's premium look.

## 9. Calendar

- Fully functional calendar for planning days, weeks, months, and the year ahead.
- Internal notifications when scheduled items are about to occur.
- Integrates with the nudge engine (goal/task reminders can appear on the calendar too).

## 10. Canvas

- Existing canvas functionality is already acceptable - focus is on making it more user-friendly, not rebuilding it.
- Used for brainstorming, freeform drawing, and pasting content (images, notes, snippets).

## 11. Timer System

### 11.1 General Timer Behavior

- Timer can be started from anywhere relevant: viewing a project/backlog item, a goal-tracking action (e.g. create action "Exercise"), or freestyle.
- User sets a target duration (e.g. 1 hour).
- If the set duration elapses with no physical interaction to end the session, the system auto-sends a notification and auto-marks the session as done (does not run forever unmonitored).
- Visual style must match the referenced Syncboard-style floating/browser timer aesthetic (image 4) - premium, not a boring plain countdown. Should support pause, continue/resume, and stop, with clear, polished visual state changes.

### 11.2 Pomodoro Mode

- Configurable work session length (e.g. 1 hour), short break (e.g. 10 min), and long break (e.g. 30 min after N sessions).
- A single work session is hard-capped at its set duration - it cannot silently keep counting beyond that if the user forgets to stop it.
- By default: when a work session ends, the break auto-starts; when the break ends, the next work session auto-starts.
- Setting to disable auto-continue: if turned off, the timer stops at the boundary and waits for explicit user input to proceed.

### 11.3 Alerts

- If 10 minutes pass past a set countdown with no interaction, the system sends an alert/notification or plays a sound to prompt the user.

## 12. Desktop Tracking (Electron)

- App wrapped in Electron for desktop-level tracking.
- Tracks which applications are open and time spent in each (e.g., time on "System Design App" work done in Antigravity vs VS Code).
- Floating timer window: modern, always-on-top style, shows the active tracked app/project and running timer.
- Logs breaks taken, idle periods, and app-switching activity automatically, feeding the Apps Used and Timeline widgets shown in the Dashboard.
- Detects multi-day absence from the app and clearly surfaces this on return (a "welcome back" / gap summary state).

## 13. Tracklog (Detailed Time & Activity Tracking)

Dedicated tracking view modeled on the Tracklog reference dashboard (restyled to Toota look):

- Time spent per project (including named example: time on gym / productive / unproductive categories).
- Timeline, Working Hours heatmap, Time Breakdown rings, Apps Used, Break Timer, Sessions list, Projects time summary, and Activity feed - as described in section 4 - live under this dedicated Tracklog section as well as summarized on the main Dashboard.

## 14. Goals

- Goal tracking with clear current state (on track / at risk / neglected) - not just a static checklist.
- Streaks and heatmaps for goal consistency.
- Monthly/period targets (e.g. R50,000 revenue goal) with visible, honest progress tracking.
- Direct integration with the Timer system (a goal can spawn a timed action/session, e.g. "Exercise" under a goal, timed for 1 hour).

## 15. Performance & Architecture

- Full Go backend implementation.
- Target: sub-100ms perceived load time at any point in the app.
- Caching layer: Redis (server-side) plus appropriate web/client-side caching for instant perceived interactions.
- Real-time engine running in the background that continuously tracks state across tasks, goals, timers, and pipeline, and feeds notifications/alerts.
- Architecture must stay flexible for solo-to-team growth (project/task/client model shouldn't assume solo-only forever, mirroring the multi-assignee structure seen in the LunarDesk and Syncboard references).

## 16. Summary of Reference Sources

| Reference           | What is taken from it                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toota (Image 3)     | Master visual style: colors, fonts, spacing, no-border liquid UI, sidebar structure/behavior, Overview layout pattern, Metrics cards, gradient progress bars                    |
| Tracklog (Image 1)  | Dashboard functional widgets: Timeline, Working Hours heatmap, Time Breakdown, Apps Used, Break Timer, Sessions, Projects panel, Activity feed - all restyled into Toota's look |
| LunarDesk (Image 2) | Tasks page structure and layout: grouped status sections, table columns, view switcher, Add Task flow - restyled into Toota's look                                              |
| Syncboard (Image 4) | Kanban/backlog board pattern for project backlogs, and the premium floating timer aesthetic - restyled into Toota's look                                                        |

**Overriding rule:** regardless of which reference a feature or layout pattern comes from, every screen in the final app must look and feel like it belongs to a single cohesive Toota-styled product - no borders, liquid/soft UI, premium contrast, gradients, and smooth animation throughout.

# Anchor - Phase 2 Implementation Plan: Backend, Engine, Electron & Notifications

## Goal

Phase 1 (`redesign.md`) covers the Toota visual reskin of the Next.js frontend. Phase 2 delivers everything that makes Anchor actually function as a systemic second brain: the Go backend, the always-on consistency/nudge engine, real notifications (internal + email), the Electron desktop wrapper with app/activity tracking, the external client portal, and the data model to support all of it. This plan assumes Phase 1's pages/components exist and only need to be wired to real endpoints rather than rebuilt.

**Note to agent:** Where exact existing file paths aren't known (backend repo layout, DB migration tool, etc.), inspect the current project structure first and adapt paths accordingly. This plan describes required modules and behavior; treat file paths as the intended location, not a guarantee they already exist.

---

## 0. Assumptions to Verify First

- Confirm whether a Go backend already exists anywhere in the repo (`/backend`, `/server`, `/api`, or a separate repo). If none exists, scaffold a new Go module.
- Confirm current database (Postgres assumed, matching prior stack references). Confirm ORM/query tool in use (`sqlc`, `gorm`, `pgx` raw, etc.) or pick one if none exists.
- Confirm auth provider already in use by the Next.js app (Clerk was used in earlier projects — reuse if present) so the Go API and client portal can validate the same sessions/tokens.
- Confirm whether Redis is already provisioned (local/dev + prod).

---

## 1. Go Backend Service

### 1.1 Project Scaffold

#### [NEW] `/backend/go.mod`

#### [NEW] `/backend/cmd/api/main.go`

- Standard Go service entrypoint. HTTP router (`chi` or `echo`), structured logging, graceful shutdown, config loaded from env.

#### [NEW] `/backend/internal/config/config.go`

- Central config struct: DB DSN, Redis URL, JWT/session secret (matching frontend auth), SMTP/email provider keys, port, environment.

#### [NEW] `/backend/internal/db/`

- Connection pool setup (`pgxpool`), migration runner.
- Migrations directory `/backend/internal/db/migrations/` using a tool like `goose` or `golang-migrate`.

### 1.2 Domain Modules (each gets `handler.go`, `service.go`, `repository.go`, `models.go`)

#### [NEW] `/backend/internal/clients/`

- CRUD for clients + pipeline stages (Lead → Proposal → Active → Retainer → Churned).
- Endpoints: `GET/POST /clients`, `PATCH /clients/:id/stage`, `GET /clients/:id`.

#### [NEW] `/backend/internal/projects/`

- CRUD for projects, linked to a client (nullable for internal/personal projects), ZAR value field, status.
- Endpoints: `GET/POST /projects`, `GET /projects/:id`, `PATCH /projects/:id`.

#### [NEW] `/backend/internal/tasks/`

- CRUD for tasks, linked to a project (nullable for general tasks), status (To Do/In Progress/In Review/Completed), priority, deadline, assignee (defaults to owner, structured for future multi-user).
- Endpoints: `GET /tasks` (supports filters: project, status, assignee), `POST /tasks`, `PATCH /tasks/:id`.

#### [NEW] `/backend/internal/goals/`

- CRUD for goals, target type (habit/streak vs numeric target e.g. revenue), current streak, last-logged-at timestamp, neglect threshold (days).
- Endpoints: `GET/POST /goals`, `POST /goals/:id/log` (mark done today), `GET /goals/:id/heatmap`.

#### [NEW] `/backend/internal/sessions/`

- Timer/session tracking: session type (freestyle, pomodoro-work, pomodoro-break), linked entity (task/project/goal or none), planned duration, actual duration, status (running/paused/completed/auto-ended), start/end timestamps.
- Endpoints: `POST /sessions/start`, `PATCH /sessions/:id/pause`, `PATCH /sessions/:id/resume`, `PATCH /sessions/:id/stop`, `GET /sessions` (history, filterable by date/project).

#### [NEW] `/backend/internal/tracklog/`

- Aggregation layer over sessions + desktop activity events (see Electron section) to power Timeline, Working Hours heatmap, Time Breakdown, Apps Used widgets.
- Endpoints: `GET /tracklog/timeline?date=`, `GET /tracklog/working-hours?range=`, `GET /tracklog/apps-used?range=`.

#### [NEW] `/backend/internal/activity/`

- Ingests raw desktop activity events from the Electron app (app name, window title, timestamp, duration bucket, productive/unproductive tag).
- Endpoint: `POST /activity/events` (batched ingestion from Electron), classification rules stored per-app (user-configurable productive/unproductive mapping).

#### [NEW] `/backend/internal/calendar/`

- CRUD for calendar events, recurrence rules, linked entity (task/project/goal optional).
- Endpoints: `GET/POST /calendar/events`, `PATCH /calendar/events/:id`.

#### [NEW] `/backend/internal/canvas/`

- Persistence for canvas boards/nodes (structure depends on existing canvas implementation — inspect current schema before designing new one; likely just needs API endpoints wrapping existing storage, not a new model).

#### [NEW] `/backend/internal/analytics/`

- Rollup queries for Reports & Analytics page: tasks completed vs pending trend, time-per-category trend, revenue/pipeline trend, goal consistency trend.
- Endpoints: `GET /analytics/tasks`, `GET /analytics/time`, `GET /analytics/revenue`, `GET /analytics/goals`.

#### [NEW] `/backend/internal/portal/`

- Scoped, token-based endpoints for the external client portal (see Section 4). Separate from the authenticated internal API — uses signed, expiring portal tokens instead of the owner's session.

---

## 2. Consistency & Nudge Engine

### 2.1 Engine Service

#### [NEW] `/backend/internal/engine/scheduler.go`

- Background worker (runs as a goroutine loop or separate `cmd/worker/main.go` process) polling on an interval (e.g. every 5 min) plus reacting to relevant DB events.
- Responsibilities:
  1. **Goal neglect detection**: for each goal, compare `last_logged_at` to `neglect_threshold_days`. If exceeded and not already alerted today, create a notification.
  2. **Session auto-end**: for running sessions past their planned duration with no heartbeat/interaction, mark as `auto-ended`, create a notification, and (if linked to a goal/task) mark it complete per the spec's behavior.
  3. **Pomodoro transitions**: auto-start break after work session ends (unless `auto_continue = false` in user settings), auto-start next work session after break ends.
  4. **10-minute overrun alert**: for any timer past its target with no interaction, fire an alert/sound trigger at the 10-minute mark specifically (separate from auto-end logic, per spec: "if 10 minutes passes... and theres no interaction... send notification").
  5. **Re-engagement detection**: on each login/app-open event, check time since last session/activity; if beyond a threshold (e.g. 3+ days), flag a "welcome back" state for the frontend to render (missed goals, stale pipeline items, upcoming deadlines).
  6. **Calendar reminders**: poll upcoming events within their notify-before window and create notifications.
  7. **Pipeline follow-up nudges**: flag clients/leads with no activity for N days.

#### [NEW] `/backend/internal/notifications/`

- Central notification model: type, title, body, linked entity, channel(s) (in-app, email), read/unread state, created_at.
- Endpoints: `GET /notifications`, `PATCH /notifications/:id/read`.
- `dispatch.go`: fan-out logic — writes in-app notification row always; additionally queues an email if the notification type is configured for email delivery.

### 2.2 Frontend Wiring

#### [MODIFY] `NotificationBell.tsx` (or equivalent in `components/dashboard/`)

- Poll or subscribe (SSE/WebSocket if available, else short-interval polling) to `/notifications`, render unread badge count, dropdown list.

#### [NEW] `WelcomeBackBanner.tsx`

- Renders on Dashboard when the engine's re-engagement flag is present; summarizes neglected goals, stale pipeline, upcoming deadlines missed.

---

## 3. Notifications: Email Delivery

#### [NEW] `/backend/internal/email/provider.go`

- Start with SMTP-based sending compatible with free providers (Gmail, Outlook.com, Yahoo) via app-password SMTP auth, per spec ("mails.. from free mail providers first"). Abstract behind an interface so a transactional provider (Resend/SendGrid) can be swapped in later without touching call sites.

#### [NEW] `/backend/internal/email/templates/`

- Plain, on-brand templates for: goal neglect alert, session auto-ended, calendar reminder, client portal invite.

#### [NEW] `/backend/internal/settings/`

- Per-user settings: which notification types get emailed, SMTP credentials for their connected free mail account, timer auto-continue preference, neglect thresholds per goal (override default).
- Endpoints: `GET/PATCH /settings`.

---

## 4. Client Web Portal (External Sharing)

#### [NEW] `/backend/internal/portal/invite.go`

- `POST /clients/:id/invite` — generates a signed, expiring token tied to that client ID, emails it to the client's address via the email module.

#### [NEW] `/backend/internal/portal/auth.go`

- Middleware validating the portal token on each request, scoping every query strictly to that client's project(s) — no access to other clients or internal-only projects/tasks.

#### [NEW] `/app/(portal)/portal/[token]/page.tsx`

- New, separate route group (outside the authenticated dashboard layout) rendering a read-focused view: project name, To Do / Ongoing / Completed task summary, styled consistently with the main Toota look but stripped of internal-only data (no rates, no other clients, no internal notes unless explicitly marked client-visible).

#### [NEW] `/backend/internal/tasks/` (extend)

- Add a `client_visible` boolean on tasks/comments so the owner controls exactly what surfaces in the portal.

---

## 5. Electron Desktop Wrapper

### 5.1 Shell

#### [NEW] `/desktop/package.json`

#### [NEW] `/desktop/main.js` (Electron main process)

- Wraps the existing Next.js frontend (loads the deployed/local URL, or bundles a production build) in an Electron `BrowserWindow`.
- Registers a second always-on-top, frameless `BrowserWindow` for the floating timer (see 5.3).

### 5.2 Active Window / App Tracking

#### [NEW] `/desktop/tracking/activeWindow.js`

- Uses an active-window-polling library (e.g. `active-win`, cross-platform) on an interval (e.g. every 5–10s) to capture the foreground app name and window title.
- Buffers samples locally, rolls them into duration-bucketed events (app name, start, end, duration), and batches `POST /activity/events` to the Go backend (e.g. every 60s or on app switch).
- Applies the user's configured productive/unproductive classification (fetched from `/settings`) client-side for immediate UI feedback, with the backend as source of truth.

#### [NEW] `/desktop/tracking/idleDetector.js`

- Uses Electron's `powerMonitor` idle-time API to detect breaks/inactivity, feeding the Break Timer and Working Hours widgets.

### 5.3 Floating Timer Window

#### [NEW] `/desktop/windows/floatingTimer.js`

- Small, always-on-top, frameless, draggable window styled to match the Syncboard-referenced premium floating timer aesthetic from Phase 1.
- Shows: active project/task/goal name, running time, pause/resume/stop controls, current app being tracked.
- Syncs state with the main app window and backend via the existing `/sessions` endpoints (shared session state, not a separate timer).

### 5.4 Notifications & Sound

#### [NEW] `/desktop/notifications/nativeNotify.js`

- Uses Electron's `Notification` API for OS-native alerts (goal neglect, session auto-end, 10-minute overrun, Pomodoro transitions) in addition to in-app notifications, so alerts land even if the app is backgrounded.
- Bundles short alert sound assets for the 10-minute-overrun and session-complete cases, per spec ("send notification internally or make sounds").

---

## 6. Calendar Logic

#### [MODIFY] `/app/(dashboard)/calendar/page.tsx`

- Wire to `/backend/internal/calendar` endpoints; render month/week/day views.
- Add "notify me before" field per event (default e.g. 10 min), consumed by the engine's calendar reminder check (Section 2.1.6).

---

## 7. Canvas

#### [MODIFY] existing canvas component (inspect current implementation first)

- No functional rebuild per spec ("canvas i have is already fine"). Scope limited to:
  - UX polish pass (toolbar clarity, easier pan/zoom, paste-image affordance).
  - Wire persistence to `/backend/internal/canvas` if not already backed by a real API.

---

## 8. Reports & Analytics Page

#### [NEW] `/app/(dashboard)/analytics/page.tsx`

- Consumes `/backend/internal/analytics` endpoints.
- Charts (using existing chart library from Phase 1, e.g. Recharts): tasks completed vs pending over time, time-per-category trend, revenue/pipeline trend vs monthly target, goal consistency trend across all goals.
- This is the "large company style" analytics home — more depth than the Dashboard's summary metrics, with date-range filtering.

---

## 9. Data Model Summary (new/changed tables)

| Table             | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `clients`         | Client + pipeline stage, contact email for portal invites                  |
| `projects`        | Linked to client (nullable), ZAR value, status                             |
| `tasks`           | Linked to project (nullable), status, priority, deadline, `client_visible` |
| `goals`           | Streak state, `last_logged_at`, neglect threshold, target type/value       |
| `goal_logs`       | Per-day completion log powering streaks/heatmaps                           |
| `sessions`        | Timer sessions: type, planned/actual duration, status, linked entity       |
| `activity_events` | Raw desktop app-usage events from Electron                                 |
| `calendar_events` | Events, recurrence, notify-before window                                   |
| `notifications`   | In-app + email dispatch record                                             |
| `settings`        | Per-user preferences: email routing, SMTP creds, auto-continue, thresholds |
| `portal_tokens`   | Signed tokens scoping client portal access to one client                   |

Run this against the current schema to identify what already exists (e.g. `clients`/`projects`/`tasks` may already exist from the Baserow base) versus what's genuinely new (`sessions`, `activity_events`, `goal_logs`, `notifications`, `portal_tokens`, `settings`).

---

## 10. Build & Sequencing Order (for the agent)

1. Scaffold Go backend + DB migrations for all tables in Section 9.
2. Implement core CRUD modules (clients, projects, tasks, goals) — unblocks reskinned Phase 1 pages going from mock to real data.
3. Implement sessions + tracklog + activity ingestion endpoints.
4. Implement notifications module + engine scheduler (goal neglect, session auto-end, calendar reminders).
5. Implement email module (SMTP/free-provider sending) and wire it to notifications dispatch.
6. Implement settings module (needed by engine thresholds and email routing).
7. Implement client portal (invite endpoint, token auth, portal route in Next.js).
8. Scaffold Electron shell, wire active-window tracking + idle detection to `/activity/events`.
9. Build floating timer Electron window, synced to `/sessions`.
10. Wire native OS notifications + sounds in Electron.
11. Build Analytics page against `/analytics` endpoints.
12. Wire Calendar page to backend + reminder settings.
13. Canvas: polish pass + persistence check only.
14. End-to-end pass: verify every Phase 1 page is now backed by real data, not mock/static content.

---

## Verification Plan

### Automated

- `go build ./...` and `go vet ./...` in `/backend`.
- `go test ./...` for engine logic (goal neglect thresholds, session auto-end timing, Pomodoro transition logic) — these have clear deterministic rules and should be unit tested directly.
- `npm run build` / `tsc --noEmit` for frontend + portal route.
- Electron: verify `npm run build` (or equivalent packaging script) succeeds for at least one platform target.

### Manual

- Create a goal, don't log it for the configured threshold, confirm a notification appears (and email if enabled).
- Start a freestyle session, let it run past its duration untouched, confirm auto-end + notification fires.
- Start a Pomodoro cycle, confirm auto-continue transitions work, and confirm disabling auto-continue stops at the boundary instead.
- Confirm the 10-minute-overrun alert fires independently of auto-end.
- Invite a test client, confirm the portal link only shows that client's own project and nothing else.
- Run the Electron app, switch between a few real apps, confirm activity events land in the backend and populate the Apps Used / Timeline widgets with true data.
- Leave the app untouched for a simulated multi-day gap (or manipulate timestamps in dev), reopen, confirm the "welcome back" state renders correctly.
