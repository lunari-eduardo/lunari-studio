# Arquitetura do Módulo de Conversas — Lunari

**Documento de arquitetura e decisões técnicas**
**Versão:** 1.0

Este documento descreve a arquitetura técnica para a implementação do módulo "Conversas" no Lunari, integrando o WhatsApp através da Evolution API.

---

## 1. Objetivo do Módulo
Fornecer uma interface operacional unificada e responsiva para comunicação por WhatsApp dentro do Lunari. O módulo não substitui os sistemas de registro (CRM, Leads, Orçamentos, Financeiro), mas atua como uma **camada de interação** que integra e reflete o estado desses módulos em tempo real.

## 2. Princípios Arquiteturais
*   **Fonte Única de Verdade:** A estrutura de `leads` (oportunidades) e `clientes` continua sendo a fonte de verdade do estado comercial. Conversas apenas reflete e manipula essas estruturas; não cria "status de conversa" paralelo.
*   **Separação de Preocupações:** Mensagens de WhatsApp são apenas eventos de comunicação. "Mensagem não é lead." Um Lead representa uma intenção comercial e deve ser criado intencionalmente (ou sob demanda por regras estritas).
*   **Desacoplamento de IA:** O módulo deve ser funcional sem IA na Fase 1. A IA (Lu) entrará futuramente como uma camada orquestradora que passa por validação determinística.
*   **Edge Computing para Alta Carga:** Webhooks do WhatsApp serão recebidos e normalizados via Cloudflare Workers antes de persistirem no Supabase, evitando sobrecarga e garantindo latência previsível.
*   **Respeito à Infraestrutura Existente:** Utilizar as soluções do projeto (Supabase Realtime, Cloudflare R2 para mídias, Contexts).

## 3. Arquitetura Atual Relevante do Lunari
*   **Frontend:** React 18, Vite, TypeScript, Tailwind, Context API (`AppContext`, `WorkflowCacheContext`, etc.). UI componentizada no padrão shadcn/ui.
*   **Backend / Banco de Dados:** Supabase (PostgreSQL). Tabelas separadas para domínios: `clientes`, `leads`, `clientes_sessoes`, `commercial_materials`, `fin_transactions`.
*   **Segurança:** Autenticação via Supabase Auth + RLS (Row Level Security) rigorosa nas tabelas, geralmente `auth.uid() = user_id`.
*   **Storage:** Cloudflare R2 (gerenciado via `useR2Upload.ts`), evitando uso do Supabase Storage.
*   **Background Jobs:** Cloudflare Workers (para tarefas externas/borda) e Supabase Edge Functions (para integrações Asaas/MercadoPago).

## 4. Estruturas Existentes a Reutilizar
*   `clientes`: Base central de contatos.
*   `leads`: Controle do funil de vendas.
*   `lead_statuses`: Configuração de etapas do pipeline (Novo, Aguardando, etc.).
*   `clientes_sessoes`: Controle do andamento dos ensaios (Workflow).
*   `commercial_materials`: Base do módulo de propostas/orçamentos.
*   `fin_transactions` / `cobrancas`: Gestão financeira para relatórios.
*   `galerias`: Integração com entrega de fotos.
*   **R2 (Cloudflare)**: Armazenamento de mídia de mensagens (áudio, imagem, vídeo).

## 5. Estruturas a Modificar
*   **Leads:** Garantir vínculo de múltiplos leads ao mesmo contato do WhatsApp ao longo do tempo (já suportado via `cliente_id`, mas exigirá controle na interface para evitar duplicidade visual).
*   **R2 Contexts:** Adicionar contexto `whatsapp-media` em `useR2Upload.ts` para categorizar o storage.

## 6. Novas Estruturas Necessárias
*   `conversas_instancias`: Conexão entre o fotógrafo e o dispositivo (Evolution API session).
*   `conversas_contatos`: Mapeamento de JIDs do WhatsApp para `clientes` do Lunari.
*   `conversas_mensagens`: Histórico de mensagens.
*   `conversas_templates`: Templates de mensagens em texto.
*   `conversas_notas`: Notas internas associadas ao chat.

## 7. Modelo de Dados

