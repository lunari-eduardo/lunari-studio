/**
 * Tipos de domínio para o módulo Conversas.
 * Abstraem os tipos de database para uso no frontend.
 */

import type {
  DbConversasChat,
  DbConversasContato,
  DbConversasMensagem,
  DbConversasInstancia,
  DbConversasNota,
  DbConversasTemplate,
} from './db-types';

// ─── Aliases convenientes ─────────────────────────────────────────────────────

export type Chat = DbConversasChat['Row'];
export type ChatInsert = DbConversasChat['Insert'];
export type ChatUpdate = DbConversasChat['Update'];

export type Contato = DbConversasContato['Row'];
export type ContatoInsert = DbConversasContato['Insert'];
export type ContatoUpdate = DbConversasContato['Update'];

export type Mensagem = DbConversasMensagem['Row'];
export type MensagemInsert = DbConversasMensagem['Insert'];
export type MensagemUpdate = DbConversasMensagem['Update'];

export type Instancia = DbConversasInstancia['Row'];
export type Nota = DbConversasNota['Row'];
export type Template = DbConversasTemplate['Row'];

// ─── Enums ────────────────────────────────────────────────────────────────────

export type ChatStatus = 'active' | 'archived' | 'blocked';
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
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ContactType = 'cliente' | 'lead' | 'unknown';
export type InstanciaStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// ─── Evolução API payload types ───────────────────────────────────────────────

export interface EvolutionWebhookPayload {
  event: 'CONNECTION_UPDATE' | 'MESSAGES_UPSERT' | 'MESSAGES_UPDATE' | 'MESSAGES_DELETE';
  session: string;
  payload: unknown;
}

export interface EvolutionMessagePayload {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
      contextInfo?: {
        mentionedJid?: string[];
        quotedMessage?: unknown;
      };
    };
    imageMessage?: {
      caption?: string;
      jpegThumbnail?: string;
      mimetype?: string;
      fileLength?: string;
      fileName?: string;
    };
    audioMessage?: {
      mimetype?: string;
      ptt?: boolean;
      fileLength?: string;
      seconds?: number;
    };
    videoMessage?: {
      caption?: string;
      jpegThumbnail?: string;
      mimetype?: string;
      fileLength?: string;
      seconds?: number;
    };
    documentMessage?: {
      caption?: string;
      fileName?: string;
      mimetype?: string;
      fileLength?: string;
    };
    stickerMessage?: unknown;
    locationMessage?: {
      degreesLatitude: number;
      degreesLongitude: number;
      name?: string;
      address?: string;
    };
    contactMessage?: {
      displayName: string;
      vcard?: string;
    };
  };
  messageTimestamp?: string | number;
  status?: 'SERVER_ACK' | 'DEVICE_ACK' | 'READ' | 'PLAYED' | 'ERROR';
  broadcast?: boolean;
  messageNumber?: number;
  id?: {
    fromMe?: boolean;
    remote?: string;
    id?: string;
    _serialized?: string;
  };
}

export interface EvolutionConnectionPayload {
  instance: string;
  state: 'open' | 'close' | 'connecting';
  pushName?: string;
  phone?: string;
  wid?: string;
}

// ─── Chat com dados do contato (join) ───────────────────────────────────────

export interface ChatWithContato extends Chat {
  contato?: Contato;
}

// ─── Estado UI ────────────────────────────────────────────────────────────────

export interface ChatListFilters {
  search?: string;
  status?: ChatStatus | 'all';
  hasUnread?: boolean;
}

export interface SendMessageInput {
  chatId: string;
  content: string;
  type?: MessageType;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFilename?: string;
  mediaSizeBytes?: number;
}
