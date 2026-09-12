# Plano de Implementação do Módulo de Conversas — Lunari

**Documento Oficial de Execução Técnica**  
**Versão:** 1.1 · **Status:** Pronto para Homologação da Fase 0  
**Referência Arquitetural:** `docs/CONVERSAS_ARCHITECTURE.md` (v1.1)

---

## Visão Geral e Diretrizes de Execução

O plano a seguir é dividido em 16 fases independentes, sequenciais e verificáveis.  
**Regras de Governança:**
- Nenhuma fase deve ser iniciada sem que os critérios de aceite da fase anterior tenham sido testados e validados.
- Nenhuma tabela ou migration deve ser criada antes da conclusão da Fase 0.
- A versão 1.1 do módulo é **100% livre de inteligência artificial generativa**. Todas as decisões são orientadas por regras determinísticas e contexto do CRM.
- Nenhuma funcionalidade de Gallery será incorporada ao painel de Conversas (apenas redirecionamento externo para envio).

---

## FASE 0: Validação de Arquitetura, Contratos e Modelo de Dados

### Objetivo
Validar e homologar formalmente o modelo de dados, contratos de payload da Evolution API, estratégia de secrets e configurações de rede antes de qualquer criação de migration ou código.

### Contexto
Garante que decisões estruturais críticas (como a separação entre Contato e Chat, normalização de telefones brasileiros e segurança de tokens da Evolution) estejam 100% alinhadas com as diretrizes do Lunari.

### Pré-requisitos
Aprovação formal do documento `docs/CONVERSAS_ARCHITECTURE.md` (v1.1).

### Arquivos/áreas afetadas
- `docs/CONVERSAS_ARCHITECTURE.md`
- `docs/CONVERSAS_IMPLEMENTATION_PLAN.md`
- Configurações da VPS Contabo (Evolution API)
- Cloudflare Dashboard (rotas e secrets)

### Banco de dados
- **Decisão Técnica a Validar:** Homologar a estrutura com 6 tabelas (`conversas_instancias`, `conversas_contatos`, `conversas_chats`, `conversas_mensagens`, `conversas_notas`, `conversas_templates`).
- **Validação de Chaves:** Confirmar a chave de idempotência `UNIQUE(user_id, evolution_msg_id)`.
- **Validação de RLS:** Confirmar aplicação da regra de isolamento `auth.uid() = user_id`.

### Backend
- Definir especificação do contrato OpenAPI/JSON entre Evolution API e o Cloudflare Worker.
- Mapear headers de autenticação (`apikey` global na VPS vs JWT do Supabase no frontend).

### Frontend
- N/A.

### Integrações
- Evolution API (VPS Contabo) e Cloudflare Workers.

### Regras de negócio
- O token administrativo da Evolution API jamais será persistido em tabelas que o frontend tenha permissão de ler via Supabase Client.
- O nono dígito em celulares brasileiros deve ser tratado no nível de contrato de dados.

### Critérios de aceite
1. Contratos de webhook e payload de envio documentados e validados com exemplos reais da Evolution API.
2. Definição da VPS e URL de webhook homologadas.
3. Todas as dúvidas arquiteturais e decisões pendentes sanadas.

### Testes
- Teste de conectividade e emissão de webhook a partir da Evolution API para um webhook listener de teste.

### Riscos
- Especificações da versão da Evolution API divergirem do esperado.

### Dependências
- Nenhuma.

### NÃO FAZER
- **NÃO criar migrations no Supabase.**
- **NÃO criar Workers ou alterar código do repositório.**

---

## FASE 1: Migrations do Banco de Dados, Índices e Segurança (RLS)

### Objetivo
Criar as tabelas no Supabase com tipos estritos, índices de performance e políticas de Row Level Security (RLS).

### Contexto
Estabelece a fundação relacional para persistência de chats, contatos e mensagens, alinhada às regras do projeto.

### Pré-requisitos
FASE 0 aprovada.

### Arquivos/áreas afetadas
- `supabase/migrations/YYYYMMDDHHMMSS_conversas_schema.sql` (Novo)
- `src/integrations/supabase/types.ts` (Regenerado via Supabase CLI)

### Banco de dados
- **Novas Tabelas:**
  - `conversas_instancias`
  - `conversas_contatos`
  - `conversas_chats`
  - `conversas_mensagens`
  - `conversas_notas`
  - `conversas_templates`
- **Tabelas Existentes Relacionadas:**
  - `clientes(id)` (FK opcional em `conversas_contatos`)
  - `auth.users(id)` (FK obrigatória em todas)
- **Índices Críticos:**
  - `idx_conversas_mensagens_idempotencia`: `UNIQUE(user_id, evolution_msg_id)`
  - `idx_conversas_chats_last_msg`: `INDEX(user_id, last_message_at DESC)`
  - `idx_conversas_contatos_phone`: `INDEX(user_id, phone_normalized)`
