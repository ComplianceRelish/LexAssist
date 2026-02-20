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
    WHERE user_id = auth.uid()
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
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update RLS policies on profiles
--    Allow admins to read ALL profiles (for admin panel)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Admins can view all profiles"
      ON public.profiles FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

--    Allow super_admin to INSERT any profile (create users)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admin can insert any profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Super admin can insert any profile"
      ON public.profiles FOR INSERT
      WITH CHECK (public.is_super_admin());
  END IF;
END $$;

--    Allow super_admin to UPDATE any profile (edit users)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admin can update any profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Super admin can update any profile"
      ON public.profiles FOR UPDATE
      USING (public.is_super_admin())
      WITH CHECK (public.is_super_admin());
  END IF;
END $$;

--    Allow super_admin to DELETE any profile
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admin can delete any profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Super admin can delete any profile"
      ON public.profiles FOR DELETE
      USING (public.is_super_admin());
  END IF;
END $$;

-- 5. Done! 
-- NOTE: The actual seeding of the 2 admin users into profiles is done
-- via the backend /api/admin/seed endpoint (which uses the service_role key).
-- The service_role key bypasses RLS, so no special policy is needed for seeding.
