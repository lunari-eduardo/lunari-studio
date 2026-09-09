import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function lookupAgendaOnlineClientRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const slug = c.req.param('slug');
    const phone = c.req.query('phone');
    const email = c.req.query('email');

    if (!slug) {
      return c.json({ success: false, error: 'Slug é obrigatório' }, 400);
    }

    const cleanPhone = (phone || '').replace(/\D/g, '');
    const cleanEmail = (email || '').trim().toLowerCase();

    // Se nenhum contato com tamanho mínimo foi informado, retorna found: false
    const hasValidPhone = cleanPhone.length >= 10;
    const hasValidEmail = cleanEmail.length >= 5 && cleanEmail.includes('@');

    if (!hasValidPhone && !hasValidEmail) {
      return c.json({ success: true, found: false });
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Obter o user_id dono do link
    const { data: linkData, error: linkError } = await supabase
      .from('agenda_online_links')
      .select('id, user_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (linkError || !linkData) {
      return c.json({ success: false, error: 'Link não encontrado ou inativo' }, 404);
    }

    // 2. Montar filtros de busca por telefone ou email dentro do estúdio
    const conditions: string[] = [];
    if (hasValidPhone) {
      conditions.push(`telefone.eq.${cleanPhone}`);
      conditions.push(`whatsapp.eq.${cleanPhone}`);
    }
    if (hasValidEmail) {
      conditions.push(`email.ilike.${cleanEmail}`);
    }

    const { data: client, error: clientError } = await supabase
      .from('clientes')
      .select('id, nome, email, telefone, whatsapp, cpf_cnpj')
      .eq('user_id', linkData.user_id)
      .or(conditions.join(','))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clientError) {
      console.error('Error looking up client in CRM:', clientError);
      return c.json({ success: true, found: false });
    }

    if (!client || !client.nome) {
      return c.json({ success: true, found: false });
    }

    return c.json({
      success: true,
      found: true,
      client: {
        id: client.id,
        nome: client.nome,
        email: client.email || '',
        telefone: client.whatsapp || client.telefone || '',
        cpf_cnpj: client.cpf_cnpj || null,
      },
    });
  } catch (err: any) {
    console.error('Error in lookupAgendaOnlineClientRoute:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
}
