import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { trackShareEventRoute } from './routes/track-share-event.js';
import { gestaoR2PublicUploadRoute } from './routes/gestao-r2-public-upload.js';
import { gestaoR2UploadRoute } from './routes/gestao-r2-upload.js';
import { gestaoR2SignedUrlRoute } from './routes/gestao-r2-signed-url.js';
import { gestaoR2DeleteRoute } from './routes/gestao-r2-delete.js';
import { mediaDownloadRoute } from './routes/media-download.js';

import { contractsNativeSendRoute } from './routes/contracts-native-send.js';
import { contractsNativeGetRoute } from './routes/contracts-native-get.js';
import { contractsNativeSignRoute } from './routes/contracts-native-sign.js';
import { contractsNativeDownloadRoute } from './routes/contracts-native-download.js';
import { getAgendaOnlineSlotsRoute } from './routes/agenda-online-slots.js';
import { reserveAgendaOnlineSlotRoute } from './routes/agenda-online-reserve.js';
import { lookupAgendaOnlineClientRoute } from './routes/agenda-online-client-lookup.js';

import { conversasWebhookRoute } from './routes/conversas-webhook.js';
import { conversasSendMessageRoute } from './routes/conversas-send-message.js';
import { conversasMediaUploadRoute } from './routes/conversas-media-upload.js';
import { conversasInstanceCreateRoute } from './routes/conversas-instance-create.js';
import { conversasInstanceConnectRoute } from './routes/conversas-instance-connect.js';
import { conversasInstanceStatusRoute } from './routes/conversas-instance-status.js';
import { conversasInstanceDisconnectRoute } from './routes/conversas-instance-disconnect.js';
import { conversasInstanceDeleteRoute } from './routes/conversas-instance-delete.js';
import { conversasSyncChatsRoute } from './routes/conversas-sync-chats.js';
import { conversasMessageRetryRoute } from './routes/conversas-message-retry.js';
import { conversasFetchAvatarRoute } from './routes/conversas-fetch-avatar.js';
import { conversasMarkReadRoute } from './routes/conversas-mark-read.js';
import { conversasMarkUnreadRoute } from './routes/conversas-mark-unread.js';
import { conversasMessageDeleteRoute } from './routes/conversas-message-delete.js';
import { conversasMessageReactRoute } from './routes/conversas-message-react.js';
import { getConversasStickersRoute, saveConversasStickersRoute, deleteConversasStickersRoute, proxyConversasStickersRoute } from './routes/conversas-stickers.js';
import { getAudiosSalvosRoute, saveAudiosSalvosRoute, patchAudiosSalvosRoute, deleteAudiosSalvosRoute } from './routes/conversas-audios-savos.js';

export type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  VITE_SITE_URL: string;
  R2_CDN_BASE: string;
  R2_COMMERCIAL_CDN_BASE: string;
  R2_CONVERSAS_CDN_BASE: string;
  ANALYTICS_SALT: string;
  EVOLUTION_API_URL: string;
  EVOLUTION_INSTANCE_NAME: string;

  // Secrets (via `wrangler secret put`):
  EVOLUTION_API_KEY: string;
  EVOLUTION_WEBHOOK_SECRET: string;

  // R2 Bucket Bindings
  LUNARI_PREVIEWS: R2Bucket;
  LUNARI_PRIVATE: R2Bucket;
  LUNARI_COMMERCIAL_DOCUMENTS: R2Bucket;
  LUNARI_MEDIA: R2Bucket;
  LUNARI_GALLERY: R2Bucket;
  LUNARI_CONVERSAS: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

app.get('/', (c) => c.text('Lunari Edge API (Analytics & R2 Storage) is running!'));

// Rota de download protegido
app.get('/api/media/download', mediaDownloadRoute);

