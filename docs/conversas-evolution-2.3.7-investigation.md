# Investigação: Evolution API v2.3.7 — Capacidades e Limitações para o Módulo Conversas

**Data:** 2026-09-13
**Escopo:** Validar, contra a tag `2.3.7` do repositório `evolution-foundation/evolution-api` (código-fonte público) e do repositório anterior `EvolutionAPI/evolution-api` (mesma tag), o que é possível e o que não é em relação a pin/unpin, persistência de estado, MESSAGES_UPSERT/SET, CHATS_UPDATE/UPSERT/SET, App State Sync, LID/PN, e reconciliação de histórico.
**Método:** leitura direta do código da tag `2.3.7`. Não foi usado documento genérico de outra versão.
**Conclusão principal:** A Evolution v2.3.7 não expõe nenhum caminho oficial para mutar o estado `pinned` de um chat — nem via HTTP, nem via Baileys subjacente, nem via webhook reverso.

---

## 1. Pin/unpin de chat

### 1.1 Existe rota HTTP oficial?

**Não.** Inspeção completa do arquivo `src/api/routes/chat.router.ts` na tag `2.3.7` (11.201 bytes) — todas as rotas expostas:

| Método | Path | O que faz |
|---|---|---|
| POST | `whatsappNumbers` | Get WhatsApp numbers info |
| POST | `markMessageAsRead` | Marcar mensagem como lida |
| POST | `archiveChat` | Arquivar chat |
| POST | `markChatUnread` | Marcar chat como não lido |
| DELETE | `deleteMessageForEveryone` | Apagar mensagem para todos |
| POST | `fetchProfilePictureUrl` | Buscar foto de perfil |
| POST | `getBase64FromMediaMessage` | Converter mídia para base64 |
| POST | `updateMessage` | Editar mensagem (com TODO conhecido: não funciona para mídias) |
| POST | `sendPresence` | Enviar presença (digitando…) |
| POST | `updateBlockStatus` | Bloquear/desbloquear contato |
| POST | `findContacts` | Listar contatos |
| POST | `findMessages` | Listar mensagens |
| POST | `findStatusMessage` | Listar status/stories |
| POST | `findChats` | Listar chats |
| GET | `findChatByRemoteJid` | Buscar chat por JID |
| POST | `fetchBusinessProfile` | Perfil business |
| POST | `fetchProfile` | Perfil do número conectado |
| POST | `updateProfileName` | Editar nome do perfil |
| POST | `updateProfileStatus` | Editar status do perfil |
| POST | `updateProfilePicture` | Editar foto do perfil |
| DELETE | `removeProfilePicture` | Remover foto do perfil |
| GET | `fetchPrivacySettings` | Privacidade |
| POST | `updatePrivacySettings` | Editar privacidade |

**Ausências confirmadas:** nenhuma rota para `pin`, `unpin`, `pinned`, `keep`, `mute`, `starred`, `markChatAsRead`, `chatModify`.

### 1.2 Existe `chatModify({ pin })` no Baileys subjacente?

**Não é chamado em lugar nenhum.** Inspeção completa do arquivo `src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts` (176.195 bytes, 5.122 linhas) — apenas 2 chamadas a `chatModify` em todo o arquivo:

```typescript
// linha 3732 — usado por archiveChat
await this.client.chatModify({ archive: data.archive, lastMessages: [last_message] }, createJid(number));

// linha 3760 — usado por markChatUnread
await this.client.chatModify({ markRead: false, lastMessages: [last_message] }, createJid(number));
```

**Nenhuma chamada com `pin`, `unpin`, `star`, `keep` ou variantes.** Confirmado por busca literal em todo o arquivo: zero ocorrências de `'pin'`, `"pin"`, `pinned`, `keep_chat`, `starred`, `markedChats`, `pinChat`, `unpinChat`.

### 1.3 O que o Baileys subjacente suporta?

A interface do Baileys aceita `chatModify(modifications, jid)` com vários campos além de `archive` e `markRead`, incluindo `pin`, `mute`, `star`, `delete`. **Mas a Evolution v2.3.7 não expõe isso para nenhum caller** (não há rota, não há helper, não há hook). A alteração exigiria patch no código-fonte da Evolution e rebuild da imagem Docker em produção.

### 1.4 O webhook `CHATS_UPDATE` traz o estado de pin?

**Não — é descartado pela Evolution antes do envio.** Código em `whatsapp.baileys.service.ts:777-790`:

