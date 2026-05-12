-- ═══════════════════════════════════════════════════════════════════
-- LexAssist — Migration 007: Case Documents Table  (idempotent)
-- Run in Supabase Dashboard > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════════════

-- 1. CREATE case_documents TABLE — stores document metadata linked to cases
CREATE TABLE IF NOT EXISTS public.case_documents (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id       uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_id      uuid REFERENCES public.briefs(id) ON DELETE SET NULL,
  
  filename      text NOT NULL,
  file_size_bytes bigint,
  mime_type     text,
  
  -- OCR & extraction results
  extracted_text text,
  is_ocr        boolean DEFAULT false,
  
  -- Classification (from DocumentService)
  document_type text,                    -- 'petition', 'affidavit', 'contract', 'judgment', etc.
  document_title text,
  classification jsonb,                  -- Full classification result from DocumentService
  
  -- Metadata
  language      text DEFAULT 'en',       -- IETF language code
  metadata      jsonb DEFAULT '{}'::jsonb, -- Additional metadata (pages, word_count, etc.)
  
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON public.case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_user_id ON public.case_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_brief_id ON public.case_documents(brief_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_type ON public.case_documents(document_type);

ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

-- Users can read/insert/update/delete their own case documents
CREATE POLICY "case_documents_select_own"
  ON public.case_documents FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "case_documents_insert_own"
  ON public.case_documents FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "case_documents_update_own"
  ON public.case_documents FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "case_documents_delete_own"
  ON public.case_documents FOR DELETE
  USING (user_id = (select auth.uid()));

-- Service role can do everything (backend uses service key)
CREATE POLICY "case_documents_service_all"
  ON public.case_documents FOR ALL
  USING (true)
  WITH CHECK (true);


-- 2. Auto-update updated_at on case_documents
CREATE OR REPLACE FUNCTION public.update_case_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_case_documents_updated_at ON public.case_documents;
CREATE TRIGGER trigger_case_documents_updated_at
  BEFORE UPDATE ON public.case_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_case_documents_updated_at();

