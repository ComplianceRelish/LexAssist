-- ═══════════════════════════════════════════════════════════════════
-- LexAssist — Migration 005: Case Diary System  (idempotent)
-- Run in Supabase Dashboard > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════════

-- 1. CASES TABLE — parent entity for the Case Diary
CREATE TABLE IF NOT EXISTS public.cases (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'closed', 'archived')),
  notes         text DEFAULT '',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status  ON public.cases(status);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Users can read/insert/update their own cases
CREATE POLICY "cases_select_own"
  ON public.cases FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "cases_insert_own"
  ON public.cases FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "cases_update_own"
  ON public.cases FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Service role can do everything (backend uses service key)
CREATE POLICY "cases_service_all"
  ON public.cases FOR ALL
  USING (true)
  WITH CHECK (true);


-- 2. ADD case_id TO briefs (link each brief entry to a case)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'briefs' AND column_name = 'case_id'
  ) THEN
    ALTER TABLE public.briefs
      ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;
    CREATE INDEX idx_briefs_case_id ON public.briefs(case_id);
  END IF;
END $$;


-- 3. ADD case_id TO activity_log (link activities to a case for easy lookup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'case_id'
  ) THEN
    ALTER TABLE public.activity_log
      ADD COLUMN case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;
    CREATE INDEX idx_activity_case_id ON public.activity_log(case_id);
  END IF;
END $$;


-- 4. Auto-update updated_at on cases
CREATE OR REPLACE FUNCTION public.update_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cases_updated_at ON public.cases;
CREATE TRIGGER trigger_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cases_updated_at();

