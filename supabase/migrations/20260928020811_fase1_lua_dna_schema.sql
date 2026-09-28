-- Migration para Fase 1: Estrutura do DNA da Lua
-- Criação das tabelas base, índices e políticas de Row Level Security (RLS)

-- 1. lua_dna_profiles
CREATE TABLE public.lua_dna_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    voice_summary TEXT,
    learning_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    derived_from JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lua_dna_profiles_user ON public.lua_dna_profiles(user_id);

CREATE TRIGGER update_lua_dna_profiles_updated_at
  BEFORE UPDATE ON public.lua_dna_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. lua_dna_sources
CREATE TABLE public.lua_dna_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retention_until TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    error_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lua_dna_sources_user ON public.lua_dna_sources(user_id);
CREATE INDEX idx_lua_dna_sources_retention ON public.lua_dna_sources(retention_until);

CREATE TRIGGER update_lua_dna_sources_updated_at
  BEFORE UPDATE ON public.lua_dna_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. lua_dna_artifacts
CREATE TABLE public.lua_dna_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.lua_dna_sources(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('audio_transcription', 'image_ocr', 'document_ocr')),
    content TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_hash TEXT,
    extraction_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lua_dna_artifacts_source ON public.lua_dna_artifacts(source_id);

-- 4. lua_studio_knowledge
CREATE TABLE public.lua_studio_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    hours TEXT,
    policies TEXT,
    services TEXT,
    pix_reference TEXT,
    websites TEXT,
    socials TEXT,
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lua_studio_knowledge_user ON public.lua_studio_knowledge(user_id);

CREATE TRIGGER update_lua_studio_knowledge_updated_at
  BEFORE UPDATE ON public.lua_studio_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. lua_generation_audit
CREATE TABLE public.lua_generation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id TEXT,
    dna_version INTEGER,
    context_hash TEXT,
    output_hash TEXT,
    model TEXT NOT NULL,
    latency_ms INTEGER,
    tokens_usage JSONB,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lua_generation_audit_user ON public.lua_generation_audit(user_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.lua_dna_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lua_dna_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lua_dna_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lua_studio_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lua_generation_audit ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (Somente o owner/user_id tem acesso)
CREATE POLICY "Lua profiles: user isolation" ON public.lua_dna_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Lua sources: user isolation" ON public.lua_dna_sources FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Lua artifacts: user isolation" ON public.lua_dna_artifacts FOR ALL USING (
    source_id IN (SELECT id FROM public.lua_dna_sources WHERE user_id = auth.uid())
);
CREATE POLICY "Lua knowledge: user isolation" ON public.lua_studio_knowledge FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Lua audit: user isolation" ON public.lua_generation_audit FOR ALL USING (auth.uid() = user_id);
