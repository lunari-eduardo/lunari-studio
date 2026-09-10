import { EventHandlerContext } from '../types.ts';
import {
  jsonResponse,
  alreadySent,
  upsertLog,
  escapeHtml,
  getPhotographerReplyTo,
  formatDateOnly,
  formatCurrency,
  replaceTemplateVariables,
  canUserSendAutomatedEmail,
  GALLERY_BASE_URL,
} from '../helpers.ts';
import { sendResendEmail } from '../resendClient.ts';
import {
  buildPhotographerSelectionEmail,
  buildClientSelectionConfirmedEmail,
  formatLongDateTime,
} from '../templates/selectionEmails.ts';

export async function handleSelectionConfirmed(ctx: EventHandlerContext): Promise<Response> {
  const { supabase, callerUserId, body } = ctx;

  if (!body.galleryId) {
    return jsonResponse({ success: false, status: 'erro', message: 'Galeria não informada' }, 400);
  }

  // 1. Carrega dados da galeria (incluindo configuracoes para verificar permissão de download)
  const { data: gallery, error: galleryError } = await supabase
    .from('galerias')
    .select('id, user_id, cliente_id, cliente_nome, cliente_email, nome_sessao, permissao, public_token, prazo_selecao, total_fotos, fotos_incluidas, fotos_selecionadas, total_fotos_extras_vendidas, valor_foto_extra, valor_extras, finalized_at, configuracoes')
    .eq('id', body.galleryId)
    .maybeSingle();

  if (galleryError || !gallery) {
    return jsonResponse({ success: false, status: 'erro', message: 'Galeria não encontrada' }, 404);
  }

  if (callerUserId !== 'service-role' && callerUserId !== gallery.user_id) {
    return jsonResponse({ success: false, status: 'erro', message: 'Sem permissão para esta galeria' }, 403);
  }

  // 2. Extrai dados do cliente ou visitante
  let clienteNome = gallery.cliente_nome || 'Cliente';
  let clienteEmail = gallery.cliente_email || null;

  if (body.visitorId) {
    const { data: visitor } = await supabase
      .from('galeria_visitantes')
      .select('nome, email, fotos_selecionadas, finalized_at')
      .eq('id', body.visitorId)
      .maybeSingle();
    if (visitor) {
      if (visitor.nome) clienteNome = visitor.nome;
      if (visitor.email) clienteEmail = visitor.email;
    }
  }

  // 3. Verifica configurações da galeria para permissão de download
  const configuracoes = (gallery.configuracoes && typeof gallery.configuracoes === 'object')
    ? (gallery.configuracoes as Record<string, any>)
    : {};
  const allowDownload = Boolean(configuracoes.allowDownload);

  // 4. Idempotência para o envio do cliente
  const finalKey = gallery.finalized_at || new Date().toISOString().slice(0, 16);
  const idempotencyKey = `selection_confirmed:${gallery.id}:${body.visitorId || 'owner'}:${finalKey}`;
  const sent = await alreadySent(supabase, idempotencyKey);
  if (sent) {
    return jsonResponse({
      success: true,
      status: 'ignorado',
      message: 'E-mail de confirmação de seleção já enviado.',
      logId: sent.id,
    });
  }

  // 5. Configurações gerais e dados do fotógrafo
  const [{ data: settings }, { data: ownerProfile }] = await Promise.all([
    supabase
      .from('gallery_settings')
      .select('*')
      .eq('user_id', gallery.user_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('nome, empresa, logo_url, email')
      .eq('user_id', gallery.user_id)
      .maybeSingle(),
  ]);

  const baseLog = {
    user_id: gallery.user_id,
    cliente_id: gallery.cliente_id || null,
    cliente_nome: clienteNome,
    cliente_email: clienteEmail,
    event_type: 'selection_confirmed',
    gallery_id: gallery.id,
    payment_id: null,
    idempotency_key: idempotencyKey,
    metadata: { source: 'selection_confirmed', visitorId: body.visitorId || null, allowDownload },
    updated_at: new Date().toISOString(),
  };

  const studioCandidate = (settings?.studio_name || '').trim();
  const companyCandidate = (ownerProfile?.empresa || '').trim();
  const nameCandidate = (ownerProfile?.nome || '').trim();
  const studioName = (studioCandidate && studioCandidate !== 'Meu Estúdio')
    ? studioCandidate
    : (companyCandidate || nameCandidate || 'Estúdio');
  const studioLogoUrl = settings?.studio_logo_url || ownerProfile?.logo_url || null;

  const replyTo = await getPhotographerReplyTo(supabase, gallery.user_id);
  const token = body.publicToken || gallery.public_token;
  const galleryUrl = token ? `${GALLERY_BASE_URL}/g/${encodeURIComponent(token)}` : undefined;
  const dashboardUrl = `${GALLERY_BASE_URL}/app/gallery/select/${gallery.id}`;

  const formattedDateTime = formatLongDateTime(gallery.finalized_at || new Date());
  const selectedCount = Number(gallery.fotos_selecionadas || 0);
  const totalCount = Number(gallery.total_fotos || 0);
  const percentSelected = totalCount > 0 ? Math.round((selectedCount / totalCount) * 100) : 0;

  // 6. Template customizado pelo fotógrafo (se houver)
  const { data: template } = await supabase
    .from('gallery_email_templates')
    .select('subject, body')
    .eq('user_id', gallery.user_id)
    .eq('type', 'selection_confirmed')
    .maybeSingle();

  const variables = {
    cliente: clienteNome,
    galeria: gallery.nome_sessao || 'Galeria',
    prazo: formatDateOnly(gallery.prazo_selecao),
    link: galleryUrl || '',
    estudio: studioName,
    total_fotos: String(selectedCount),
    fotos_extras: String(gallery.total_fotos_extras_vendidas || 0),
    valor_extra: formatCurrency(gallery.valor_extras || 0),
  };

  // Se o fotógrafo personalizou o corpo do e-mail, processa o texto para o slot do template
  let customBodyText: string | null = null;
  if (template?.body) {
    let clean = replaceTemplateVariables(template.body, variables).trim();
    // Remove saudações redundantes do início e assinaturas redundantes do final para harmonizar com a casca visual
    clean = clean.replace(/^Olá\s+[^!\n]+[!\.]?\s*/i, '').trim();
    clean = clean.replace(/Com carinho,?\s*.*$/is, '').trim();
    if (clean.length > 0) {
      customBodyText = clean;
    }
  }

  const defaultSubject = allowDownload
    ? `Suas fotos estão prontas! - ${gallery.nome_sessao || 'Galeria'}`
    : `Seleção confirmada! - ${gallery.nome_sessao || 'Galeria'}`;
  const subject = template?.subject ? replaceTemplateVariables(template.subject, variables) : defaultSubject;

  // 7. ENVIO PARA O CLIENTE
  let clientLogId: string | null = null;
  const canSendAutomated = await canUserSendAutomatedEmail(supabase, gallery.user_id);
  const clientSendingEnabled = canSendAutomated && settings?.email_sending_enabled === true && settings?.email_on_selection_confirmed === true;

  if (clientSendingEnabled && clienteEmail) {
    try {
      const clientHtml = buildClientSelectionConfirmedEmail({
        allowDownload,
        clienteNome,
        galleryName: gallery.nome_sessao || 'Galeria',
        selectedPhotosCount: selectedCount,
        formattedDateTime,
        studioName,
        studioLogoUrl,
        galleryUrl: allowDownload ? galleryUrl : undefined,
        customBodyText,
      });

      const resendMessageId = await sendResendEmail(clienteEmail, subject, clientHtml, {
        replyTo,
        fromName: studioName,
      });

      clientLogId = await upsertLog(supabase, {
        ...baseLog,
        status: 'enviado',
        subject,
        resend_message_id: resendMessageId,
        friendly_message: allowDownload
          ? 'E-mail de fotos prontas (download liberado) enviado'
          : 'E-mail de confirmação de seleção (sem download) enviado',
        metadata: {
          ...baseLog.metadata,
          replyToConfigured: Boolean(replyTo),
          fromName: studioName,
          allowDownload,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const friendly = errorMessage === 'RESEND_API_KEY_MISSING'
        ? 'Configuração do Resend ausente'
        : 'Falha ao enviar pelo provedor';
      await upsertLog(supabase, {
        ...baseLog,
        status: 'erro',
        subject,
        friendly_message: friendly,
        error_message: errorMessage,
        metadata: { ...baseLog.metadata, replyToConfigured: Boolean(replyTo) },
      });
    }
  } else {
    await upsertLog(supabase, {
      ...baseLog,
      status: 'ignorado',
      friendly_message: !clienteEmail
        ? 'Cliente sem e-mail cadastrado'
        : 'Envio de confirmação de seleção desativado',
    });
  }

  // 8. ENVIO PARA O FOTÓGRAFO (Resumo Operacional Lunari - Sem Previews, Sem PDF)
  if (settings?.email_summary_to_photographer !== false) {
    const photogEmail = ownerProfile?.email || replyTo;
    if (photogEmail) {
      try {
        const photogIdempotencyKey = `summary_sent:${gallery.id}:${finalKey}`;
        const sentSummary = await alreadySent(supabase, photogIdempotencyKey);
        if (!sentSummary) {
          const photogSubject = `Seleção finalizada: ${clienteNome} - ${gallery.nome_sessao || 'Galeria'}`;
          
          const photogHtml = buildPhotographerSelectionEmail({
            photographerName: nameCandidate || 'Fotógrafo',
            clienteNome,
            galleryName: gallery.nome_sessao || 'Galeria',
            selectedPhotosCount: selectedCount,
            totalPhotosCount: totalCount,
            percentSelected,
            formattedDateTime,
            dashboardUrl,
          });

          const resendMessageId = await sendResendEmail(photogEmail, photogSubject, photogHtml, {
            fromName: 'Lunari',
          });

          await upsertLog(supabase, {
            ...baseLog,
            event_type: 'summary_sent',
            idempotency_key: photogIdempotencyKey,
            status: 'enviado',
            subject: photogSubject,
            resend_message_id: resendMessageId,
            friendly_message: 'Notificação operacional de seleção finalizada enviada ao fotógrafo',
            metadata: {
              ...baseLog.metadata,
              target: photogEmail,
              selectedPhotosCount: selectedCount,
              totalPhotosCount: totalCount,
            },
          });
        }
      } catch (err) {
        console.error('Erro ao enviar resumo para o fotógrafo:', err);
      }
    }
  }

  return jsonResponse({
    success: true,
    status: 'processado',
    message: 'Processamento de seleção confirmada concluído.',
    logId: clientLogId,
  });
}