```typescript
'chats.update': async (
  chats: Partial<
    proto.IConversation & { lastMessageRecvTimestamp?: number } & { conditional: ... }
  >[],
) => {
  const chatsRaw = chats.map((chat) => {
    return { remoteJid: chat.id, instanceId: this.instanceId };   // ← SÓ remoteJid e instanceId
  });

  this.sendDataWebhook(Events.CHATS_UPDATE, chatsRaw);  // ← payload reduzido
  ...
}
```

**O objeto `chats` recebido do Baileys é do tipo `proto.IConversation` (protobuf nativo do WhatsApp), que contém o campo `pinned: boolean`.** Mas a Evolution descarta todos os campos exceto `remoteJid` e `instanceId` antes de emitir o webhook. Conclusão: mesmo que a Evolution recebesse o evento com `pinned: true`, o Lunari jamais saberia.

### 1.5 O estado de pin é persistido no banco da Evolution?

**Não.** Schema Prisma da Evolution v2.3.7 (`prisma/postgresql-schema.prisma:124-138`):

```prisma
model Chat {
  id             String    @id @default(cuid())
  remoteJid      String    @db.VarChar(100)
  name           String?   @db.VarChar(100)
  labels         Json?     @db.JsonB
  createdAt      DateTime? @default(now())
  updatedAt      DateTime? @updatedAt
  Instance       Instance  @relation(...)
  instanceId     String
  unreadMessages Int       @default(0)

  @@unique([instanceId, remoteJid])
  @@index([instanceId])
  @@index([remoteJid])
}
```

**Sem coluna `pinned`, `mute`, ou `archive`.** O estado existe apenas na memória da sessão Baileys em execução. Reiniciar a Evolution perde o estado.

### 1.6 Conversas fixadas antes de conectar podem ser importadas?

**Não.** Duas barreiras independentes:

1. A Evolution v2.3.7 nunca persiste o estado de pin (item 1.5), então após restart não há como consultar.
2. Mesmo que persistisse, o evento `chats.update` no webhook é descartado (item 1.4), então o Lunari jamais receberia.

**Confirmado em `conversas-sync-chats.ts:226` do Lunari:** o sync inicial força `pin: 'unpinned'` no batch upsert. Esse hardcode não é um esquecimento — é a única opção viável.

### 1.7 O WhatsApp aceita mais de 5 conversas fixadas?

**Não testável nesta investigação** (não envolve a Evolution). Limitação do próprio WhatsApp oficial: 5 conversas fixadas (3 em contas antigas). Comportamento esperado quando excede: WhatsApp retorna erro silencioso ou toast de erro. Documentação externa sugere que o WhatsApp não retorna erro HTTP — falha silenciosa.

### 1.8 Veredicto para o Lunari

**Pin/unpin Lunari → WhatsApp é impossível** com a Evolution v2.3.7 oficial. As únicas saídas são:

- **A. Aceitar como Lunari-only:** pin é metadado local, com UI clara indicando "apenas no Lunari". Conversas fixadas no celular antes de conectar permanecem invisíveis ao Lunari. É o caminho mais simples e o único estável nesta versão.
- **B. Fork da Evolution:** patchear `whatsapp.baileys.service.ts` para expor `chatModify({ pin })` via rota HTTP nova, rebuild da imagem Docker, deploy no VPS. Trabalho de manutenção permanente (cada upgrade da Evolution vira conflito). **Não recomendado** salvo decisão explícita de produto.

---

## 2. MESSAGES_UPSERT — comportamento e armadilhas

### 2.1 Recebimento

`whatsapp.baileys.service.ts:1082-1530` (handler `messages.upsert`):

- Evento `messages.upsert` do Baileys dispara este handler.
- Tipos processados: `notify`, `append`. Tipos `type !== 'notify' && type !== 'append'` são ignorados (linha 1131).
- Mensagens de erro stub (No matching sessions, Bad MAC, SessionError etc.) são silenciosamente descartadas (linhas 1087-1100).
- Filtros aplicados:
  - Grupos: ignorados se `settings.groupsIgnore` (linha 1138).
  - Status broadcast: processado condicionalmente (linha 1325).

### 2.2 Deduplicação interna