- **RLS:** Habilitado em todas as tabelas com política: `auth.uid() = user_id`.

### Backend
- Executar e validar a migration no Supabase local/produção.
- Regenerar types TypeScript do Supabase.

### Frontend
- N/A.

### Integrações
- N/A.

### Regras de negócio
- Deleção em cascata somente a partir do usuário (`auth.users`). A deleção de um `cliente` do CRM não deleta o histórico de mensagens (apenas seta `cliente_id = NULL` em `conversas_contatos`).

### Critérios de aceite
1. Migration aplicada sem erros no Supabase.
2. `src/integrations/supabase/types.ts` contém todas as novas interfaces.
3. Teste manual de RLS comprovando que o Usuário A não enxerga dados do Usuário B.

### Testes
- Teste de injeção direta via SQL validando constraints de unicidade e bloqueio de leitura anônima/cruzada por RLS.

### Riscos
- Erros de tipagem em `types.ts` se a geração de types quebrar scripts de build existentes.

### Dependências
- FASE 0.

### NÃO FAZER
- Não criar triggers complexos ou regras de negócio em SQL nesta fase.

---

## FASE 2: Ingestão de Webhooks, Idempotência e Cloudflare Worker

### Objetivo
Construir o Cloudflare Worker de webhook para recepcionar mensagens do WhatsApp via Evolution API, validar a assinatura, aplicar idempotência e persistir registros no Supabase.

### Contexto
O tráfego de entrada precisa ser absorvido na borda sem sobrecarregar a conexão de dados do Supabase e garantindo resposta ágil para a Evolution API.

### Pré-requisitos
FASE 1 concluída.

### Arquivos/áreas afetadas
- `workers/conversas-webhook/` (Novo projeto Cloudflare Worker)
  - `wrangler.toml`
  - `src/index.ts`
  - `src/handlers/messageUpsert.ts`
  - `src/handlers/messageUpdate.ts`
  - `src/services/supabaseClient.ts`
  - `src/utils/phone.ts`

### Banco de dados
- Leitura e gravação em `conversas_instancias`, `conversas_contatos`, `conversas_chats`, `conversas_mensagens`.

### Backend
- Cloudflare Worker configurado com endpoint `POST /webhook/evolution`.
- Validação do token de webhook recebido no header `apikey` contra `WEBHOOK_GLOBAL_SECRET`.
- Parser dos eventos: `MESSAGES_UPSERT`, `MESSAGES_UPDATE`, `CONNECTION_UPDATE`.
- Gravação com Service Role Key no Supabase.

### Frontend
- N/A.

### Integrações
- Evolution API (VPS) enviando webhooks para a Cloudflare.

### Regras de negócio
- O webhook deve responder `200 OK` em menos de 500ms.
- **Idempotência estrita:** Mensagens com o mesmo `evolution_msg_id` para o mesmo usuário são ignoradas no insert (`ON CONFLICT DO NOTHING`).
- Nova mensagem recebida cria contato (`conversas_contatos`) e chat (`conversas_chats`) se não existirem, mas **NUNCA cria Lead nem Cliente**.

### Critérios de aceite
1. Mensagem de texto enviada por um celular para o número conectado na Evolution API é persistida em `conversas_mensagens` em menos de 1 segundo.
2. Reenvio duplicado do webhook não gera linhas duplicadas no banco.

### Testes
- Teste com curl simulando payload do webhook da Evolution API.
- Teste de carga com envio em rajada para validar latência e concorrência.

### Riscos
- A VPS falhar em resolver o DNS da Cloudflare ou timeout de rede.

### Dependências
- FASE 1.

### NÃO FAZER
- Não processar download de arquivos pesados no corpo da requisição do webhook (isso é reservado para a Fase 4).

---

## FASE 3: Envio de Mensagens e Normalização de Telefones

### Objetivo
Implementar o fluxo seguro de envio de mensagens a partir do Lunari para o WhatsApp, com tratamento canônico de números brasileiros.

### Contexto
Permitir que a aplicação envie mensagens sem expor chaves da Evolution API e garantindo entrega em números com ou sem o nono dígito.

### Pré-requisitos
FASE 2 concluída.

### Arquivos/áreas afetadas
- `workers/conversas-api/` (Endpoint seguro de envio)
- `src/domain/conversas/phoneNormalization.ts` (Novo utilitário no frontend/worker)
- `src/services/conversasService.ts` (Novo serviço no frontend)

### Banco de dados
- Inserção em `conversas_mensagens` com status `sent`.
- Atualização de `conversas_chats.last_message_*`.

### Backend
- Rota segura `POST /api/conversas/send`:
  - Valida JWT do fotógrafo.
  - Verifica se o fotógrafo é dono da instância ativa.
  - Normaliza o número de destino para formato E.164 brasileiro.
  - Despacha para a Evolution API (`POST /message/sendText`).
  - Grava a mensagem enviada no Supabase.

