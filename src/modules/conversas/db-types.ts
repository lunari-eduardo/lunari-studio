/**
 * Tipos deatabase (Supabase) para o módulo Conversas.
 *
 * Estes tipos espelham as tabelas definidas em:
 *   supabase/migrations/20260911230000_conversas_schema.sql
 *
 * São usados com o Supabase Client:
 *   supabase.from('conversas_mensagens').select('*')
 *
 * Gerados manualmente para manter consistência com a migration SQL.
 * Regerar manualmente após qualquer alteração de schema.
 */

import type { Json } from '@/integrations/supabase/types';

// ─── Enumerações ──────────────────────────────────────────────────────────────

export type Database['public']['Enums']['conversas_instancia_status'] =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error';

export type Database['public']['Enums']['conversas_chat_status'] =
  | 'active'
  | 'archived'
  | 'blocked';

export type Database['public']['Enums']['conversas_chat_pin'] =
  | 'pinned'
  | 'unpinned';

export type Database['public']['Enums']['conversas_message_direction'] =
  | 'inbound'
  | 'outbound';

export type Database['public']['Enums']['conversas_message_type'] =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contact'
  | 'template';

export type Database['public']['Enums']['conversas_message_status'] =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type Database['public']['Enums']['conversas_contact_type'] =
  | 'cliente'
  | 'lead'
  | 'unknown';

// ─── Tabelas ──────────────────────────────────────────────────────────────────

export interface DbConversasInstancia {
  Row: {
    id: string;
    user_id: string;
    instance_name: string;
    instance_id: string;
    status: Database['public']['Enums']['conversas_instancia_status'];
    phone: string | null;
    webhook_url: string | null;
    evolution_token: string | null;
    qrcode_data: string | null;
    qrcode_expires_at: string | null;
    settings: Json;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    instance_name: string;
    instance_id: string;
    status?: Database['public']['Enums']['conversas_instancia_status'];
    phone?: string | null;
    webhook_url?: string | null;
    evolution_token?: string | null;
    qrcode_data?: string | null;
    qrcode_expires_at?: string | null;
    settings?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    instance_name?: string;
    instance_id?: string;
    status?: Database['public']['Enums']['conversas_instancia_status'];
    phone?: string | null;
    webhook_url?: string | null;
    evolution_token?: string | null;
    qrcode_data?: string | null;
    qrcode_expires_at?: string | null;
    settings?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    { schema: 'public'; table: 'auth.users'; columns: ['user_id'] }
  ];
}

export interface DbConversasContato {
  Row: {
    id: string;
    user_id: string;
    phone_raw: string;
    phone_normalized: string;
    nome: string | null;
    avatar_url: string | null;
    tipo: Database['public']['Enums']['conversas_contact_type'];
    cliente_id: string | null;
    lead_id: string | null;
    total_conversas: number;
    ultima_mensagem: string | null;
    ultima_mensagem_data: string | null;
    unread_count: number;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    phone_raw: string;
    phone_normalized?: string;
    nome?: string | null;
    avatar_url?: string | null;
    tipo?: Database['public']['Enums']['conversas_contact_type'];
    cliente_id?: string | null;
    lead_id?: string | null;
    total_conversas?: number;
    ultima_mensagem?: string | null;
    ultima_mensagem_data?: string | null;
    unread_count?: number;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    phone_raw?: string;
    phone_normalized?: string;
    nome?: string | null;
    avatar_url?: string | null;
    tipo?: Database['public']['Enums']['conversas_contact_type'];
    cliente_id?: string | null;
    lead_id?: string | null;
    total_conversas?: number;
    ultima_mensagem?: string | null;
    ultima_mensagem_data?: string | null;
    unread_count?: number;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    { schema: 'public'; table: 'auth.users'; columns: ['user_id'] },
    { schema: 'public'; table: 'clientes'; columns: ['cliente_id'] }
  ];
}

