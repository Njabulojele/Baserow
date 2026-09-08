# Comprehensive Guide: Timer & Time-Tracking System

This document explains in detail how every component, state store, backend service, database table, and user interface relating to **timers and time-tracking** functions within the Baserow productivity platform.

---

## 1. Architectural Overview

The timer system is designed with a **distributed, multi-tiered architecture**:

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                               FRONTEND (Next.js 16 + React 19)             │
 │                                                                             │
 │  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
 │  │ Dedicated Timer Hub  │  │ GlobalTimerIndicator │  │ QuickTimerDialog │  │
 │  │ (/timer)             │  │ (Navbar Pill)        │  │ (⌘K / Modal)     │  │
 │  └──────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
 │             │                         │                       │            │
 │             └────────────────────┬────┴───────────────────────┘            │
 │                                  │                                         │
 │                      ┌───────────▼───────────┐                             │
 │                      │    useTimerStore      │ ◄─── Zustand + localStorage │
 │                      │  useTimerDisplay hook │      Persistence            │
 │                      └───────────┬───────────┘                             │
 │                                  │ 30s Heartbeat                           │
 └──────────────────────────────────┼─────────────────────────────────────────┘
                                    │ /api/trpc/proxy
 ┌──────────────────────────────────▼─────────────────────────────────────────┐
 │                           BACKEND SERVICES                                 │
 │                                                                             │
 │  ┌─────────────────────────────────────┐  ┌─────────────────────────────┐  │
 │  │ Go API Engine (Port 8080)           │  │ Next.js tRPC Fallback       │  │
 │  │ • StartTimer / StopTimer            │  │ (server/routers/timer.ts)   │  │
 │  │ • HeartbeatTimer / CleanupStale     │  │ (server/routers/task.ts)    │  │
 │  │ • LogTimerSession / GetTimerStats   │  │                             │  │
 │  └──────────────────┬──────────────────┘  └──────────────┬──────────────┘  │
 └─────────────────────┼────────────────────────────────────┼─────────────────┘
                       │                                    │
 ┌─────────────────────▼────────────────────────────────────▼─────────────────┐
 │                           POSTGRESQL DATABASE                              │
 │                                                                             │
 │  • timer_sessions       (active & historical sessions with metadata)       │
 │  • activity_events      (audit log for streak & engagement tracking)       │
 │  • tasks                (timer_running, current_timer_start, actual_mins)  │
 │  • goals                (completed_hours, streak_days, completed_dates)    │
 │  • time_entries         (Prisma reporting & timesheets)                    │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema & Models

### 2.1 `timer_sessions` Table
The primary record for every live or completed timer session:
* `id` (`VARCHAR` / `UUID`): Unique session identifier (e.g. `sess_1725792000000`).
* `user_id` (`VARCHAR`): Clerk / database user ID.
* `task_id` (`VARCHAR`, nullable): Foreign key to the task being worked on.
* `project_id` (`VARCHAR`, nullable): Foreign key to the associated project.
* `goal_id` (`VARCHAR`, nullable): Foreign key to the associated strategic goal.
* `duration_seconds` (`INTEGER`): Final logged duration in seconds.
* `status` (`VARCHAR`):
  * `'active'` — Timer is actively running.
  * `'completed'` — Timer was cleanly stopped or manually logged.
  * `'auto_ended'` — Auto-closed by the server due to missed heartbeats (>10 mins inactivity).
* `session_type` (`VARCHAR`):
  * `'focus'` — General focus block.
  * `'pomodoro'` — 25-minute Pomodoro focus block.
  * `'short_break'` — 5-minute rest.
  * `'long_break'` — 15-minute rest.
  * `'break'` — General break.
* `title` (`TEXT`): Session title (defaults to task title, project name, goal title, or "Deep Work Focus").
* `notes` (`TEXT`): User notes or scratchpad text captured during the session.
* `started_at` (`TIMESTAMPTZ`): Start timestamp.
* `ended_at` (`TIMESTAMPTZ`): End timestamp.
* `last_heartbeat_at` (`TIMESTAMPTZ`): Timestamp updated every 30 seconds by the client heartbeat to prove the user is still active.