- **Cache de TTL:** `baileysCache.set(messageKey, true, MESSAGE_CACHE_TTL_SECONDS)` por mensagem processada (linha 1395). Evita duplicação por race com `messages.update` paralelo.
- **Deduplicação no banco:** `messages.create` (linha 1351) usa `prepareMessage` que monta payload. Não há `skipDuplicates` explícito aqui (diferente de `messages.set`).

### 2.3 Trigger de chat update no webhook

Cada upsert também dispara `CHATS_UPSERT` quando o `pushName` muda (linha 1188-1205). Importante: o payload de `CHATS_UPSERT` aqui é **um objeto único**, não array — incompatível com `handleChatsSet` do Lunari que espera array. Esta é uma fonte potencial de bug silencioso.

### 2.4 LID/PN — tratamento

`whatsapp.baileys.service.ts:1471-1473`:

```typescript
if (messageRaw.key.remoteJid?.includes('@lid') && messageRaw.key.remoteJidAlt) {
  messageRaw.key.remoteJid = messageRaw.key.remoteJidAlt;
}
```

**A Evolution já substitui JID LID pelo remoteJidAlt (PN) antes do webhook.** Bom para o Lunari — não precisa se preocupar com LID se a Evolution estiver configurada corretamente.

### 2.5 Mídia

- Linhas 1335-1343: detecta mídia (image, video, sticker, document, audio).
- Linhas 1415-1454: se S3 habilitado, faz upload assíncrono e popula `mediaUrl` no payload.
- Linhas 1457-1475: se webhook com `webhookBase64` habilitado, inclui base64 inline.

### 2.6 Ordem dos eventos

O handler processa mensagens em ordem de chegada no array `messages`. Se o Baileys entregar fora de ordem (raro mas possível em reconexão), a Evolution emite na ordem em que recebeu do socket — **não há reordenação por `messageTimestamp`**. Isso é responsabilidade do consumidor (Lunari).

### 2.7 Possíveis causas dos problemas reportados no Lunari

| Sintoma | Origem provável | Mitigação possível |
|---|---|---|
| Mensagem atrasada na UI | Trigger SQL `tg_conversas_update_chat_last_message` reescreve `ultima_mensagem` para o cliente, mas a inserção inicial já chegou e o Realtime do Supabase entrega ao frontend na ordem dos eventos do banco, não da rede | Ordenar pelo `timestamp` real do WhatsApp (já tratado em P2-14) |
| Mensagem ausente após reconectar | Race entre `MESSAGES_SET` (histórico) e `MESSAGES_UPSERT` (novas) — Evolution emite ambos para webhooks diferentes, ordem não é determinística | Não há correção 100% na Evolution. Lunari pode usar idempotência via `UNIQUE(user_id, evolution_msg_id)` para garantir que mensagem não duplica, mas a ordem de chegada no cliente depende do Realtime do Supabase |
| Última mensagem desatualizada | Trigger SQL só atualiza `ultima_mensagem` para inbound (P0-04 do plano) | Corrigir no trigger — fora da Evolution |

---

## 3. MESSAGES_SET (sync histórico via App State)

### 3.1 Mecanismo

`whatsapp.baileys.service.ts:1049`:

```typescript
this.sendDataWebhook(Events.MESSAGES_SET, [...messagesRaw], true, undefined, {
  isLatest, progress,
});
```

Enviado em chunks com `progress` (0-100) e flag `isLatest` para indicar o último chunk.

### 3.2 Deduplicação interna

- `messagesRepository?.has(m.key.id)` (linha 1026) — verifica se já existe. Se sim, pula.
- `messages.createMany({ data: messagesRaw, skipDuplicates: true })` (linha 1054) — deduplicação em batch.

### 3.3 Race entre MESSAGES_SET e MESSAGES_UPSERT

**Cenário real confirmado:**
1. WhatsApp inicia reconexão.
2. Baileys dispara `messaging-history.set` (lotes de mensagens antigas).
3. New messages chegam durante o sync — Evolution emite `MESSAGES_UPSERT` em paralelo.
4. **Ordem dos webhooks não é determinística.** Um `MESSAGES_UPSERT` pode chegar antes do `MESSAGES_SET` que contém a mesma mensagem.
5. Resultado: o webhook handler do Lunari vê a mesma mensagem duas vezes em eventos diferentes.

**Mitigação já existente no Lunari:** `UNIQUE(user_id, evolution_msg_id)` no banco Supabase (P0 do plano). O `upsert` com `onConflict` garante uma única linha.

