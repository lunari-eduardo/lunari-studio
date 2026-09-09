import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function reserveAgendaOnlineSlotRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const slug = c.req.param('slug');
    const body = await c.req.json();
    const { date, startTime, pacoteId, clienteData } = body;

    if (!slug || !date || !startTime || !pacoteId || !clienteData) {
      return c.json({ success: false, error: 'Dados incompletos' }, 400);
    }

    if (!clienteData.nome || !clienteData.telefone || !clienteData.email) {
      return c.json({ success: false, error: 'Dados do cliente incompletos' }, 400);
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch Link Data
    const { data: linkData, error: linkError } = await supabase
      .from('agenda_online_links')
      .select('id, pacotes_permitidos, require_deposit, deposit_type, deposit_value')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (linkError || !linkData) {
      return c.json({ success: false, error: 'Link não encontrado ou inativo' }, 404);
    }

    if (!Array.isArray(linkData.pacotes_permitidos) || !linkData.pacotes_permitidos.includes(pacoteId)) {
       return c.json({ success: false, error: 'Pacote não permitido para este link' }, 400);
    }

    // 2. Determinar o Valor (via pacotes)
    const { data: pacote } = await supabase
      .from('pacotes')
      .select('valor_base')
      .eq('id', pacoteId)
      .maybeSingle();

    if (!pacote) {
      return c.json({ success: false, error: 'Pacote não encontrado' }, 404);
    }

    const totalAmount = Number(pacote.valor_base) || 0;
    let depositAmount = 0;

    if (linkData.require_deposit) {
       const dVal = Number(linkData.deposit_value) || 0;
       if (linkData.deposit_type === 'percentage') {
          depositAmount = (totalAmount * dVal) / 100;
       } else {
          depositAmount = dVal;
       }

       if (depositAmount <= 0) {
         return c.json({ success: false, error: 'Sinal configurado incorretamente. Valor deve ser maior que 0.' }, 400);
       }
    }

    // 3. Match Cliente Oculto (Evitar duplicação no banco)
    let clienteId = null;
    const { data: matchedClient } = await supabase
      .from('clientes')
      .select('id')
      .or(`email.ilike.${clienteData.email},telefone.ilike.${clienteData.telefone}`)
      .maybeSingle();

    if (matchedClient) {
      clienteId = matchedClient.id;
    }

    const finalClienteData = {
      ...clienteData,
      cliente_id_matched: clienteId
    };

    // Limpar reservas expiradas antes de validar e travar o slot
    await supabase.rpc('cleanup_expired_online_reservations');

    // 4. Executar RPC com PostgreSQL Lock
    const { data: rpcResult, error: rpcError } = await supabase.rpc('reserve_online_slot', {
      p_link_id: linkData.id,
      p_date: date,
      p_start_time: startTime,
      p_pacote_id: pacoteId,
      p_cliente_data: finalClienteData,
      p_deposit_amount: depositAmount,
      p_total_amount: totalAmount
    });

    if (rpcError) {
      console.error('RPC Error:', rpcError);
      return c.json({ success: false, error: rpcError.message || 'Falha ao processar reserva' }, 500);
    }

    if (!rpcResult.success) {
      return c.json({ success: false, error: rpcResult.error }, 409); // Conflict
    }

    return c.json({
      success: true,
      cobrancaId: rpcResult.cobrancaId
    });

  } catch (err: any) {
    console.error('Error in reserveAgendaOnlineSlotRoute:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
}
