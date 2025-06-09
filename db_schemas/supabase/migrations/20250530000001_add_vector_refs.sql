-- Add vector_id column to document_chunks table
ALTER TABLE public.document_chunks 
ADD COLUMN vector_id TEXT;

-- Add embedding status column
ALTER TABLE public.documents
ADD COLUMN embedding_status TEXT DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add table to track vector database references
CREATE TABLE public.vector_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id),
    chunk_id UUID REFERENCES public.document_chunks(id),
    vector_id TEXT NOT NULL,
    database_name TEXT NOT NULL DEFAULT 'pinecone',
    index_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.vector_references ENABLE ROW LEVEL SECURITY;

-- Create policy for vector_references
CREATE POLICY "Users can view own vector references" 
ON public.vector_references FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = vector_references.document_id 
    AND (documents.user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    )
));