### Frontend
- Função de serviço no frontend para despachar mensagens com estado otimista.

### Integrações
- Evolution API (VPS) endpoint `/message/sendText`.

### Regras de negócio
- O frontend nunca se comunica diretamente com o IP/domínio da VPS Contabo; todo tráfego passa pela API intermediária autenticada.
- Telefones brasileiros devem ser normalizados considerando DDI 55, DDD e 9 dígitos para celulares.

### Critérios de aceite
1. Disparo de requisição pela API resulta em recebimento da mensagem no WhatsApp do destinatário.
2. Mensagem enviada é registrada no banco com `direction = 'outbound'` e `status = 'sent'`.

### Testes
- Envio para números com máscara, sem máscara, com 8 dígitos e com 9 dígitos.
- Tentativa de envio com token JWT expirado ou inválido (deve retornar 401 Unauthorized).

### Riscos
- Instância da Evolution desconectar silenciosamente durante o envio (deve retornar erro 422 com mensagem amigável).

### Dependências
- FASE 2.

### NÃO FAZER
- Não implementar envio de mídia complexa nesta fase (somente texto).

---

## FASE 4: Pipeline de Mídias Assíncrono com Cloudflare R2

### Objetivo
Processar, armazenar no Cloudflare R2 e servir mídias de WhatsApp (áudios, imagens, vídeos, PDFs) sem bloquear o ciclo de vida dos webhooks.

### Contexto
WhatsApp trafega alto volume de mídia que não pode residir na VPS nem no storage do Supabase. O projeto já utiliza R2 e possui infraestrutura pronta (`src/lib/gestaoR2Upload.ts`).

### Pré-requisitos
FASES 2 e 3 concluídas.

### Arquivos/áreas afetadas
- `src/lib/gestaoR2Upload.ts` (Adicionar contexto `'whatsapp-media'`)
- `workers/conversas-webhook/src/services/r2MediaUploader.ts` (Novo)
- `src/components/conversas/media/` (Visualizadores de áudio, imagem e PDF)

### Banco de dados
- Atualização em `conversas_mensagens`: `media_url`, `media_mime_type`, `media_status`.

### Backend
- Worker recebe webhook de mídia, salva mensagem com `media_status = 'pending_upload'`.
- Dispara `ctx.waitUntil()` no Cloudflare Worker para fazer download da mídia da Evolution e upload em stream para o bucket do R2.
- Atualiza a linha no Supabase com a URL permanente do R2 e `media_status = 'ready'`.

### Frontend
- Componentes de reprodução de áudio `.ogg`/`.mp3` com player personalizado.
- Lightbox para imagens e preview seguro de documentos PDF.

### Integrações
- Cloudflare R2 Bucket e Evolution API.

### Regras de negócio
- Se o upload no R2 falhar após 3 tentativas, marcar `media_status = 'error'` sem descartar o texto da mensagem.

### Critérios de aceite
1. Foto ou áudio enviado no WhatsApp aparece com link do R2 no banco e é reproduzido corretamente no navegador.
2. O webhook da Evolution continua respondendo 200 OK em menos de 500ms, mesmo para vídeos de 15MB.

### Testes
- Teste de envio e recebimento de notas de voz de WhatsApp (áudio PTT).
- Teste de envio de imagens em alta resolução e documentos PDF.

### Riscos
- Formatos de áudio do WhatsApp (`audio/ogg; codecs=opus`) exigirem atenção no player de navegadores Safari/iOS.

### Dependências
- FASE 3.

### NÃO FAZER
- Não implementar compressão de vídeo pesada no Worker.

---

## FASE 5: Interface Básica de Conversas (Layout 3 Painéis + Chat)

### Objetivo
Desenvolver a interface visual principal do módulo em `/app/conversas` com três painéis (Lista de Conversas, Área de Chat, Painel de Contexto).

### Contexto
O fotógrafo precisa de uma experiência visual rápida, limpa e produtiva, idêntica aos padrões de qualidade do Lunari e do WhatsApp Web.

### Pré-requisitos
FASES 1, 2 e 3 concluídas.

### Arquivos/áreas afetadas
- `src/pages/Conversas.tsx` (Nova página)
- `src/components/conversas/ListaChats.tsx`
- `src/components/conversas/ItemChat.tsx`
- `src/components/conversas/JanelaMensagens.tsx`
- `src/components/conversas/BolhaMensagem.tsx`
- `src/components/conversas/CampoComposicao.tsx`
- `src/components/conversas/PainelContexto.tsx`
- `src/routes/` ou `src/App.tsx` (Registro da rota `/app/conversas`)
- `src/components/layout/Sidebar.tsx` (Inclusão do item no menu principal)

