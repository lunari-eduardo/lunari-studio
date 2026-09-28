import { Context } from 'hono';
import { Bindings } from '../index.js';
import { createClient } from '@supabase/supabase-js';

// Esse endpoint será chamado via Webhook do Supabase sempre que um novo registro 
// for inserido em `lua_dna_sources` com status 'pending'.
export const luaProcessSourceRoute = async (c: Context<{ Bindings: Bindings }>) => {
  const body = await c.req.json();
  const { record, type } = body;

  if (type !== 'INSERT' || !record || record.status !== 'pending') {
    return c.json({ message: 'Ignorado. Apenas inserts pendentes são processados.' });
  }

  const sourceId = record.id;
  const userId = record.user_id;
  
  // Como as operações de IA demoram, passamos para o background usando waitUntil
  // Assim a resposta do webhook é rápida e o processamento ocorre assincronamente.
  c.executionCtx.waitUntil(processLuaDnaSource(c.env, sourceId, userId, record));

  return c.json({ message: 'Processamento enfileirado.', sourceId });
};

async function processLuaDnaSource(env: Bindings, sourceId: string, userId: string, record: any) {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // 1. Marcar como processing
    await supabase.from('lua_dna_sources')
      .update({ status: 'processing' })
      .eq('id', sourceId);

    const snapshot = record.snapshot;
    const messages = snapshot.messages || [];

    // 2. Extrair mídias (Transcrições / OCR) - Simulação de processamento assíncrono para Fase 4
    for (const msg of messages) {
      if (msg.type === 'audio' && msg.media_url) {
        await supabase.from('lua_dna_artifacts').insert({
          source_id: sourceId,
          message_id: msg.id,
          kind: 'audio_transcription',
          content: null, 
          extraction_status: 'completed', // Na Fase 5 isso usará Whisper/AI real
          metadata: { note: 'Processamento de fila concluído (mock de transcrição)' }
        });
      } else if ((msg.type === 'image' || msg.type === 'document') && msg.media_url) {
         await supabase.from('lua_dna_artifacts').insert({
          source_id: sourceId,
          message_id: msg.id,
          kind: msg.type === 'image' ? 'image_ocr' : 'document_ocr',
          content: null,
          extraction_status: 'completed',
          metadata: { note: 'Processamento de fila concluído (mock OCR)' }
        });
      }
    }

    // 3. Obter perfil atual
    const { data: profile } = await supabase.from('lua_dna_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    const currentVersion = profile ? profile.version : 0;
    const nextVersion = currentVersion + 1;

    let learningMetrics = profile ? profile.learning_metrics : { conversas_analisadas: 0 };
    learningMetrics.conversas_analisadas += 1;
    
    // 4. Síntese Incremental do DNA 
    // Na fase 5 isso mandaria todo o contexto para a IA gerar o Voice Summary.
    const newSummary = profile 
        ? profile.voice_summary 
        : 'Tom de voz formal e empático. (Gerado pela primeira análise)';

    // Arquivar perfil antigo
    if (profile) {
       await supabase.from('lua_dna_profiles')
         .update({ status: 'archived' })
         .eq('id', profile.id);
    }

    // Criar novo perfil ativo (Versionamento)
    const { data: newProfile, error: profileErr } = await supabase.from('lua_dna_profiles')
      .insert({
        user_id: userId,
        version: nextVersion,
        status: 'active',
        voice_summary: newSummary,
        learning_metrics: learningMetrics,
        attributes: profile ? profile.attributes : { formalidade: 'Média', estilo: 'Direto' },
        derived_from: profile ? [...profile.derived_from, sourceId] : [sourceId]
      })
      .select()
      .single();

    if (profileErr) throw profileErr;

    // 5. Marcar source como completada
    await supabase.from('lua_dna_sources')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', sourceId);

    // 6. Registrar Auditoria
    await supabase.from('lua_generation_audit').insert({
      user_id: userId,
      chat_id: record.chat_id,
      dna_version: nextVersion,
      model: 'system-queue',
      status: 'success',
      latency_ms: 0
    });

  } catch (error: any) {
    console.error(`Erro ao processar DNA source ${sourceId}:`, error);
    await supabase.from('lua_dna_sources')
      .update({ 
        status: 'failed', 
        error_details: error.message || 'Unknown error' 
      })
      .eq('id', sourceId);
  }
}
