import { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Bindings } from '../index.js';

export async function getAgendaOnlineSlotsRoute(c: Context<{ Bindings: Bindings }>) {
  try {
    const slug = c.req.param('slug');
    if (!slug) {
      return c.json({ success: false, error: 'Slug é obrigatório' }, 400);
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch Link Data
    const { data: linkData, error: linkError } = await supabase
      .from('agenda_online_links')
      .select(`
        id,
        user_id,
        title,
        description,
        availability_type_id,
        categoria_id,
        pacotes_permitidos,
        require_deposit,
        deposit_type,
        deposit_value,
        is_active
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (linkError || !linkData) {
      return c.json({ success: false, error: 'Página de agendamento não encontrada ou inativa' }, 404);
    }

    // 1b. Bloquear se o tipo for Ocupado
    if (linkData.availability_type_id) {
      const { data: availType } = await supabase
        .from('availability_types')
        .select('name')
        .eq('id', linkData.availability_type_id)
        .maybeSingle();

      if (availType && availType.name.trim().toLowerCase() === 'ocupado') {
        return c.json({ success: false, error: 'Tipo de disponibilidade inválido para agendamento online' }, 400);
      }
    }

    // 2. Fetch Photographer Profile (apenas nome fantasia / empresa)
    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa, avatar_url, logo_url')
      .eq('user_id', linkData.user_id)
      .maybeSingle();

    // 3. Fetch Packages
    // pacotes_permitidos é um JSON array de IDs
    let pacotes: any[] = [];
    if (Array.isArray(linkData.pacotes_permitidos) && linkData.pacotes_permitidos.length > 0) {
      const { data: pkgs, error: pkgsError } = await supabase
        .from('pacotes')
        .select('id, nome, valor_base, duracao_minutos, fotos_incluidas')
        .in('id', linkData.pacotes_permitidos)
        .eq('user_id', linkData.user_id);
      if (pkgsError) {
        console.error('Error fetching pacotes:', pkgsError);
      }
      pacotes = pkgs || [];
    }

    // Se nenhum pacote válido sobrar, o link está quebrado comercialmente
    if (pacotes.length === 0) {
       return c.json({ success: false, error: 'Nenhum pacote disponível neste agendamento' }, 400);
    }

    // Limpar reservas expiradas antes de calcular a disponibilidade
    await supabase.rpc('cleanup_expired_online_reservations');

    // 4. Fetch Slots for this availability_type_id
    // Pegar slots a partir de hoje
    const today = new Date().toISOString().split('T')[0];
    const { data: rawSlots } = await supabase
      .from('availability_slots')
      .select('id, date, start_time, end_time')
      .eq('user_id', linkData.user_id)
      .eq('availability_type_id', linkData.availability_type_id)
      .gte('date', today);

    // 5. Filtrar conflitos
    // Precisamos buscar agendamentos (a confirmar e confirmados) E reservas temporárias ativas
    const { data: appointments } = await supabase
      .from('appointments')
      .select('date, time')
      .eq('user_id', linkData.user_id)
      .gte('date', today)
      .in('status', ['a confirmar', 'confirmado']);

    const { data: tempReservations } = await supabase
      .from('agenda_reservas_temp')
      .select('date, start_time')
      .eq('user_id', linkData.user_id)
      .eq('status', 'pendente')
      .gte('date', today)
      .gt('expires_at', new Date().toISOString());

    const occupiedSet = new Set<string>();
    
    appointments?.forEach(app => {
      occupiedSet.add(`${app.date}T${app.time}`);
    });
    
    tempReservations?.forEach(res => {
      occupiedSet.add(`${res.date}T${res.start_time}`);
    });

    // 6. Montar a disponibilidade real
    const availableSlots = (rawSlots || [])
      .filter(slot => !occupiedSet.has(`${slot.date}T${slot.start_time}`))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });

    // Agrupar por data para o frontend
    const slotsByDate: Record<string, { start_time: string, end_time: string }[]> = {};
    availableSlots.forEach(slot => {
      if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
      slotsByDate[slot.date].push({
        start_time: slot.start_time,
        end_time: slot.end_time
      });
    });

    return c.json({
      success: true,
      data: {
        link: {
          id: linkData.id,
          userId: linkData.user_id,
          title: linkData.title,
          description: linkData.description,
          requireDeposit: linkData.require_deposit,
          depositType: linkData.deposit_type,
          depositValue: linkData.deposit_value
        },
        photographer: profile,
        packages: pacotes,
        slotsByDate
      }
    });

  } catch (err: any) {
    console.error('Error in getAgendaOnlineSlotsRoute:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
}