### 2.2 `activity_events` Table (Dual-Write Audit Trail)
Whenever a timer begins or ends, an event is dual-written here to power user activity streaks, daily presence metrics, and audit logs:
* `event_type`: `'timer_started'`, `'timer_stopped'`, `'timer_logged'`
* `entity_type`: `'task'`, `'goal'`, `'project'`, `'session'`
* `entity_id`: ID of the entity worked on.
* `created_at`: Timestamp.

### 2.3 `tasks` Table (Timer Columns)
* `timer_running` (`BOOLEAN`): Set to `true` when a timer is currently ticking for this task.
* `current_timer_start` (`TIMESTAMPTZ`): The start time of the active session.
* `actual_minutes` (`INTEGER`): Cumulative minutes logged across all sessions for this task.

### 2.4 `goals` Table (Timer Impact)
* `completed_hours` (`FLOAT`): Cumulative hours credited from timer sessions.
* `streak_days` (`INTEGER`): Incremented when daily targets are achieved.
* `last_logged_at` (`TIMESTAMPTZ`): Timestamp of the most recent session.

---

## 3. Frontend State Management

### 3.1 `useTimerStore` (`lib/timerStore.ts`)
The primary Zustand store managing client-side timer state. Persisted in `localStorage` under `baserow_active_timer`.

#### State Interface
```typescript
interface ActiveTimer {
  sessionId?: string;
  taskId?: string;
  taskTitle?: string;
  goalId?: string;
  goalTitle?: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  title: string;
  notes?: string;
  sessionType: TimerSessionType; // "focus" | "break" | "pomodoro" | "short_break" | "long_break"
  mode: TimerMode;              // "pomodoro" | "deep_work" | "sprint" | "stopwatch" | "custom"
  targetSeconds: number;        // 0 for stopwatch, 1500 (25m), 3600 (1h), 1800 (30m), 300 (5m)
  startedAt: string;            // ISO timestamp
  isRunning: boolean;
  elapsedSeconds: number;
  pomodoroPhase?: "work" | "break";
}
```

#### Core Actions
* `startSession(options)`: Initializes a new session. Defaults target duration based on `mode`:
  * Pomodoro: 25 minutes (`1500s`)
  * Deep Work: 60 minutes (`3600s`)
  * Sprint: 30 minutes (`1800s`)
  * Stopwatch: `0s` (counts upwards indefinitely)
  * Custom: Specified minutes
* `switchToBreak(durationMinutes)`: Automatically pauses focus, sets `sessionType: "short_break"` (5m) or `"long_break"` (15m), resets elapsed counter, and switches UI theme to amber/warm tones.
* `switchToFocus(targetMinutes)`: Returns from break into focus mode (25m default).
* `togglePause()` / `pause()` / `resume()`: Pauses the ticking clock without losing elapsed progress.
* `stopAndReset()`: Stops the heartbeat, resets local timer state, and returns the finished session for DB logging.
* `updateNotes(notes)`: Live update of the scratchpad notes attached to the session.

#### 30-Second Heartbeat Engine
When `startSession` or `resume` is invoked, `startHeartbeat()` spins up a `setInterval` that executes every 30,000ms:
```typescript
await fetch("/api/trpc/task.heartbeatTimer?batch=1", {
  method: "POST",
  body: JSON.stringify({ "0": { json: { sessionId: current.sessionId } } })
});
```
This updates `timer_sessions.last_heartbeat_at` in Postgres.

### 3.2 `useTimerDisplay` Hook (`hooks/useTimerDisplay.ts`)
Avoids UI lag and display drift by re-evaluating true elapsed milliseconds every 100ms:
$$\text{elapsedMs} = \text{Date.now()} - \text{startedAt}$$
Formats into standard `HH:MM:SS` (or `MM:SS` when under 1 hour).

