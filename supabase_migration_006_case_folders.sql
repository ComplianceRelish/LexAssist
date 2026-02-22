-- ═══════════════════════════════════════════════════════════════════
-- LexAssist — Migration 006: Case Folders & Case Type  (idempotent)
-- Run in Supabase Dashboard > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════════

-- 1. CASE_FOLDERS TABLE — user-created organisational folders
CREATE TABLE IF NOT EXISTS public.case_folders (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text DEFAULT '#3b82f6',
  sort_order  int  DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_folders_user_id ON public.case_folders(user_id);

ALTER TABLE public.case_folders ENABLE ROW LEVEL SECURITY;

-- Users can manage their own folders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'folders_select_own' AND tablename = 'case_folders') THEN
    CREATE POLICY "folders_select_own" ON public.case_folders FOR SELECT
      USING (user_id = (select auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'folders_insert_own' AND tablename = 'case_folders') THEN
    CREATE POLICY "folders_insert_own" ON public.case_folders FOR INSERT
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'folders_update_own' AND tablename = 'case_folders') THEN
    CREATE POLICY "folders_update_own" ON public.case_folders FOR UPDATE
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'folders_delete_own' AND tablename = 'case_folders') THEN
    CREATE POLICY "folders_delete_own" ON public.case_folders FOR DELETE
      USING (user_id = (select auth.uid()));
  END IF;
END $$;

-- Service role (backend) can do everything
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'folders_service_all' AND tablename = 'case_folders') THEN
    CREATE POLICY "folders_service_all" ON public.case_folders FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;


-- 2. ADD folder_id TO cases (link each case to an optional folder)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE public.cases
      ADD COLUMN folder_id uuid REFERENCES public.case_folders(id) ON DELETE SET NULL;
    CREATE INDEX idx_cases_folder_id ON public.cases(folder_id);
  END IF;
END $$;


-- 3. ADD case_type TO cases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'case_type'
  ) THEN
    ALTER TABLE public.cases
      ADD COLUMN case_type text DEFAULT ''
        CHECK (case_type IN (
          '', 'civil', 'criminal', 'family', 'property',
          'corporate', 'tax', 'constitutional', 'labour',
          'consumer', 'arbitration', 'ip', 'other'
        ));
    CREATE INDEX idx_cases_case_type ON public.cases(case_type);
  END IF;
END $$;