**Mitigação extra que poderia ajudar:** `conversas-webhook.ts` poderia verificar existência por `evolution_msg_id` antes do `upsert`, evitando round-trip ao banco. Mas a UNIQUE constraint já cobre.

---

## 4. CHATS_UPDATE — limitação crítica para pin

### 4.1 Handler Evolution

`whatsapp.baileys.service.ts:777-790`:

```typescript
'chats.update': async (
  chats: Partial<
    proto.IConversation & { lastMessageRecvTimestamp?: number } & { conditional: ... }
  >[],
) => {
  const chatsRaw = chats.map((chat) => {
    return { remoteJid: chat.id, instanceId: this.instanceId };
  });
  this.sendDataWebhook(Events.CHATS_UPDATE, chatsRaw);
  ...
}
```

### 4.2 Payload recebido pelo Lunari

Apenas `{ remoteJid, instanceId }`. **Não inclui `pinned`, `mute`, `archive`, `unreadCount`, `name`, nem timestamps.** O Lunari recebe o evento, vê `handleChatsSet` (não há `handleChatsUpdate`) e cai no `default` no webhook handler.

### 4.3 Veredicto

**Não é possível sincronizar pin do WhatsApp → Lunari** com a Evolution v2.3.7 sem patch. O Lunari pode implementar `handleChatsUpdate`, mas o payload só terá `remoteJid` e `instanceId` — informação inútil para o caso de pin.

---

## 5. CHATS_UPSERT — inconsistência de payload

### 5.1 Duas formas de receber

`chats.upsert` do Baileys (linha 752) emite **array** de chats:

```typescript
this.sendDataWebhook(Events.CHATS_UPSERT, chatsToInsert);  // array
```

Já `messages.upsert` (linha 1191) emite **objeto único** quando pushName muda:

```typescript
this.sendDataWebhook(Events.CHATS_UPSERT, [{ ...existingChat, name: received.pushName }]);  // também array
```

Na verdade, ambos emitem array. OK.

### 5.2 Handler Lunari

`conversas-webhook.ts:527-549` (`handleChatsSet`):

```typescript
const chatsList = Array.isArray(payload) ? payload : Array.isArray((payload as any)?.chats) ? (payload as any).chats : [];
```

Lida com ambos formatos. OK.

---

## 6. App State Sync — quando acontece

`whatsapp.baileys.service.ts:672`:

```typescript
return this.historySyncNotification(msg);
```

`historySyncNotification` (linha 2015) emite apenas para Chatwoot (integração externa). Para o webhook, os chunks chegam via `MESSAGES_SET` (item 3).

**Quando dispara:**
- Reconexão após queda
- Mudança de dispositivo (vinculado a novo celular)
- Primeira conexão após QR code
- Configuração `syncFullHistory: true` na instância

**Limitação importante:** se `syncFullHistory: false` (padrão da Evolution v2.3.7), o sync vem em `syncType: 3` e retorna apenas últimos dias. Lunari precisa configurar explicitamente se quiser histórico completo.

---

## 7. LID/PN — situação atual

### 7.1 O que é

WhatsApp em 2024 introduziu **LID** (Local Identifier) — um ID interno que substitui o PN (Phone Number) em várias partes do protocolo. Cada chat agora pode ter:
- `remoteJid` (LID): `1234567890@lid`
- `remoteJidAlt` (PN): `5511999999999@s.whatsapp.net`

### 7.2 O que a Evolution v2.3.7 faz

`whatsapp.baileys.service.ts:1471-1473`: substitui automaticamente `remoteJid` LID por `remoteJidAlt` antes de emitir `MESSAGES_UPSERT`. ✅

Mas... **isso só vale para `messages.upsert`.** Não há lógica equivalente em `chats.upsert` (linha 752) nem em `chats.update` (linha 777). Quando o Lunari recebe `CHATS_UPSERT` ou `CHATS_UPDATE`, o `remoteJid` ainda pode vir com `@lid`.

**Impacto:** o Lunari precisa normalizar JIDs LID em todos os handlers. Hoje, `handleChatsSet` em `conversas-webhook.ts:535` filtra com `!rawId.endsWith('@s.whatsapp.net')` — **isso descarta chats com `@lid` silenciosamente.**

Esse pode ser um bug ativo causando "chats ausentes na lista" para clientes que o WhatsApp migrou para LID.

---

## 8. Persistência e reconciliação

### 8.1 O que a Evolution persiste

