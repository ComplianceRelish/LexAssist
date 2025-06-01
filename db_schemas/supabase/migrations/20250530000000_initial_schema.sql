-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table is handled by Supabase Auth
-- Extended profiles table for additional user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Subscriptions table for user subscription management
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'trialing', 'past_due', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Legal domains reference table
CREATE TABLE public.legal_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES public.legal_domains(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Jurisdictions reference table
CREATE TABLE public.jurisdictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('international', 'national', 'state', 'local')),
    parent_id UUID REFERENCES public.jurisdictions(id),
    country TEXT,
    state TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Legal sources (courts, authorities, etc.)
CREATE TABLE public.legal_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    jurisdiction_id UUID REFERENCES public.jurisdictions(id),
    weight INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client management
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Case management
CREATE TABLE public.cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    client_id UUID REFERENCES public.clients(id),
    title TEXT NOT NULL,
    case_number TEXT,
    jurisdiction_id UUID REFERENCES public.jurisdictions(id),
    legal_domain_id UUID REFERENCES public.legal_domains(id),
    status TEXT NOT NULL DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Case diary entries
CREATE TABLE public.case_diary_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES public.cases(id),
    entry_text TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documents table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    case_id UUID REFERENCES public.cases(id),
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    jurisdiction_id UUID REFERENCES public.jurisdictions(id),
    legal_domain_id UUID REFERENCES public.legal_domains(id),
    file_path TEXT,
    content TEXT,
    citation TEXT,
    source_id UUID REFERENCES public.legal_sources(id),
    published_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document chunks for vector search
CREATE TABLE public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id),
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Citations table tracking references between documents
CREATE TABLE public.citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id UUID NOT NULL REFERENCES public.documents(id),
    target_document_id UUID NOT NULL REFERENCES public.documents(id),
    citation_text TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(source_document_id, target_document_id, citation_text)
);

-- User search history
CREATE TABLE public.search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    query TEXT NOT NULL,
    legal_domain_id UUID REFERENCES public.legal_domains(id),
    jurisdiction_id UUID REFERENCES public.jurisdictions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User activity tracking
CREATE TABLE public.user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    activity_type TEXT NOT NULL,
    activity_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can view own subscriptions" 
ON public.subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own clients" 
ON public.clients FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own clients" 
ON public.clients FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own cases" 
ON public.cases FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cases" 
ON public.cases FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own case diary entries" 
ON public.case_diary_entries FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_diary_entries.case_id 
    AND cases.user_id = auth.uid()
));

CREATE POLICY "Users can manage own case diary entries" 
ON public.case_diary_entries FOR ALL 
USING (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_diary_entries.case_id 
    AND cases.user_id = auth.uid()
));

CREATE POLICY "Users can view own documents" 
ON public.documents FOR SELECT 
USING (auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = documents.case_id 
        AND cases.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage own documents" 
ON public.documents FOR ALL 
USING (auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.cases 
        WHERE cases.id = documents.case_id 
        AND cases.user_id = auth.uid()
    )
);

CREATE POLICY "Users can view chunks of own documents" 
ON public.document_chunks FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_chunks.document_id 
    AND (documents.user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.cases 
            WHERE cases.id = documents.case_id 
            AND cases.user_id = auth.uid()
        )
    )
));

CREATE POLICY "Users can view own search history" 
ON public.search_history FOR SELECT 
USING (auth.uid() = user_id);
