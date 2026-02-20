-- ═══════════════════════════════════════════════════════════════════
-- LexAssist — Migration 003: Add role column + Admin RLS policies
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add 'role' column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. Create a helper function: check if the current user is a super_admin
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

-- 3. Create a helper function: check if the current user is any admin
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

-- 4. Admin RLS policies on profiles
-- NOTE: These are now merged into the base schema's combined policies
-- (profiles_select_policy, profiles_insert_policy, profiles_update_policy,
--  profiles_delete_policy) to avoid multiple_permissive_policies warnings.
-- See supabase_schema.sql for the merged definitions.
-- If running migrations in order on a fresh DB, the base schema already
-- creates the combined policies. This section is kept as documentation only.

-- 5. Done! 
-- NOTE: The actual seeding of the 2 admin users into profiles is done
-- via the backend /api/admin/seed endpoint (which uses the service_role key).
-- The service_role key bypasses RLS, so no special policy is needed for seeding.