### `conversas_instancias`
*   `id` (uuid, PK)
*   `user_id` (uuid, FK auth.users)
*   `instance_name` (text) - Nome na Evolution API
*   `token` (text) - Auth da Evolution
*   `status` (enum: connected, disconnected, connecting)
*   `created_at`, `updated_at`

### `conversas_contatos`
*   `id` (uuid, PK)
*   `user_id` (uuid, FK auth.users)
*   `cliente_id` (uuid, FK clientes) - Opcional inicialmente (contato não salvo).
*   `whatsapp_id` (text) - JID do WhatsApp (ex: 551199999999@s.whatsapp.net)
*   `nome_whatsapp` (text)
*   `avatar_url` (text) - Opcional
*   `unread_count` (int)
*   `last_message_at` (timestamptz)
*   `created_at`, `updated_at`

### `conversas_mensagens`
*   `id` (uuid, PK)
*   `user_id` (uuid, FK auth.users)
*   `contato_id` (uuid, FK conversas_contatos)
*   `evolution_msg_id` (text) - ID original do WhatsApp.
*   `direction` (enum: INBOUND, OUTBOUND)
*   `type` (enum: TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT)
*   `content` (text) - Texto da mensagem
*   `media_url` (text) - URL no Cloudflare R2 (se possuir mídia)
*   `status` (enum: SENT, DELIVERED, READ, FAILED)
*   `created_at`

### `conversas_notas`
*   `id` (uuid, PK)
*   `user_id` (uuid, FK auth.users)
*   `contato_id` (uuid, FK conversas_contatos)
*   `content` (text)
*   `created_at`

### `conversas_templates`
*   `id` (uuid, PK)
*   `user_id` (uuid, FK auth.users)
*   `categoria` (enum: PRIMEIRO_ATENDIMENTO, ORCAMENTO, FOLLOW_UP, POS_VENDA, etc.)
*   `titulo` (text)
*   `conteudo` (text)
*   `created_at`, `updated_at`

## 8. Relacionamentos
*   **Contato ↔ Cliente:** 1 `conversas_contatos` (WhatsApp) pode mapear para 1 `clientes`. Se o fotógrafo edita o contato e salva, um `cliente` é gerado e o link é feito.
*   **Contato ↔ Leads:** 1 `conversas_contatos` pode ter N `leads` através do `cliente_id`. A UI exibe as oportunidades ativas do cliente.
*   **Mensagens:** Pertencem a 1 `conversas_contatos`.

## 9. Fluxo da Evolution API e Webhooks
1.  **WhatsApp** recebe mensagem.
2.  **Evolution API (VPS Contabo)** dispara evento via Webhook.
3.  **Cloudflare Worker** recebe Webhook:
    *   Valida payload (signature/token).
    *   Normaliza o payload (remove metadados inúteis).
    *   Extrai/faz upload de mídia (caso exista) em background para o **R2**.
    *   Aciona a Edge Function ou insere direto no **Supabase** via REST/PostgREST.
4.  **Supabase** persiste em `conversas_mensagens` e atualiza `last_message_at` em `conversas_contatos`.
5.  **Frontend (React)** escuta o evento via Supabase Realtime e atualiza UI.

## 10. Identificação e Deduplicação de Contatos
*   A chave primária natural de identificação é o número formatado (`whatsapp_id`).
*   Ao receber webhook de um número inédito:
    1. Worker busca em `conversas_contatos` pelo `whatsapp_id`.
    2. Se não achar, busca em `clientes` pelo campo `telefone` ou `whatsapp`.
    3. Cria `conversas_contatos` associando ao `cliente_id` se houver match.
    4. Caso contrário, cria `conversas_contatos` órfão (sem `cliente_id`).
*   **Regra:** Nova mensagem NUNCA cria `clientes` e NUNCA cria `leads` automaticamente. Cria apenas `conversas_contatos`.

## 11. Realtime
Será utilizado **Supabase Realtime**, alinhado à estratégia já utilizada no `WorkflowCacheContext`.
Canais:
*   `conversas:contatos:user_id` - Para atualizar ordenação e badge de não lidas na sidebar.
*   `conversas:mensagens:contato_id` - Para atualizar a lista de mensagens do chat ativo.