### Banco de dados
- Consultas paginadas em `conversas_chats` e `conversas_mensagens`.

### Backend
- N/A (Consumo via Supabase Client padrão).

### Frontend
- **Painel Esquerdo (Lista de Conversas):**
  - Barra de busca por nome ou número.
  - Filtros rápidos: `Todas`, `Não lidas`, `Leads`, `Clientes`.
  - Lista com scroll infinito virtualizado (`react-window` ou similar se necessário).
  - Badge de mensagens não lidas.
- **Painel Central (Conversa Ativa):**
  - Header com foto, nome do contato e status de conexão.
  - Histórico de mensagens agrupado por data.
  - Campo de composição com textarea expansível e botão de anexo.
- **Painel Direito (Contexto):**
  - Estrutura base com abas e placeholders das próximas fases.

### Integrações
- N/A.

### Regras de negócio
- A lista de conversas deve priorizar a densidade e visibilidade rápida de quem está esperando resposta.
- O campo de composição envia a mensagem ao pressionar Enter (Shift+Enter para nova linha).

### Critérios de aceite
1. Usuário acessa `/app/conversas` e visualiza a lista de conversas ordenadas por data da última mensagem.
2. Ao clicar em uma conversa, o histórico carrega e novas mensagens podem ser digitadas e enviadas.

### Testes
- Renderização limpa em telas 1920x1080 e 1366x768.
- Teste de paginação ao rolar o histórico para cima.

### Riscos
- Scroll jumping (pulo de scroll ao carregar mensagens anteriores).

### Dependências
- FASE 3.

### NÃO FAZER
- Não integrar Realtime ainda nesta fase (utilizar revalidação do React Query).
- Não implementar lógica complexa do painel direito ainda.

---

## FASE 6: Sincronização em Realtime e Ciclo de Vida de Mensagens

### Objetivo
Conectar a interface ao Supabase Realtime para recebimento instantâneo de mensagens e atualização de status (Sent, Delivered, Read).

### Contexto
Evitar necessidade de refresh manual e garantir feedback imediato de comunicação.

### Pré-requisitos
FASES 4 e 5 concluídas.

### Arquivos/áreas afetadas
- `src/contexts/ConversasContext.tsx` (Novo Contexto)
- `src/hooks/useConversasRealtime.ts` (Novo Hook)
- `src/components/conversas/StatusMensagem.tsx` (Ticks cinzas e azuis)

### Banco de dados
- Tabelas com Realtime Replication ativada: `conversas_chats`, `conversas_mensagens`.

### Backend
- Garantir que `ALTER PUBLICATION supabase_realtime ADD TABLE conversas_chats, conversas_mensagens;` esteja configurado.

### Frontend
- Subscrição no canal `conversas_mensagens:chat_id=eq.{activeChatId}`.
- Subscrição no canal `conversas_chats:user_id=eq.{userId}` para reordenar a lista à esquerda e atualizar o contador global de não lidas.
- Atualização visual dos ícones de status:
  - Relógio: `pending`
  - 1 tick cinza: `sent`
  - 2 ticks cinzas: `delivered`
  - 2 ticks azuis: `read`

### Integrações
- Supabase Realtime.

### Regras de negócio
- Quando o fotógrafo está com o chat aberto, o sistema envia evento de leitura e zera o `unread_count` do chat.

### Critérios de aceite
1. Mensagem enviada pelo celular do cliente surge na tela do fotógrafo em menos de 500ms sem recarregar a página.
2. Quando o cliente abre a mensagem no celular, os ticks na tela do Lunari mudam de cinza para azul em tempo real.

### Testes
- Teste com duas janelas abertas simultaneamente (simulação de envio e recebimento em tempo real).
- Teste de reconexão de rede (desligar e religar Wi-Fi e verificar se o Realtime reconecta).

### Riscos
- Limite de conexões simultâneas do Supabase Realtime se houver vazamento de canais não destruídos no unmount.

### Dependências
- FASE 5.

### NÃO FAZER
- Não implementar digitação ao vivo (`composing...`) na V1.

---

## FASE 7: Deduplicação e Vínculo de Contatos com o CRM (`clientes`)

### Objetivo
Implementar o motor de identificação que vincula contatos do WhatsApp a registros existentes na tabela `clientes` e permitir criação de novos clientes a partir da conversa.

### Contexto
Eliminar a fragmentação de dados e garantir que o fotógrafo saiba imediatamente com qual cliente do estúdio está falando.

### Pré-requisitos
FASE 5 concluída.

### Arquivos/áreas afetadas
- `src/domain/conversas/contactMatcher.ts` (Serviço de matching)
- `src/components/conversas/VinculoClienteModal.tsx`
- `src/components/conversas/CriarClienteRapidoModal.tsx`

### Banco de dados
- Consulta em `clientes` por `telefone`, `whatsapp` normalizados.
- Atualização de `conversas_contatos.cliente_id`.

