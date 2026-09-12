/**
 * Tipos públicos do módulo Conversas.
 * Estes são tipos de domínio (não Database/Supabase).
 *
 * As tabelas reais serão definidas em:
 *   supabase/migrations/<timestamp>_conversas_module.sql
 *
 * Os tipos deatabase serão gerados em:
 *   src/integrations/supabase/types.ts (append das novas tabelas)
 */

// ─── Enumerações ────────────────────────────────────────────────────────────

export type ConversaInstanciaStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export type ChatStatus =
  | 'active'      // em aberto
  | 'archived'    // arquivado pelo usuário
  | 'blocked';    // bloqueado

export type ChatPin = 'pinned' | 'unpinned';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'template';

export type MessageStatus =
  | 'pending'    // inserido localmente, ainda não ACK da Evolution
  | 'sent'       // Evolution recebeu
  | 'delivered'  // WhatsApp entregou ao destinatário
  | 'read'       // destinatário leu
  | 'failed';    // erro no envio

export type ContactType = 'cliente' | 'lead' | 'unknown';

// ─── Entidades de Domínio ───────────────────────────────────────────────────

/** Dados mínimos para identificar uma instância WhatsApp. */
export interface ConversaInstancia {
  id: string;
  user_id: string;
  nome: string;
  phone: string;
  status: ConversaInstanciaStatus;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

/** Contato — pessoa com quem se conversa (separado de Chat por design). */
export interface ConversaContato {
  id: string;
  user_id: string;
  phone_raw: string;          // original digitado/recebido
  phone_normalized: string;   // canônico 55XXXXXXXXXXX (BR)
  nome?: string;
  avatar_url?: string;
  cliente_id?: string;        // vínculo eventual com CRM (não automático)
  lead_id?: string;           // vínculo eventual com Lead
  tipo: ContactType;
  total_conversas: number;
  ultima_mensagem?: string;
  ultima_mensagem_data?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

/** Chat — thread de conversa com um contato. */
export interface ConversaChat {
  id: string;
  user_id: string;
  contato_id: string;
  instance_id: string;
  status: ChatStatus;
  pin: ChatPin;
  mute: boolean;
  unread_count: number;
  // Dados denormalizados do contato (para display sem JOIN)
  contato_nome?: string;
  contato_avatar?: string;
  contato_phone_normalized?: string;
  ultima_mensagem?: string;
  ultima_mensagem_data?: string;
  ultima_mensagem_type?: MessageType;
  ultima_mensagem_direction?: MessageDirection;
  created_at: string;
  updated_at: string;
}

/** Mensagem. */
export interface ConversaMensagem {
  id: string;
  user_id: string;
  chat_id: string;
  instance_id: string;
  evolution_msg_id?: string;   // ID da Evolution API (para idempotência)
  direction: MessageDirection;
  type: MessageType;
  content: string;              // texto ou caption da mídia
  media_url?: string;          // URL CDN (se houver mídia)
  media_mime_type?: string;
  media_size_bytes?: number;
  media_filename?: string;
  status: MessageStatus;
  is_forwarded?: boolean;
  timestamp: string;            // data/hora da mensagem
  created_at: string;
}

/** Nota interna attached a um chat. */
export interface ConversaNota {
  id: string;
  user_id: string;
  chat_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/** Template de mensagem pré-definido. */
export interface ConversaTemplate {
  id: string;
  user_id: string;
  nome: string;
  conteudo: string;
  variaveis?: string[];        // ex: ["{{nome}}", "{{data}}"]
  created_at: string;
  updated_at: string;
}

// ─── Filtros e Listagem ─────────────────────────────────────────────────────

export type ChatFilter =
  | 'todas'
  | 'nao_lidas'
  | 'atencao'
  | 'arquivadas';

export interface ChatListParams {
  filter: ChatFilter;
  search?: string;
  limit?: number;
  offset?: number;
}

// ─── Suggestion Engine (Fase 11) ─────────────────────────────────────────────

export type SuggestionAction =
  | { type: 'criar_orcamento'; payload: { cliente_id: string } }
  | { type: 'ver_cliente'; payload: { cliente_id: string } }
  | { type: 'ver_lead'; payload: { lead_id: string } }
  | { type: 'ver_agenda'; payload: { cliente_id: string } }
  | { type: 'ver_financeiro'; payload: { cliente_id: string } }
  | { type: 'vincular_lead'; payload: { contato_id: string } }
  | { type: 'enviar_contrato'; payload: { cliente_id: string } }
  | { type: 'alertar_pagamento_pendente'; payload: { cliente_id: string; cobranca_id: string } };

export interface ChatSuggestion {
  id: string;
  title: string;
  description?: string;
  action: SuggestionAction;
  priority: 'high' | 'medium' | 'low';
  signals: string[];  // quais sinais da matriz 8x geraram esta sugestão
}

// ─── Evolution API Payload (para webhook inbound) ───────────────────────────

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key?: {
      remote?: string;
      id?: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
      imageMessage?: {
        caption?: string;
        mediaKey?: string;
        mimetype?: string;
        fileLength?: string;
      };
      audioMessage?: {
        mimetype?: string;
        mediaKey?: string;
        fileLength?: string;
      };
      documentWithCaptionMessage?: {
        message?: {
          documentMessage?: {
            caption?: string;
            fileName?: string;
            mimetype?: string;
            fileLength?: string;
          };
        };
      };
    };
    messageTimestamp?: string | number;
  };
  date_time?: string;
  source?: string;
}