export interface DbConversasChat {
  Row: {
    id: string;
    user_id: string;
    contato_id: string;
    instance_id: string;
    status: Database['public']['Enums']['conversas_chat_status'];
    pin: Database['public']['Enums']['conversas_chat_pin'];
    mute: boolean;
    unread_count: number;
    contato_nome: string | null;
    contato_avatar: string | null;
    contato_phone_normalized: string | null;
    ultima_mensagem: string | null;
    ultima_mensagem_data: string | null;
    ultima_mensagem_type: Database['public']['Enums']['conversas_message_type'] | null;
    ultima_mensagem_direction: Database['public']['Enums']['conversas_message_direction'] | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    contato_id: string;
    instance_id: string;
    status?: Database['public']['Enums']['conversas_chat_status'];
    pin?: Database['public']['Enums']['conversas_chat_pin'];
    mute?: boolean;
    unread_count?: number;
    contato_nome?: string | null;
    contato_avatar?: string | null;
    contato_phone_normalized?: string | null;
    ultima_mensagem?: string | null;
    ultima_mensagem_data?: string | null;
    ultima_mensagem_type?: Database['public']['Enums']['conversas_message_type'] | null;
    ultima_mensagem_direction?: Database['public']['Enums']['conversas_message_direction'] | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    contato_id?: string;
    instance_id?: string;
    status?: Database['public']['Enums']['conversas_chat_status'];
    pin?: Database['public']['Enums']['conversas_chat_pin'];
    mute?: boolean;
    unread_count?: number;
    contato_nome?: string | null;
    contato_avatar?: string | null;
    contato_phone_normalized?: string | null;
    ultima_mensagem?: string | null;
    ultima_mensagem_data?: string | null;
    ultima_mensagem_type?: Database['public']['Enums']['conversas_message_type'] | null;
    ultima_mensagem_direction?: Database['public']['Enums']['conversas_message_direction'] | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    { schema: 'public'; table: 'auth.users'; columns: ['user_id'] },
    { schema: 'public'; table: 'conversas_contatos'; columns: ['contato_id'] },
    { schema: 'public'; table: 'conversas_instancias'; columns: ['instance_id'] }
  ];
}

export interface DbConversasMensagem {
  Row: {
    id: string;
    user_id: string;
    chat_id: string;
    instance_id: string;
    evolution_msg_id: string | null;
    direction: Database['public']['Enums']['conversas_message_direction'];
    type: Database['public']['Enums']['conversas_message_type'];
    content: string;
    media_url: string | null;
    media_mime_type: string | null;
    media_size_bytes: number | null;
    media_filename: string | null;
    status: Database['public']['Enums']['conversas_message_status'];
    is_forwarded: boolean | null;
    timestamp: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    chat_id: string;
    instance_id: string;
    evolution_msg_id?: string | null;
    direction: Database['public']['Enums']['conversas_message_direction'];
    type?: Database['public']['Enums']['conversas_message_type'];
    content?: string;
    media_url?: string | null;
    media_mime_type?: string | null;
    media_size_bytes?: number | null;
    media_filename?: string | null;
    status?: Database['public']['Enums']['conversas_message_status'];
    is_forwarded?: boolean | null;
    timestamp?: string;
    created_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    chat_id?: string;
    instance_id?: string;
    evolution_msg_id?: string | null;
    direction?: Database['public']['Enums']['conversas_message_direction'];
    type?: Database['public']['Enums']['conversas_message_type'];
    content?: string;
    media_url?: string | null;
    media_mime_type?: string | null;
    media_size_bytes?: number | null;
    media_filename?: string | null;
    status?: Database['public']['Enums']['conversas_message_status'];
    is_forwarded?: boolean | null;
    timestamp?: string;
    created_at?: string;
  };
  Relationships: [
    { schema: 'public'; table: 'auth.users'; columns: ['user_id'] },
    { schema: 'public'; table: 'conversas_chats'; columns: ['chat_id'] },
    { schema: 'public'; table: 'conversas_instancias'; columns: ['instance_id'] }
  ];
}

export interface DbConversasNota {
  Row: {
    id: string;
    user_id: string;
    chat_id: string;
    content: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    chat_id: string;
    content: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    chat_id?: string;
    content?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    { schema: 'public'; table: 'auth.users'; columns: ['user_id'] },
    { schema: 'public'; table: 'conversas_chats'; columns: ['chat_id'] }
  ];
}

export interface DbConversasTemplate {
  Row: {
    id: string;
    user_id: string;
    nome: string;
    conteudo: string;
    variaveis: Json;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    nome: string;
    conteudo: string;
    variaveis?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    nome?: string;
    conteudo?: string;
    variaveis?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    { schema: 'public'; table: 'auth.users'; columns: ['user_id'] }
  ];
}

export interface DbConversasWebhookEvent {
  Row: {
    id: string;
    instance_id: string;
    event_type: string;
    payload: Json;
    processed: boolean;
    error_message: string | null;
    received_at: string;
  };
  Insert: {
    id?: string;
    instance_id: string;
    event_type: string;
    payload: Json;
    processed?: boolean;
    error_message?: string | null;
    received_at?: string;
  };
  Update: {
    id?: string;
    instance_id?: string;
    event_type?: string;
    payload?: Json;
    processed?: boolean;
    error_message?: string | null;
    received_at?: string;
  };
  Relationships: [];
}

// ─── Tables map (para uso com Database['public']['Tables']) ──────────────────

export type ConversasTables = {
  conversas_instancias: DbConversasInstancia;
  conversas_contatos: DbConversasContato;
  conversas_chats: DbConversasChat;
  conversas_mensagens: DbConversasMensagem;
  conversas_notas: DbConversasNota;
  conversas_templates: DbConversasTemplate;
  conversas_webhook_events: DbConversasWebhookEvent;
};
