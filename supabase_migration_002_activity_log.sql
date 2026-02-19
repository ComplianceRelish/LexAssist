-- ═══════════════════════════════════════════════════════════════════
-- LexAssist — Migration 002: Activity Log Table
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════════

-- Tracks every user action for real usage stats & activity history
CREATE TABLE public.activity_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        text NOT NULL,          -- 'brief_analyzed', 'case_file_generated', 'document_downloaded', 'search_performed'
  title         text,                   -- Short description shown in history
  detail        text,                   -- Longer context (e.g. first 200 chars of the brief)
  metadata      jsonb DEFAULT '{}'::jsonb,  -- Any extra structured data
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_created ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_action  ON public.activity_log(action);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

-- Only the backend (service role) inserts activity — no direct client inserts
CREATE POLICY "Service role can insert activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (true);