### Frontend
- Se o contato não possuir `cliente_id`:
  - Exibir badge `"Contato não cadastrado"`.
  - Botão `[Vincular a Cliente Existente]` (com busca inteligente).
  - Botão `[Cadastrar como Novo Cliente]`.
- Se vinculado:
  - Exibir nome oficial do cliente, link para perfil completo e tags.

### Integrações
- Módulo `clientes`.

### Regras de negócio
- A busca por telefone deve tolerar a presença ou ausência do nono dígito (ver Seção 11 de Arquitetura).
- Vincular um contato a um cliente **NUNCA** altera os dados já cadastrados do cliente sem confirmação explícita.

### Critérios de aceite
1. Mensagem recebida de um número já cadastrado em `clientes` vincula-se automaticamente e exibe o nome do cliente.
2. Fotógrafo consegue criar um cliente no CRM diretamente da conversa com 1 clique.

### Testes
- Teste de matching com números cadastrados com máscaras variadas: `(11) 9999-8888`, `+5511999998888`, `11999998888`.
- Teste de desvinculação manual e re-vinculação.

### Riscos
- Múltiplos clientes cadastrados no CRM com o mesmo telefone (deve exibir lista para o fotógrafo escolher o correto).

### Dependências
- FASE 5.

### NÃO FAZER
- Não criar leads automaticamente nesta etapa.

---

## FASE 8: Integração com Leads e Pipeline Comercial (Fonte Única de Verdade)

### Objetivo
Integrar o funil de vendas à conversa, permitindo visualizar, criar oportunidades e alterar etapas do lead em sincronia total com a página `/app/leads`.

### Contexto
Garantir que a negociação seja acompanhada diretamente pelo chat sem criar sistemas de pipeline paralelos.

### Pré-requisitos
FASE 7 concluída.

### Arquivos/áreas afetadas
- `src/components/conversas/painel/LeadContextCard.tsx`
- `src/components/conversas/painel/MudarEtapaDropdown.tsx`
- `src/components/conversas/painel/CriarLeadModal.tsx`
- `src/hooks/useLeadOperations.ts` (Reutilização de operações do módulo de Leads)

### Banco de dados
- Tabelas: `leads`, `lead_statuses`.
- Atualização do campo `leads.status`.

### Frontend
- No Painel Direito da conversa:
  - Exibe o Lead ativo associado ao cliente/contato.
  - Dropdown com todas as etapas (`lead_statuses`) com as cores configuradas pelo usuário.
  - Histórico de outros leads fechados/perdidos da mesma pessoa.
  - Botão `[+ Nova Oportunidade]` para reengajamento comercial.

### Integrações
- Módulo `leads` e hook `useLeadStatuses`.

### Regras de negócio
- Se o fotógrafo alterar a etapa em Conversas, a tabela `leads` é atualizada e a página de Leads reflete via Realtime/Cache.
- Um cliente pode ter múltiplas oportunidades ao longo do tempo (ex: Gestante [Fechado] e Natal [Novo]).
- A alteração de status respeita as regras e triggers existentes de `leads`.

### Critérios de aceite
1. Alterar a etapa do lead no dropdown da conversa reflete imediatamente no Kanban da página `/app/leads`.
2. Alterar o card no Kanban reflete imediatamente no dropdown da conversa ativa.

### Testes
- Teste de concorrência: alterar em uma aba e verificar sincronia na outra sem refresh.
- Teste de criação de segunda oportunidade para o mesmo cliente.

### Riscos
- Conflito de cache se a página de Leads usar React Query com chave divergente da utilizada em Conversas.

### Dependências
- FASE 7.

### NÃO FAZER
- Não criar tabela de etapas de conversa.
- Não automatizar criação de lead por IA nesta fase.

---

## FASE 9: Integração com Workflow, Orçamentos e Financeiro (Painel Expandido)

### Objetivo
Exibir os dados de sessões agendadas, propostas comerciais e situação financeira do cliente dentro do Painel Direito Expandido de Conversas.

### Contexto
Centralizar o contexto de atendimento para que o fotógrafo responda dúvidas de contrato, pagamento e data de ensaio em segundos.

### Pré-requisitos
FASE 8 concluída.

### Arquivos/áreas afetadas
- `src/components/conversas/painel/PainelExpandido.tsx`
- `src/components/conversas/painel/SecaoWorkflow.tsx`
- `src/components/conversas/painel/SecaoOrcamentos.tsx`
- `src/components/conversas/painel/SecaoFinanceiro.tsx`
- `src/hooks/useMaterialShares.ts`
- `src/hooks/useSessionFinancialSummary.ts`

### Banco de dados
- Consultas somente-leitura em:
  - `clientes_sessoes`
  - `commercial_materials`, `material_shares`
  - `fin_transactions`, `cobrancas`

