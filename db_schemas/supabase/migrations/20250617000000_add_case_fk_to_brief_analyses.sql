-- 20250617000000_add_case_fk_to_brief_analyses.sql
-- Migration to add `case_id` foreign key to `brief_analyses` table and supporting index + RLS policy.

BEGIN;

-- 1. Add the case_id column (nullable initially to avoid issues with existing data)
ALTER TABLE public.brief_analyses
ADD COLUMN IF NOT EXISTS case_id uuid;

-- 2. Add a foreign-key constraint linking to public.cases(id)
ALTER TABLE public.brief_analyses
ADD CONSTRAINT IF NOT EXISTS brief_analyses_case_id_fkey
FOREIGN KEY (case_id)
REFERENCES public.cases(id)
ON DELETE CASCADE;

-- 3. Create an index to accelerate look-ups by case
CREATE INDEX IF NOT EXISTS idx_brief_analyses_case_id
ON public.brief_analyses (case_id);

-- 4. RLS policy (optional but recommended)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'brief_analyses'
      AND policyname = 'brief_analyses_user_case_ownership'
  ) THEN
    -- Allows a user to access analyses only for cases they own
    CREATE POLICY brief_analyses_user_case_ownership
      ON public.brief_analyses
      USING (auth.uid() = (SELECT user_id FROM public.cases WHERE id = case_id));
  END IF;
END;
$$;

COMMIT;