### 3.3 Goal Inactivity Auto-Save (`components/goals/FloatingGoalTimer.tsx`)
A dedicated background detector guards against runaway timers if a user walks away:
1. Listens to `mousemove`, `keydown`, `mousedown`, `touchstart` events.
2. If a session overruns its target time by >5 minutes AND zero user input is detected for 15 consecutive minutes:
   - Sets session status to blinking.
   - Automatically stops the session.
   - Saves the exact tracked minutes to the database.
   - Dispatches a notification toast.

---

## 4. User Interface Surfaces

### 4.1 Dedicated Timer Hub (`/timer`)
Located at [`app/(dashboard)/timer/page.tsx`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/app/%28dashboard%29/timer/page.tsx):
* **Circular Progress Ring**: SVG circular arc illustrating progress against target time (`elapsed / targetSeconds`).
* **Timer Controls**: Big Start/Pause/Stop/Reset buttons with audio chimes.
* **Mode Switcher**: Quick toggle pills for Pomodoro (25m), Deep Work (60m), Sprint (30m), and Stopwatch.
* **Entity Binders**: Dropdowns to select which Project, Task, or Strategic Goal the session logs against.
* **Live Notes Scratchpad**: Auto-saved notes for session output.
* **Live KPI Dashboard**:
  * Today's Focus Hours vs Break Hours.
  * Week Focus Total.
  * Today's Completed Sessions Count.
  * Goal Streaks & Active Days Count.
* **Recent Sessions Log**: Chronological list of the past 30 sessions showing tags, duration, and timestamps.

### 4.2 Global Navbar Indicator (`GlobalTimerIndicator.tsx`)
Located in the dashboard top navigation bar:
* **When Running**: A dynamic pulsing pill (emerald for focus, amber for break/coffee) showing the live ticking clock (`MM:SS`). Clicking it opens the quick controller modal.
* **When Idle**: A compact "Quick Timer" button to start a session from anywhere.

### 4.3 Quick Timer Dialog (`QuickTimerDialog.tsx`)
A global modal dialog opened via:
* Clicking the Navbar Indicator.
* Triggering `⌘K` (Command Palette).
* Keyboard shortcuts.
Enables instant starting, pausing, switching to break, or logging manual retrospective time entries without leaving the current page.

### 4.4 Task Board Integration (`tasks-client.tsx`, `TaskCard.tsx`)
Every task card has an inline Play/Stop timer button:
* Clicking "Play" calls `trpc.task.startTimer({ id: task.id })`.
* Card border illuminates in emerald with a spinning status indicator.
* Stopping updates `actual_minutes` and marks status as `in_progress` or `done`.

### 4.5 Calendar Integration (`CalendarClient.tsx`, `EventDetailPopover.tsx`)
Clicking any scheduled event displays an "⚡ Start Focus Timer" button, immediately launching a session bound to that calendar task.

### 4.6 AI Mini Chat Integration (`AIMiniChat.tsx`, `/api/chat/action/route.ts`)
The AI assistant can control timers via conversational prompts:
* *"Start a 25 minute timer on the Homepage Design task"* $\rightarrow$ triggers `startTimer`.
* *"Stop my timer and log it"* $\rightarrow$ triggers `stopTimer`.

---

## 5. Backend Logic (Go API & tRPC)

The Go backend (`backend/internal/handlers/tasks.go` and `goals.go`) contains the authoritative business rules:

### 5.1 `StartTimer`
1. **Auto-Closure**: Automatically closes any existing active timer for this user:
   $$\text{duration\_seconds} = \max(0, \text{NOW}() - \text{started\_at})$$
2. **Flag Reset**: Clears `timer_running = false` across all tasks for the user.
3. **Task Activation**: Marks the target task `timer_running = true` and `status = 'in_progress'`.
4. **Session Insertion**: Creates a new row in `timer_sessions` with `status = 'active'`.
5. **Audit Logging**: Inserts a `'timer_started'` record into `activity_events`.

### 5.2 `StopTimer`
1. Clears `timer_running = false` on tasks.
2. Locates the active session in `timer_sessions`.
3. Calculates total elapsed seconds and updates the session:
   `status = 'completed'`, `ended_at = NOW()`.