### Frontend
- **Bloco Workflow:** Exibe a próxima sessão do cliente (data, hora, pacote, local) com atalho `[Abrir no Workflow]`.
- **Bloco Orçamentos:** Lista propostas vinculadas ao cliente em `material_shares`, valor total e botão `[Inserir Link no Chat]`.
- **Bloco Financeiro:** Exibe Total Contratado, Valor Pago e Saldo Devedor. Botão de ação rápida `[Gerar Link de Cobrança]` (reutilizando integração InfinitePay/MercadoPago existente).

### Integrações
- Módulos `workflow`, `comercial` (propostas) e `financas`.

### Regras de negócio
- Nenhuma informação financeira ou de proposta é editada por dentro de Conversas; apenas ações rápidas de geração de link e consulta são disponibilizadas.
- O bloco de Orçamentos busca em `commercial_materials` e `material_shares` (nunca em tabela inexistente "orcamentos").
- **Regra Gallery:** Nenhum componente de fotos ou galeria é exibido aqui (apenas atalho se houver sessão vinculada).

### Critérios de aceite
1. Cliente com sessão agendada exibe data e pacote corretos no painel.
2. Clicar em "Inserir Orçamento" preenche o campo de texto da conversa com a mensagem formatada e o link da proposta.
3. Resumo financeiro bate exatamente com os valores da página de Finanças.

### Testes
- Teste com cliente sem sessões (estado vazio amigável).
- Teste com cliente com múltiplos pagamentos parciais.

### Riscos
- Lentidão ao carregar muitos dados relacionais (necessário paralelizar queries com `Promise.all` ou hooks separados).

### Dependências
- FASE 8.

### NÃO FAZER
- Não permitir edição de parcelas ou exclusão de sessões por esta tela.

---

## FASE 10: Notas Internas da Conversa e Ações Rápidas

### Objetivo
Permitir que o fotógrafo registre anotações privadas sobre a conversa/cliente e execute ações frequentes com 1 clique.

### Contexto
Manter lembretes comerciais (ex: "cliente prefere fotos espontâneas") visíveis para a equipe do estúdio sem enviar ao WhatsApp.

### Pré-requisitos
FASE 5 concluída.

### Arquivos/áreas afetadas
- `src/components/conversas/painel/BlocoNotas.tsx`
- `src/components/conversas/painel/BarraAcoesRapidas.tsx`
- `src/hooks/useConversasNotas.ts`

### Banco de dados
- CRUD na tabela `conversas_notas`.

### Frontend
- Lista de notas internas no Painel Direito (com autor e data de criação).
- Input rápido para adicionar nova nota.
- Barra de Ações Rápidas contextual:
  - `[Agendar Sessão]` (abre modal da Agenda com cliente pré-preenchido)
  - `[Criar Tarefa]` (abre modal de Tarefas vinculado ao cliente)
  - `[Registrar Pagamento Manual]`

### Integrações
- Módulos `agenda` e `tarefas`.

### Regras de negócio
- Notas internas são estritamente confidenciais e jamais são despachadas via webhook para o WhatsApp.

### Critérios de aceite
1. Fotógrafo digita uma nota e salva; ela aparece imediatamente na lista de notas.
2. A nota permanece gravada e visível ao recarregar a conversa.

### Testes
- Validação de RLS garantindo que outro estúdio não consiga ler as notas.

### Riscos
- Confusão do usuário entre campo de mensagem do WhatsApp e campo de nota interna (necessário distinção visual clara com cor de fundo amarela/neutra).

### Dependências
- FASE 5.

### NÃO FAZER
- Não implementar menções de usuários (@equipe) nesta fase.

---

## FASE 11: Sistema de Templates de Mensagens (Manual e Variáveis)

### Objetivo
Implementar o gerenciamento e a utilização de templates de resposta rápida com preenchimento dinâmico de variáveis.

### Contexto
Fotógrafos economizam horas de digitação padronizando mensagens de primeiro atendimento, orientações de ensaio e instruções de pagamento.

### Pré-requisitos
FASE 5 e FASE 7 concluídas.

### Arquivos/áreas afetadas
- `src/pages/Configuracoes.tsx` (Adição da aba "Templates de WhatsApp")
- `src/components/conversas/TemplatesPopover.tsx` (Ativado por `/`)
- `src/components/conversas/TemplatesDrawer.tsx` (Gaveta lateral completa)
- `src/domain/conversas/templateParser.ts` (Substituição de variáveis)
- `src/hooks/useConversasTemplates.ts`

### Banco de dados
- CRUD na tabela `conversas_templates`.

### Frontend
- **Editor de Templates:** Em Configurações, tela para criar/editar templates por categoria (`primeiro_atendimento`, `orcamento`, `lembrete`, etc.) com inserção rápida de tags (`{nome}`, `{categoria}`, `{data}`, etc.).
- **Uso no Chat:**
  - Digitar `/` no campo de composição abre lista de busca instantânea.
  - Ícone de templates na barra de ferramentas abre gaveta completa.
