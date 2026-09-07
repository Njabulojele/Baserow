-- Migration 003: Timer sessions columns + activity_events table
-- Adds missing columns to timer_sessions and creates activity_events table.
-- Safe to run multiple times (IF NOT EXISTS / DO $$ guards).

-- 1. Add missing columns to timer_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timer_sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE timer_sessions ADD COLUMN session_type TEXT DEFAULT 'focus';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timer_sessions' AND column_name = 'title'
  ) THEN
    ALTER TABLE timer_sessions ADD COLUMN title TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timer_sessions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE timer_sessions ADD COLUMN notes TEXT DEFAULT '';
  END IF;
END $$;

-- 2. Create activity_events table
CREATE TABLE IF NOT EXISTS activity_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  event_type  TEXT NOT NULL,          -- 'user_visit', 'timer_logged', etc.
  entity_type TEXT DEFAULT '',        -- 'page', 'project', 'goal', 'task', 'session'
  entity_id   TEXT DEFAULT '',        -- FK value (loose ref, no FK constraint)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_user_day
  ON activity_events(user_id, created_at);