// Rotas mapeadas de acordo com as antigas funções do Supabase
app.post('/functions/v1/track-share-event', trackShareEventRoute);
app.post('/functions/v1/gestao-r2-public-upload', gestaoR2PublicUploadRoute);
app.post('/functions/v1/gestao-r2-upload', gestaoR2UploadRoute);
app.post('/functions/v1/gestao-r2-signed-url', gestaoR2SignedUrlRoute);
app.post('/functions/v1/gestao-r2-delete', gestaoR2DeleteRoute);

// Atalhos limpos de API
app.post('/api/track-share-event', trackShareEventRoute);
app.post('/api/r2-public-upload', gestaoR2PublicUploadRoute);
app.post('/api/r2-upload', gestaoR2UploadRoute);
app.post('/api/r2-signed-url', gestaoR2SignedUrlRoute);
app.post('/api/r2-delete', gestaoR2DeleteRoute);

// Contratos Nativos
app.post('/api/contracts/native/send', contractsNativeSendRoute);
app.get('/api/contracts/native/get/:token', contractsNativeGetRoute);
app.post('/api/contracts/native/sign', contractsNativeSignRoute);
app.get('/api/contracts/native/download/:token', contractsNativeDownloadRoute);

// Atalhos legados sem /api para evitar quebra de cache/PWA antigos
app.post('/contracts/native/send', contractsNativeSendRoute);
app.get('/contracts/native/get/:token', contractsNativeGetRoute);
app.post('/contracts/native/sign', contractsNativeSignRoute);
app.get('/contracts/native/download/:token', contractsNativeDownloadRoute);

app.get('/api/agenda/online/:slug/slots', getAgendaOnlineSlotsRoute);
app.get('/api/agenda/online/:slug/lookup-client', lookupAgendaOnlineClientRoute);
app.post('/api/agenda/online/:slug/reserve', reserveAgendaOnlineSlotRoute);

// ─── Conversas (WhatsApp / Evolution API) ────────────────────────────────────
app.post('/api/conversas/webhook', conversasWebhookRoute);
app.post('/api/conversas/send-message', conversasSendMessageRoute);

app.get('/api/conversas/stickers', getConversasStickersRoute);
app.post('/api/conversas/stickers', saveConversasStickersRoute);
app.delete('/api/conversas/stickers/:id', deleteConversasStickersRoute);
app.post('/api/conversas/stickers/proxy-send', proxyConversasStickersRoute);

// Áudios salvos
app.get('/api/conversas/audios_salvos', getAudiosSalvosRoute);
app.post('/api/conversas/audios_salvos', saveAudiosSalvosRoute);
app.patch('/api/conversas/audios_salvos/:id', patchAudiosSalvosRoute);
app.delete('/api/conversas/audios_salvos/:id', deleteAudiosSalvosRoute);
app.post('/api/conversas/message/retry/:id', conversasMessageRetryRoute);
app.post('/api/conversas/media-upload', conversasMediaUploadRoute);

// Proxies autenticados para a Evolution API (não expor a apikey no frontend).
app.post('/api/conversas/instance/create', conversasInstanceCreateRoute);
app.get('/api/conversas/instance/connect/:id', conversasInstanceConnectRoute);
app.post('/api/conversas/instance/disconnect/:id', conversasInstanceDisconnectRoute);
app.delete('/api/conversas/instance/:id', conversasInstanceDeleteRoute);
app.get('/api/conversas/instance/status/:id', conversasInstanceStatusRoute);
app.post('/api/conversas/sync-chats', conversasSyncChatsRoute);
app.post('/api/conversas/fetch-avatar', conversasFetchAvatarRoute);
app.post('/api/conversas/mark-read/:chatId', conversasMarkReadRoute);
app.post('/api/conversas/mark-unread/:chatId', conversasMarkUnreadRoute);
app.delete('/api/conversas/message/delete/:id', conversasMessageDeleteRoute);
app.post('/api/conversas/message/react/:id', conversasMessageReactRoute);

export default app;