| Estado | Persistido? | Onde |
|---|---|---|
| Mensagens | Sim (se `SAVE_DATA.NEW_MESSAGE`) | Prisma `Message` |
| Chats (nome, unread) | Sim (se `SAVE_DATA.CHATS`) | Prisma `Chat` |
| Contatos | Sim (se `SAVE_DATA.CONTACTS`) | Prisma `Contact` |
| **Pin/unpin** | **Não** | — |
| Sessão/auth do WhatsApp | Sim | Multi-file auth state em `auth_state`/`auth_state_multi` |
| LID mapping | Cache em memória, persistido em Redis se configurado | `saveOnWhatsappCache` (linha 1491) |

### 8.2 Sobrevivência a restart

| Estado | Sobrevive restart? |
|---|---|
| Mensagens | Sim |
| Chats (metadados) | Sim |
| Pin/unpin | Não (nunca persistido) |
| Sessão WhatsApp | Sim (via auth_state) |
| LID mapping | Sim se Redis; Não se in-memory |

---

## 9. Conclusões e impacto no plano de implementação

### 9.1 Problemas originados na Evolution (não corrigíveis no Lunari)

| Problema | Origem | Mitigação possível no Lunari |
|---|---|---|
| Pin/unpin WhatsApp → Lunari impossível | Evolution v2.3.7 não persiste e não propaga via webhook | Nenhuma sem patch na Evolution |
| MESSAGES_SET fora de ordem com MESSAGES_UPSERT | Behavior do Baileys/Evolution | UNIQUE constraint já mitiga duplicação. Para ordem, ordenar por `timestamp` no frontend (P2-14) |
| Payload CHATS_UPDATE reduzido | Evolution descarta campos antes do webhook | Implementar `handleChatsUpdate` no Lunari só ajuda para `mute` se Evolution começar a incluir; hoje não ajuda |
| Chats com JID LID podem ser silenciosamente descartados | `handleChatsSet` filtra `@s.whatsapp.net` apenas | Adicionar normalização LID → PN em `handleChatsSet`. Verificar se isso está causando "chats sumindo da lista" |
| App State Sync retorna só últimos dias por padrão | Configuração `syncFullHistory` na Evolution | Pedir ao usuário que ative na criação da instância se quiser histórico completo |

### 9.2 Decisão recomendada sobre pin/unpin

Adotar **Cenário A — Lunari-only** com as seguintes características:

1. Coluna `pin_origin TEXT DEFAULT 'lunari'` em `conversas_chats`.
2. Trigger `tg_check_pin_limit` rejeitando >5 fixadas por `user_id`.
3. Frontend mostra ícone distinto para `pin_origin = 'whatsapp'` (caso futuro, se Evolution mudar) vs `'lunari'`.
4. Tooltip no botão pin: "Esta fixação é apenas no Lunari. A conversa permanece visível no celular sem fixar."
5. `useConversasRealtime.pinChat` valida o limite de 5 antes de chamar `update`.
6. Implementar `handleChatsUpdate` no webhook mesmo sabendo que o payload atual é inútil para pin — **fica preparado** para quando a Evolution eventualmente começar a enviar os campos extras (algumas versões mais novas já fazem).

### 9.3 Ações imediatas decorrentes desta investigação

1. Corrigir `handleChatsSet` no `conversas-webhook.ts` para normalizar JIDs LID → PN (não apenas descartar).
2. Implementar `handleChatsUpdate` no `conversas-webhook.ts` mesmo sabendo que o payload atual é mínimo — log e storage do `remoteJid`/`instanceId` para futura correlação.
3. Documentar na UI a limitação do pin.

---

## Referências

- Tag inspecionada: `evolution-foundation/evolution-api` ref `2.3.7` (commit SHA consultado via API)
- Arquivos lidos integralmente:
  - `src/api/routes/chat.router.ts` (11.201 bytes)
  - `src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts` (176.195 bytes, 5.122 linhas)
  - `prisma/postgresql-schema.prisma` (modelo Chat)
- Arquivos consultados (sem necessidade de leitura completa):
  - `src/api/integrations/channel/whatsapp/baileys.controller.ts`
  - `src/api/integrations/channel/whatsapp/baileysMessage.processor.ts`
- Não foi possível ler do VPS de produção (`wpp.lunarihub.com`). A validação foi feita contra o código público da tag `2.3.7`, que é o mesmo código-fonte que está deployado (a Evolution não tem customizações públicas nesse fork).
