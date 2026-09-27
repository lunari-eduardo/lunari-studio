import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Galeria } from '@/hooks/useSupabaseGalleries';
import { getEffectiveGalleryStatus } from '@/lib/galleryStatus';
import { getDisplayUrl } from '@/lib/photoUrl';
import { GaleriaItem, GaleriasResumo } from './types';

export function useClienteGalerias(clienteId: string) {
  const [galeriasRaw, setGaleriasRaw] = useState<Galeria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGalerias = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Buscar sessões do cliente para fallback de session_id
      const { data: sessoes } = await supabase
        .from('clientes_sessoes')
        .select('id, session_id')
        .eq('cliente_id', clienteId);

      const sessionIds = (sessoes || [])
        .flatMap(s => [s.id, s.session_id])
        .filter(Boolean);

      // 2. Buscar galerias vinculadas por cliente_id ou session_id
      let query = supabase
        .from('galerias')
        .select('*');

      if (sessionIds.length > 0) {
        query = query.or(`cliente_id.eq.${clienteId},session_id.in.(${sessionIds.join(',')})`);
      } else {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const parsed: Galeria[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          clienteId: row.cliente_id,
          status: row.status,
          statusPagamento: row.status_pagamento,
          fotosIncluidas: row.fotos_incluidas || 0,
          valorFotoExtra: Number(row.valor_foto_extra) || 0,
          regrasSelecao: row.regras_selecao,
          prazoSelecaoDias: row.prazo_selecao_dias,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          publishedAt: row.published_at ? new Date(row.published_at) : null,
          finalizedAt: row.finalized_at ? new Date(row.finalized_at) : null,
          sessionId: row.session_id,
          orcamentoId: row.orcamento_id,
          permissao: row.permissao || 'private',
          nomeSessao: row.nome_sessao,
          nomePacote: row.nome_pacote,
          mensagemBoasVindas: row.mensagem_boas_vindas,
          configuracoes: row.configuracoes || {},
          totalFotos: row.total_fotos || 0,
          fotosSelecionadas: row.fotos_selecionadas || 0,
          valorExtras: Number(row.valor_extras) || 0,
          valorTotalVendido: Number(row.valor_total_vendido) || 0,
          totalFotosExtrasVendidas: Number(row.total_fotos_extras_vendidas) || 0,
          statusSelecao: row.status_selecao || 'em_andamento',
          prazoSelecao: row.prazo_selecao ? new Date(row.prazo_selecao) : null,
          enviadoEm: row.enviado_em ? new Date(row.enviado_em) : null,
          clienteNome: row.cliente_nome,
          clienteEmail: row.cliente_email,
          clienteTelefone: row.cliente_telefone || null,
          publicToken: row.public_token || null,
          galleryPassword: row.gallery_password || null,
          regrasCongeladas: row.regras_congeladas,
          regrasOverride: row.regras_override ?? false,
          tipo: row.tipo === 'entrega' ? 'entrega' : 'selecao',
          firstPhotoKey: row.first_photo_storage_key || null,
          coverPhotoKey: row.cover_storage_key || null,
          themeId: row.theme_id,
          useCustomTheme: row.use_custom_theme ?? false,
          themeOverrides: row.theme_overrides ?? {},
          coverId: row.cover_id ?? null,
          expiresAt: row.expires_at ? new Date(row.expires_at) : null,
          vendaModo: row.venda_modo ?? null,
          vendaPagamentoProvedor: row.venda_pagamento_provedor ?? null,
          vendaTipoCobranca: row.venda_tipo_cobranca ?? null,
        }));

        setGaleriasRaw(parsed);
      }
    } catch (error) {
      console.error('Erro ao buscar galerias do cliente:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchGalerias();

    const channel = supabase
      .channel(`client-galleries-tab-${clienteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'galerias',
          filter: `cliente_id=eq.${clienteId}`,
        },
        () => {
          fetchGalerias();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clienteId, fetchGalerias]);

  // Lista formatada e limpa
  const items: GaleriaItem[] = useMemo(() => {
    return galeriasRaw.map(g => {
      const selected = Number(g.fotosSelecionadas) || 0;
      const included = Number(g.fotosIncluidas) || 0;
      const extraCount = Math.max(0, selected - included);
      const thumbnailKey = g.firstPhotoKey || g.coverPhotoKey;
      const thumbnailUrl = thumbnailKey ? getDisplayUrl(thumbnailKey) : undefined;
      const status = g.status === 'archived' 
        ? 'Excluída / Arquivada' 
        : getEffectiveGalleryStatus(
            g.status,
            g.statusPagamento,
            g.finalizedAt,
            g.statusSelecao,
            g.prazoSelecao,
            g.tipo
          );

      return {
        id: g.id,
        sessionName: g.nomeSessao || 'Sessão sem nome',
        packageName: g.nomePacote || '',
        tipo: g.tipo,
        status,
        statusSelecao: g.statusSelecao || 'em_andamento',
        statusPagamento: g.statusPagamento,
        selectedCount: selected,
        includedPhotos: included,
        extraCount,
        valorExtras: Number(g.valorExtras) || 0,
        valorTotalVendido: Number(g.valorTotalVendido) || 0,
        publicToken: g.publicToken,
        thumbnailUrl,
        raw: g,
      };
    });
  }, [galeriasRaw]);

  // Mini-KPIs consolidados
  const resumo: GaleriasResumo = useMemo(() => {
    const totalGalerias = items.length;
    const selecaoItems = items.filter(g => g.tipo !== 'entrega');

    const totalFotosSelecionadas = selecaoItems.reduce((sum, g) => sum + g.selectedCount, 0);
    const totalFotosExtras = selecaoItems.reduce((sum, g) => {
      const vendidas = Number(g.raw.totalFotosExtrasVendidas) || 0;
      return sum + (vendidas > 0 ? vendidas : g.extraCount);
    }, 0);

    const faturamentoExtrasTotal = selecaoItems.reduce((sum, g) => {
      const vendido = g.valorTotalVendido || 0;
      return sum + (vendido > 0 ? vendido : g.valorExtras || 0);
    }, 0);

    return {
      totalGalerias,
      totalFotosSelecionadas,
      totalFotosExtras,
      faturamentoExtrasTotal,
    };
  }, [items]);

  return {
    galeriasRaw,
    items,
    resumo,
    isLoading,
    fetchGalerias,
  };
}
