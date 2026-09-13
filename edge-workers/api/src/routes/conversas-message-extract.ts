/**
 * Helpers compartilhados para extração de conteúdo de mensagens da Evolution API.
 * Unifica a lógica que antes estava duplicada entre webhook e sync.
 *
 * P1-06 / Fase 3 — resolve race condition entre sync e webhook onde
 * extractMessageText e extractContent usavam lógica levemente diferente.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: { text: string };
  imageMessage?: {
    caption?: string;
    jpegThumbnail?: string;
    mimetype?: string;
    fileLength?: string;
    fileName?: string;
    mediaUrl?: string;
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
  contactMessage?: { displayName: string; vcard?: string };
}

export interface EvolutionMessagePayload {
  key?: {
    remoteJid?: string;
    fromMe?: boolean;
    id?: string;
    participant?: string;
    remoteJidAlt?: string;
  };
  pushName?: string;
  message?: EvolutionMessageContent;
  messageTimestamp?: string | number;
  status?: string;
  source?: string;
}

export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contact';

export interface MediaInfo {
  mediaUrl: string | null;
  mimeType: string | null;
  filename: string | null;
  sizeBytes: number | null;
}

// ─── Extract Content ──────────────────────────────────────────────────────────

/**
 * Extrai texto legível de uma mensagem Evolution API.
 * Prioriza: caption > text > fallback por tipo.
 */
export function extractMessageContent(msg: EvolutionMessagePayload): string {
  if (!msg.message) return '';
  const m = msg.message;

  // Texto direto
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;

  // Captions de mídia
  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;
  if (m.documentMessage?.caption) return m.documentMessage.caption;

  // Tipos especiais com fallback textual
  if (m.locationMessage) {
    const loc = m.locationMessage;
    return loc.name
      ? `📍 ${loc.name}\n${loc.address ?? ''}\nLat: ${loc.degreesLatitude}, Lng: ${loc.degreesLongitude}`
      : `📍 Localização\nLat: ${loc.degreesLatitude}, Lng: ${loc.degreesLongitude}`;
  }

  if (m.contactMessage) return `👤 ${m.contactMessage.displayName}`;

  // Mídia sem caption — retorna descrição genérica
  if (m.audioMessage) return '🎤 Áudio';
  if (m.videoMessage) return '🎥 Vídeo';
  if (m.documentMessage) return `📄 ${m.documentMessage.fileName ?? 'Documento'}`;
  if (m.stickerMessage) return '🎨 Figurinha';

  return '';
}

// ─── Extract Type ────────────────────────────────────────────────────────────

/**
 * Detecta o tipo da mensagem.
 */
export function extractMessageType(msg: EvolutionMessagePayload): MessageType {
  if (!msg.message) return 'text';
  const m = msg.message;

  if (m.conversation || m.extendedTextMessage) return 'text';
  if (m.imageMessage) return 'image';
  if (m.audioMessage) return 'audio';
  if (m.videoMessage) return 'video';
  if (m.documentMessage) return 'document';
  if (m.stickerMessage) return 'sticker';
  if (m.locationMessage) return 'location';
  if (m.contactMessage) return 'contact';

  return 'text';
}

// ─── Extract Media Info ───────────────────────────────────────────────────────

/**
 * Extrai metadados de mídia da mensagem.
 */
export function extractMediaInfo(msg: EvolutionMessagePayload): MediaInfo {
  const m = msg.message;
  if (!m) return { mediaUrl: null, mimeType: null, filename: null, sizeBytes: null };

  let mimeType: string | null = null;
  let filename: string | null = null;
  let sizeBytes: number | null = null;

  if (m.imageMessage) {
    mimeType = m.imageMessage.mimetype ?? 'image/jpeg';
    filename = m.imageMessage.fileName ?? `image-${msg.key?.id}.jpg`;
    sizeBytes = m.imageMessage.fileLength ? parseInt(m.imageMessage.fileLength, 10) : null;
  } else if (m.audioMessage) {
    mimeType = m.audioMessage.mimetype ?? 'audio/ogg';
    sizeBytes = m.audioMessage.fileLength ? parseInt(m.audioMessage.fileLength, 10) : null;
  } else if (m.videoMessage) {
    mimeType = m.videoMessage.mimetype ?? 'video/mp4';
    sizeBytes = m.videoMessage.fileLength ? parseInt(m.videoMessage.fileLength, 10) : null;
  } else if (m.documentMessage) {
    mimeType = m.documentMessage.mimetype ?? 'application/octet-stream';
    filename = m.documentMessage.fileName ?? null;
    sizeBytes = m.documentMessage.fileLength ? parseInt(m.documentMessage.fileLength, 10) : null;
  } else {
    return { mediaUrl: null, mimeType: null, filename: null, sizeBytes: null };
  }

  return { mediaUrl: null, mimeType, filename, sizeBytes };
}

// ─── Extract Direction ─────────────────────────────────────────────────────────

/**
 * Determina a direção da mensagem.
 */
export function extractDirection(msg: EvolutionMessagePayload): 'inbound' | 'outbound' {
  return msg.key?.fromMe ? 'outbound' : 'inbound';
}

// ─── Extract Timestamp ─────────────────────────────────────────────────────────

/**
 * Converte messageTimestamp do WhatsApp para ISO string.
 */
export function extractTimestamp(msg: EvolutionMessagePayload): string {
  if (msg.messageTimestamp) {
    const ts = Number(msg.messageTimestamp);
    if (!isNaN(ts)) {
      return new Date(ts * 1000).toISOString();
    }
  }
  return new Date().toISOString();
}