- **Inserção no Campo:** Ao selecionar o template, o texto com variáveis substituídas é inserido no campo de texto para revisão do fotógrafo.

### Integrações
- Dados de `clientes`, `clientes_sessoes` e perfil do estúdio.

### Regras de negócio
- Clicar em um template **JAMAIS dispara a mensagem automaticamente**. Sempre insere no campo de composição para revisão.
- Variáveis não preenchidas (ex: `{data}` para cliente sem sessão) são substituídas por espaço em branco ou sinalizadas ao usuário.

### Critérios de aceite
1. Digitar `/natal` no chat insere a mensagem com o nome real do cliente preenchido no lugar de `{nome}`.
2. Criação de template em Configurações reflete imediatamente na lista de atalhos.

### Testes
- Teste de parse de todas as variáveis suportadas.
- Teste de comportamento quando variáveis estão nulas.

### Riscos
- Erros de digitação nas variáveis pelo usuário (mitigar com botões de inserção de tags na UI).

### Dependências
- FASE 5 e 7.

### NÃO FAZER
- Não permitir disparo automático de templates nesta fase.

---

## FASE 12: Motor Determinístico de Sugestões Contextuais (Sem IA)

### Objetivo
Construir o motor client-side de heurísticas e regras de negócio para sugerir de 1 a 3 templates ou ações prioritárias no Painel Direito.

### Contexto
Antecipar as necessidades operacionais do fotógrafo com base no contexto factual da negociação, sem custo de LLM.

### Pré-requisitos
FASES 8, 9 e 11 concluídas.

### Arquivos/áreas afetadas
- `src/domain/conversas/suggestionEngine.ts` (Novo motor)
- `src/components/conversas/painel/CardsSugestoes.tsx`
- `src/hooks/useContextualSuggestions.ts`

### Banco de dados
- Consultas em memória cruzando os dados já carregados na conversa.

### Frontend
- Bloco de destaque no topo do Painel Direito com até 3 sugestões ranqueadas.
- Cada card exibe: Título da Sugestão, Motivo (ex: *"Cliente perguntou sobre valores"*), Botão de ação direta.

### Regras de negócio
- O motor avalia a matriz de sinais:
  1. Contato novo + termos de preço -> Sugere `Primeiro Atendimento` e `Criar Lead`.
  2. Lead em Orçamento Enviado + sem resposta há 48h -> Sugere `Follow-up de Orçamento`.
  3. Cliente com sessão amanhã -> Sugere `Lembrete de Ensaio`.
  4. Lead fechado sem sessão -> Sugere `Agendar Sessão`.
- Se nenhuma regra bater, exibe templates frequentes padrão.

### Critérios de aceite
1. Ao abrir conversa com mensagem *"Qual o valor do ensaio de Natal?"*, o painel sugere o template de Primeiro Atendimento e a ação Criar Lead.
2. Clicar na sugestão insere o template correspondente no chat.

### Testes
- Testes unitários no arquivo `suggestionEngine.test.ts` cobrindo os cenários da matriz de decisão.

### Riscos
- Sugestões irrelevantes causarem fadiga visual (garantir limite estrito de no máximo 3 sugestões com botão de dispensar).

### Dependências
- FASES 8, 9 e 11.

### NÃO FAZER
- **NÃO utilizar OpenAI, Claude ou Gemini nesta fase.**

---

## FASE 13: Motor de Follow-up Pendente (Identificação, Prazos e Invalidação)

### Objetivo
Identificar e sinalizar conversas comerciais que exigem acompanhamento (follow-up), respeitando a configuração de prazos do fotógrafo e cancelando a pendência se o cliente responder.

### Contexto
Garante que nenhum orçamento fique esquecido, aumentando a taxa de conversão do estúdio.

### Pré-requisitos
FASE 8 e FASE 11 concluídas.

### Arquivos/áreas afetadas
- `src/domain/conversas/followUpCalculator.ts` (Cálculo de pendência)
- `src/components/conversas/painel/FollowUpBadge.tsx`
- `src/components/conversas/FiltroFollowUp.tsx`

### Banco de dados
- Leitura de `lead_follow_up_config` (dias configurados pelo usuário).
- Leitura de `leads.status_timestamp` e `conversas_chats.last_message_at`.

### Frontend
- Tag destacada `"Follow-up Pendente"` no card da conversa e na lista lateral.
- Filtro rápido na lista de conversas: `[Follow-up Pendente]`.
- No painel direito, recomendação prioritária do template de acompanhamento configurado.

