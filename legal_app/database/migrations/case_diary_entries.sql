-- Case Diary Entries Table
-- This table stores diary entries for legal cases with AI analysis support
CREATE TABLE IF NOT EXISTS case_diary_entries (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_text TEXT NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'update',
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    ai_analysis JSONB,
    ai_status TEXT DEFAULT 'pending',
    ai_error TEXT
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS case_diary_entries_case_id_idx ON case_diary_entries (case_id);
CREATE INDEX IF NOT EXISTS case_diary_entries_user_id_idx ON case_diary_entries (user_id);
CREATE INDEX IF NOT EXISTS case_diary_entries_entry_date_idx ON case_diary_entries (entry_date);

-- Row-level security policies
ALTER TABLE case_diary_entries ENABLE ROW LEVEL SECURITY;

-- Policy for select - users can only view their own entries
CREATE POLICY case_diary_entries_select_policy 
    ON case_diary_entries 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy for insert - users can only create their own entries
CREATE POLICY case_diary_entries_insert_policy 
    ON case_diary_entries 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy for update - users can only update their own entries
CREATE POLICY case_diary_entries_update_policy 
    ON case_diary_entries 
    FOR UPDATE 
    USING (auth.uid() = user_id);

-- Policy for delete - users can only delete their own entries
CREATE POLICY case_diary_entries_delete_policy 
    ON case_diary_entries 
    FOR DELETE 
    USING (auth.uid() = user_id);