## 12. Armazenamento de Mídia
*   **Não usar Supabase Storage.**
*   Imagens, vídeos e áudios que chegam pelo Webhook devem ser extraídos pelo Cloudflare Worker ou via background job e jogados num bucket dedicado no **Cloudflare R2**.
*   Apenas o link final é salvo no Supabase.

## 13. RLS e Segurança
*   `conversas_instancias`, `conversas_contatos`, `conversas_mensagens`, `conversas_notas`, `conversas_templates` devem possuir RLS obrigatório:
    `auth.uid() = user_id`.
*   Nenhum acesso anônimo.
*   O Cloudflare Worker deve usar Service Role Key ou chaves específicas autenticadas para injetar as mensagens.

## 14. Responsabilidades
*   **Frontend:** UI/UX, gerenciamento de estado (Context), Realtime, cache, manipulação das regras contextuais (exibição de atalhos e sugestões).
*   **Supabase:** Persistência relacional pura, RLS, regras base, disparo de Realtime (Subscriptions).
*   **Cloudflare Workers:** Ingestão de webhooks, normalização, processamento de media buffers (upload pro R2).
*   **VPS Contabo:** Rodar instâncias da Evolution API (isolada da lógica de negócios do Lunari).

## 15. Integrações Específicas
*   **Com Leads:** O painel lateral direito de Conversas exibirá o `lead` atual ativo do cliente. Se mudar o status lá (`lead_statuses`), reflete no Kanban principal.
*   **Com Workflow:** Exibir próximas sessões (`clientes_sessoes`) associadas ao `cliente_id`. Botões de atalho para enviar orientações pré-sessão.
*   **Com Orçamentos:** Buscar propostas em `commercial_materials` (onde `material_shares` tem o `cliente_id`). O fotógrafo pode gerar um link com 1 clique.
*   **Com Financeiro:** Mostrar "Valor Pendente" / "Atrasado" lendo de `cobrancas` ou `fin_transactions`.
*   **Com Gallery:** Exibir galerias do cliente, com ação rápida "Enviar link da Galeria".

## 16. Templates
Utilizar a tabela `conversas_templates`. O frontend fará parse de variáveis textuais (ex: `{nome}`, `{data}`) cruzando os dados de `clientes` e `clientes_sessoes`. Ao invés de disparo imediato, os templates sempre preenchem o input de texto do frontend.

## 17. Motor de Sugestões Contextuais Sem IA
Lógica client-side baseada em heurísticas determinísticas:
1.  Se contato = Novo -> Sugerir aba "Criar Lead" e Template "Primeiro Atendimento".
2.  Se Lead = "Orçamento Enviado" + Última mensagem do Fotógrafo há > 24h -> Sugerir Template "Follow-up Orçamento".
3.  Regex/Keyword matching simples ("valor", "quanto custa") -> Sugerir Template de Tabela de Preços/Orçamento.

## 18. Arquitetura Futura IA/Lu
A "Lu" funcionará sob demanda. Ela rodará em um Worker (`workers/proposals-ai` ou novo `workers/conversas-ai`) recebendo o contexto da conversa, e responderá JSON determinístico que acionará ações do frontend (rascunhar mensagem, mudar etapa). **Ela não insere mensagens diretamente no DB**.

## 19. Limites e Invariantes
*   **Invariante:** Mensagem recebida não afeta funil financeiro ou funil de vendas sem ação explícita (fotógrafo clica em algo).
*   **Invariante:** Mensagens são imutáveis (exceto status de leitura e entrega).
*   **Invariante:** O armazenamento pesado (vídeos, aúdios grandes) precisa de rotinas de retenção/expurgo (limpeza de R2), pois WhatsApp trafega muito volume inútil.

## 20. Riscos Conhecidos
*   **Custos de Storage R2:** Reter mídias indefinidamente de todos os clientes custará caro. Sugere-se expurgo de mídias pesadas recebidas após X meses.
*   **Limites de Conexão Supabase:** O fluxo intenso de webhooks deve passar obrigatoriamente por um worker (buffer/fila) caso a Evolution API mande bursts.

---
**Documentação permanente salva para uso das fases de implementação.**