### Regras de negócio
- O follow-up só fica pendente se:
  - Lead está na etapa `Orçamento Enviado`.
  - A última mensagem foi enviada pelo fotógrafo (`outbound`).
  - O prazo de `lead_follow_up_config` foi atingido.
- **Invalidação Automática:** Se o cliente mandar uma nova mensagem (`inbound`), a condição de follow-up pendente é cancelada imediatamente.

### Critérios de aceite
1. Lead com proposta enviada há mais tempo que o configurado ganha badge de Follow-up Pendente.
2. Quando o cliente responde qualquer mensagem, o badge desaparece na mesma hora via Realtime.

### Testes
- Simulação de data de última mensagem ultrapassando o prazo configurado.
- Teste de invalidação ao simular recebimento de mensagem do cliente.

### Riscos
- Alertas excessivos se o prazo configurado for curto demais.

### Dependências
- FASES 8 e 11.

### NÃO FAZER
- Não enviar mensagens automáticas de follow-up sem intervenção humana.

---

## FASE 14: Responsividade Mobile e Experiência do Usuário

### Objetivo
Adaptar o módulo para navegação fluida em smartphones e tablets, substituindo os três painéis por um fluxo de navegação hierárquico.

### Contexto
Fotógrafos atendem clientes frequentemente pelo celular enquanto estão em trânsito ou no estúdio.

### Pré-requisitos
FASES 5 a 13 concluídas.

### Arquivos/áreas afetadas
- `src/pages/Conversas.tsx` (Controle de visualização mobile)
- `src/components/conversas/ConversasMobileLayout.tsx`
- `src/components/conversas/painel/PainelContextoDrawer.tsx` (Drawer/Bottom Sheet via shadcn `Sheet`)

### Frontend
- Em telas `< 768px`:
  - **Modo Lista (`view = 'list'`):** Ocupa 100% da tela. Ao tocar em um chat, navega para a conversa.
  - **Modo Conversa (`view = 'chat'`):** Header com botão `[← Voltar para lista]` e botão `[Informações / Contexto]`.
  - **Modo Contexto:** Abre como Drawer deslizante da direita ou Bottom Sheet, contendo o Painel de Contexto, Lead, Ações e Notas.
- Suporte a teclado virtual do mobile sem quebrar a rolagem de mensagens (`interactive-widget=resizes-content`).

### Regras de negócio
- Nunca tentar exibir lista e chat simultaneamente em dispositivos mobile portrait.

### Critérios de aceite
1. Experiência de uso fluida em iPhone/Android, idêntica a aplicativos nativos de mensagens.
2. Abertura do teclado virtual não encobre o campo de composição de texto.

### Testes
- Testes no Chrome DevTools em emulação de iPhone 14 e Pixel 7.
- Teste de gestos de swipe para fechar o drawer de contexto.

### Riscos
- Problemas de `vh` em Safari móvel com a barra de endereços (utilizar classes `h-dvh` do Tailwind).

### Dependências
- FASE 13.

### NÃO FAZER
- Não criar rotas mobile separadas; utilizar responsividade no mesmo componente de página.

---

## FASE 15: Auditoria de Segurança, Performance e Homologação Final

### Objetivo
Realizar testes de segurança em profundidade, auditoria de RLS, testes de carga na ingestão de webhooks e homologação ponta a ponta.

### Contexto
Garantir que o sistema seja robusto, não vaze dados entre fotógrafos e mantenha alta velocidade antes do lançamento oficial.

### Pré-requisitos
Todas as fases anteriores concluídas.

### Arquivos/áreas afetadas
- Todo o módulo de Conversas.
- `vite.config.ts` (Verificação de PWA Precache e Bundle Chunks).

### Banco de dados
- Auditoria de consultas lentas e análise de `EXPLAIN ANALYZE` nas queries de busca de conversas.

### Backend
- Teste de estresse no Cloudflare Worker simulando 500 webhooks simultâneos da Evolution API.

### Frontend
- Auditoria de tamanho de chunk no build (`bun run build`).
- **Verificação Crítica de PWA:** Garantir que nenhum chunk de Conversas viole as regras de precache do Service Worker (`globIgnores`).

### Critérios de aceite
1. 100% dos testes de isolamento de RLS aprovados (nenhum usuário consegue ler mensagens, notas ou contatos de outro).
2. Build de produção do Vite executado sem warnings de chunks excessivos.
3. Taxa de erro nos webhooks da Evolution API inferior a 0.01%.

### Testes
- Teste de penetração básico em endpoints da API.
- Teste de carga de mensagens.
- Teste completo de regressão nos módulos de Leads, Clientes, Workflow e Finanças.

### Riscos
- Vazamento de conexões abertas no Supabase Realtime.

### Dependências
- FASES 0 a 14.

### NÃO FAZER
- Não liberar funcionalidades de IA generativa nesta versão.

---
**Documentação Oficial da Versão 1.1 Homologada para o Repositório Lunari.**
