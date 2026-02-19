-- ═══════════════════════════════════════════════════════════════════
-- LexAssist — Supabase Database Schema
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE
-- Stores user profile data (linked to Supabase Auth user)
CREATE TABLE public.profiles (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text,
  email         text,
  phone         text,
  address       text,
  age           integer,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

-- Index for fast lookup by user_id
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can read/write only their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 2. BRIEFS TABLE
-- Stores submitted legal briefs
CREATE TABLE public.briefs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text,
  content       text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_briefs_user_id ON public.briefs(user_id);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefs"
  ON public.briefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefs"
  ON public.briefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 3. ANALYSIS_RESULTS TABLE
-- Stores analysis output linked to a brief
CREATE TABLE public.analysis_results (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_id        uuid REFERENCES public.briefs(id) ON DELETE SET NULL,
  law_sections    jsonb DEFAULT '[]'::jsonb,
  case_histories  jsonb DEFAULT '[]'::jsonb,
  analysis        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_analysis_user_id ON public.analysis_results(user_id);
CREATE INDEX idx_analysis_brief_id ON public.analysis_results(brief_id);

ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis"
  ON public.analysis_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis"
  ON public.analysis_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 4. STORAGE BUCKET (for user file uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_files', 'user_files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user_files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user_files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
