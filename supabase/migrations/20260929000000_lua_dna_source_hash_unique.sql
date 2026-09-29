-- Adiciona constraint UNIQUE para garantir que a mesma conversa com as mesmas mensagens
-- não seja processada mais de uma vez pelo DNA da Lua
ALTER TABLE public.lua_dna_sources
ADD CONSTRAINT lua_dna_sources_source_hash_unique UNIQUE (user_id, source_hash);
