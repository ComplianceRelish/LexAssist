-- ═══════════════════════════════════════════════════════════════════
-- LexAssist — Migration 004: Fix RLS Performance Warnings
-- Run this in Supabase Dashboard > SQL Editor > New Query
--
-- Fixes two Supabase linter warnings:
-- 1. auth_rls_initplan: auth.uid() re-evaluated per row → wrap in (select ...)
-- 2. multiple_permissive_policies: merge overlapping policies on profiles
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- A. Fix helper functions: use (select auth.uid()) instead of auth.uid()
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = (select auth.uid())
      AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = (select auth.uid())
      AND role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────────
-- B. PROFILES table — drop old overlapping policies, create merged ones
-- ─────────────────────────────────────────────────────────────────

-- Drop all old profiles policies
DROP POLICY IF EXISTS "Users can view own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"     ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can delete any profile" ON public.profiles;

-- SELECT: own profile OR admin can view all
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR public.is_admin()
  );

-- INSERT: own profile OR super_admin can create any
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR public.is_super_admin()
  );

-- UPDATE: own profile OR super_admin can edit any
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR public.is_super_admin()
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR public.is_super_admin()
  );

-- DELETE: super_admin only (unchanged, just fix auth.uid() usage)
CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  USING (public.is_super_admin());


-- ─────────────────────────────────────────────────────────────────
-- C. BRIEFS table — fix auth.uid() → (select auth.uid())
-- ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own briefs"  ON public.briefs;
DROP POLICY IF EXISTS "Users can insert own briefs" ON public.briefs;

CREATE POLICY "briefs_select_policy"
  ON public.briefs FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "briefs_insert_policy"
  ON public.briefs FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));


-- ─────────────────────────────────────────────────────────────────
-- D. ANALYSIS_RESULTS table — fix auth.uid() → (select auth.uid())
-- ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own analysis"  ON public.analysis_results;
DROP POLICY IF EXISTS "Users can insert own analysis" ON public.analysis_results;

CREATE POLICY "analysis_results_select_policy"
  ON public.analysis_results FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "analysis_results_insert_policy"
  ON public.analysis_results FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));


-- ─────────────────────────────────────────────────────────────────
-- E. ACTIVITY_LOG table — fix auth.uid() → (select auth.uid())
-- ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;

CREATE POLICY "activity_log_select_policy"
  ON public.activity_log FOR SELECT
  USING (user_id = (select auth.uid()));

-- "Service role can insert activity" policy uses WITH CHECK (true),
-- no auth.uid() call, so it's fine as-is.


-- ═══════════════════════════════════════════════════════════════════
-- Done! All 20 performance warnings should be resolved.
-- ═══════════════════════════════════════════════════════════════════