4. Adds the duration in minutes to `tasks.actual_minutes`:
   $$\text{actual\_minutes} = \text{actual\_minutes} + \lfloor\text{duration\_seconds} / 60\rfloor$$
5. Writes `'timer_stopped'` to `activity_events`.

### 5.3 `HeartbeatTimer`
Updates `last_heartbeat_at = NOW()` on the user's active session.

### 5.4 `CleanupStaleTimerSessions`
A background sweeper that identifies abandoned sessions:
```sql
UPDATE timer_sessions
SET status = 'auto_ended',
    ended_at = last_heartbeat_at,
    duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (last_heartbeat_at - started_at))::int)
WHERE status = 'active' AND last_heartbeat_at < NOW() - INTERVAL '10 minutes';
```

### 5.5 `LogTimerSession` (Manual Logging & Goal Streaks)
Handles completed session records:
* Inserts completed `timer_sessions` row.
* Credits hours to `goals.completed_hours`.
* If marked `completed: true`:
  * Updates goal streak days (`streak_days = streak_days + 1`).
  * Appends the current date to `goals.completed_dates`.
* If task attached:
  * Adds minutes to `tasks.actual_minutes`.
  * Optionally sets `tasks.status = 'done'` and `completed_at = NOW()`.

### 5.6 `GetTimerStats`
Computes aggregated metrics:
* Today's focus seconds (excluding breaks).
* Today's break seconds.
* Week focus seconds (`started_at >= date_trunc('week', NOW())`).
* Goal streaks and completed goal counts.
* Platform activity count (`COUNT(DISTINCT date_trunc('day', created_at))` from `activity_events`).

---

## 6. Precedence & Analytics Integration

In the platform analytics router (`backend/internal/handlers/analytics.go`):
* Tracked hours follow a strict precedence rule:
  > **Precedence**: Tracklogs total is used if available; otherwise, the system automatically falls back to `timer_sessions` total hours.
* The Project Distribution chart calculates proportional time spent per project by summing all completed timer durations across the user's projects.

---

## 7. Summary File Map

| File Path | Role |
|-----------|------|
| [`lib/timerStore.ts`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/lib/timerStore.ts) | Zustand store, localStorage persistence, heartbeat trigger, sound chimes |
| [`lib/goalStore.ts`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/lib/goalStore.ts) | Goal-specific session tracking, inactivity auto-save, Pomodoro phase rules |
| [`hooks/useTimerDisplay.ts`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/hooks/useTimerDisplay.ts) | Drift-free 100ms tick hook formatting `HH:MM:SS` |
| [`app/(dashboard)/timer/page.tsx`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/app/%28dashboard%29/timer/page.tsx) | Dedicated full-page timer hub, circular SVG progress, history log |
| [`components/navigation/GlobalTimerIndicator.tsx`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/components/navigation/GlobalTimerIndicator.tsx) | Top navigation bar live pulsing timer indicator |
| [`components/timer/QuickTimerDialog.tsx`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/components/timer/QuickTimerDialog.tsx) | Global quick start/stop modal |
| [`components/goals/FloatingGoalTimer.tsx`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/components/goals/FloatingGoalTimer.tsx) | Floating goal timer widget with inactivity detector |
| [`server/routers/timer.ts`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/server/routers/timer.ts) | tRPC timer router contract & Prisma fallback |
| [`backend/internal/handlers/tasks.go`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/backend/internal/handlers/tasks.go) | Go backend `StartTimer`, `StopTimer`, `HeartbeatTimer`, `CleanupStaleTimerSessions` |
| [`backend/internal/handlers/goals.go`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/backend/internal/handlers/goals.go) | Go backend `LogTimerSession`, `GetTimerStats`, `GetTimerRecentSessions` |
| [`backend/internal/handlers/analytics.go`](file:///Users/clementjele/Documents/OpenInfi%20Pty%20Ltd/baserow/backend/internal/handlers/analytics.go) | Analytics precedence rules incorporating timer session totals |
