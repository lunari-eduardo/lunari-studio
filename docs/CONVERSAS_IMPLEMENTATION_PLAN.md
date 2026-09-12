# Plano de Implementação do Módulo de Conversas

**Status:** Aprovado para Planejamento
**Documento base:** `CONVERSAS_ARCHITECTURE.md`

Este documento define as fases de implementação do módulo Conversas, conectando-se ao WhatsApp via Evolution API. **Cada fase deve ser independente e testável.**

---

## FASE 0: Banco de Dados e Preparação
### Objetivo
Criar as estruturas no Supabase e gerar os tipos.
### Contexto
O módulo precisa das tabelas base para armazenar contatos, mensagens e instâncias do WhatsApp, sem ferir a estrutura de clientes atual.
### Pré-requisitos
Aprovação da arquitetura `CONVERSAS_ARCHITECTURE.md`.
### Arquivos/áreas afetadas
*   `supabase/migrations/`
*   `src/integrations/supabase/types.ts`
### Banco de dados
*   **Novas Tabelas:** `conversas_instancias`, `conversas_contatos`, `conversas_mensagens`, `conversas_notas`, `conversas_templates`.
*   **RLS:** `auth.uid() = user_id` para todas as novas tabelas.
*   **Relacionamentos:** `conversas_contatos.cliente_id` -> `clientes.id`.
### Backend
N/A.
### Frontend
N/A (Apenas atualização de `types.ts`).
### Integrações
N/A.
### Regras de negócio
Nenhum dado é excluído por padrão (soft delete em instâncias/contatos, se necessário).
### Critérios de aceite
Migrations rodando limpas; `types.ts` atualizado com todas as novas entidades; Políticas RLS bloqueando acesso não-autenticado.
### Testes
Testar inserção via SQL limitando por `user_id`.
### Riscos
Nenhum impacto direto no sistema existente.
### NÃO FAZER
Não criar rotinas no frontend nesta fase.

---

## FASE 1: Infraestrutura WhatsApp / Evolution API
### Objetivo
Garantir recebimento e envio básico de mensagens e persistência de mídia.
### Contexto
A Evolution API (VPS) dispara webhooks quando uma mensagem chega. Precisamos processar isso antes de salvar no DB.
### Pré-requisitos
FASE 0 concluída. Evolution API rodando na VPS.
### Arquivos/áreas afetadas
*   `workers/conversas-webhook/` (Novo Worker)
*   Supabase REST API / PostgREST
*   `src/lib/gestaoR2Upload.ts` (Adicionar contexto `whatsapp-media`)
### Banco de dados
Inserção na tabela `conversas_mensagens` e upsert em `conversas_contatos`.
### Backend
*   Criar um Cloudflare Worker (`workers/conversas-webhook`) para receber os eventos `messages.upsert` da Evolution.
*   Worker faz o parser, gerencia upload para R2 caso seja áudio/imagem e grava no Supabase usando uma chave de serviço.
### Frontend
N/A.
### Integrações
Evolution API e Cloudflare R2.
### Regras de negócio
Se o JID do WhatsApp for inédito, criar `conversas_contatos` órfão. Se já existir, atualizar `last_message_at` e `unread_count`.
### Critérios de aceite
Mensagem enviada no WhatsApp aparece no Supabase. Imagem enviada no WhatsApp vai pro R2 e a URL salva no Supabase.
### Testes
Teste de webhook local simulando os payloads JSON da Evolution API.
### Riscos
Webhooks não responderem 200 OK e a Evolution pausar envios.
### NÃO FAZER
Não implementar sincronização de mensagens antigas do WhatsApp, apenas escutar novas.

---

## FASE 2: Layout Base e Lista de Conversas
### Objetivo
Criar a interface principal (3 painéis) e gerenciar estados.
### Contexto
A tela `Conversas` precisa ter navegação independente e priorizar o chat na tela.
### Pré-requisitos
FASE 0 concluída. (Não bloqueia Pela FASE 1 para a interface em si).
### Arquivos/áreas afetadas
*   `src/pages/Conversas.tsx` (Novo)
*   `src/components/conversas/*` (Novos componentes)
*   `src/App.tsx` (Nova Rota `/app/conversas`)
### Banco de dados
Leitura em `conversas_contatos` e `conversas_mensagens`.
### Frontend
*   **Painel Esquerdo:** Lista de `conversas_contatos` ordenada por `last_message_at`. Filtros ("Não Lidas", "Todas").
*   **Painel Central:** Lista de mensagens, input de texto.
*   **Painel Direito:** (Temporariamente vazio ou placeholder).
### Integrações
N/A.
### Regras de negócio
Exibir conversas mesmo se o contato não estiver atrelado a um `cliente` no CRM.
### Critérios de aceite
Usuário pode entrar em `/app/conversas`, ver a lista de quem chamou, clicar na conversa e ver o histórico de mensagens. Enviar mensagem grava no DB (via chamada de API do frontend).
### Testes
Renderização com muitos contatos (virtualização opcional, mas recomendada).
### NÃO FAZER
Não integrar Realtime ainda. Refresh manual por enquanto.

---

## FASE 3: Realtime e Status de Mensagens
### Objetivo
Tornar o chat responsivo (atualização instantânea).
### Contexto
Usuários de chat esperam que as mensagens apareçam sem recarregar a página e que haja confirmação de entrega (Sent, Delivered, Read).
### Pré-requisitos
FASES 1 e 2 concluídas.
### Arquivos/áreas afetadas
*   `src/contexts/ConversasRealtimeContext.tsx` (Novo)
*   Cloudflare Worker (Atualizar webhook para tratar eventos de `messages.update`).
### Banco de dados
Update no campo `status` de `conversas_mensagens`.
### Frontend
*   Escutar eventos `INSERT` em `conversas_mensagens`.
*   Escutar eventos `UPDATE` em `conversas_contatos` (para reordenar a lista à esquerda).
*   Mostrar "ticks" de WhatsApp nas mensagens enviadas.
### Critérios de aceite
Duas abas abertas: uma recebe mensagem e a tela pisca/atualiza imediatamente sem refresh.
### Testes
Testar concorrência e perdas de conexão (verificar reconexão do canal).
### NÃO FAZER
Não implementar digitação (`composing`) do WhatsApp ainda.

---

## FASE 4: Integração com Contatos e Leads (Painel Direito)
### Objetivo
Conectar a conversa ao ecossistema do Lunari (CRM).
### Contexto
O usuário precisa saber com quem está falando.
### Pré-requisitos
FASE 2 concluída.
### Arquivos/áreas afetadas
*   `src/components/conversas/PainelDireito.tsx`
### Banco de dados
Consultas em `clientes` e `leads`.
### Frontend
*   Se `conversas_contatos.cliente_id` é null, exibir botão "Adicionar ao CRM".
*   Se atrelado, buscar o `cliente` e exibir Nome, Categoria, Origem.
*   Buscar `leads` onde `cliente_id` = cliente atual. Exibir os cards de leads e a etapa do funil (`lead_statuses`).
### Regras de negócio
A alteração do funil aqui atualiza o `lead_status` global e reflete na tela de Leads principal.
### Critérios de aceite
Possível criar cliente a partir do contato do WhatsApp e alterar seu status de lead diretamente pela tela de Conversas.

---

## FASE 5: Integração com Workflow, Orçamentos e Financeiro
### Objetivo
Trazer o contexto operacional de sessões e pagamentos.
### Contexto
Um cliente frequentemente pergunta "quando será minha sessão", "manda o orçamento", "estou devendo?".
### Pré-requisitos
FASE 4 concluída.
### Arquivos/áreas afetadas
*   `src/components/conversas/PainelDireito.tsx`
### Frontend
*   Buscar em `clientes_sessoes`: exibir próxima sessão ativa do cliente.
*   Buscar em `commercial_materials` / `material_shares`: exibir orçamentos associados ao cliente. Adicionar botão "Enviar Orçamento no Chat".
*   Buscar em `fin_transactions` ou `cobrancas`: exibir saldo devedor/pago de forma consolidada.
### Regras de negócio
Apenas leitura e geração de atalhos. Nenhuma estrutura destas tabelas é alterada aqui.
### Critérios de aceite
No painel direito, o fotógrafo enxerga Sessões futuras, Finanças e Orçamentos do cliente.

---

## FASE 6: Templates e Ações Rápidas (Notas)
### Objetivo
Velocidade no atendimento.
### Contexto
Fotógrafos mandam as mesmas mensagens de orçamentos e dúvidas frequentes centenas de vezes.
### Pré-requisitos
FASE 2 concluída.
### Arquivos/áreas afetadas
*   `src/pages/Configuracoes.tsx` (Adicionar aba Templates de Conversa)
*   `src/components/conversas/TemplatesDrawer.tsx`
### Banco de dados
CRUD na tabela `conversas_templates`, `conversas_notas`.
### Frontend
*   Editor de templates em Configurações.
*   Em Conversas, botão de "/" ou ícone para puxar templates.
*   Substituição de variáveis na hora de injetar no input de texto: ex `{nome}` -> `cliente.nome`.
*   Aba "Notas" no Painel Direito para salvar anotações invisíveis para o cliente.
### Critérios de aceite
Usuário pode criar 10 templates, digitar "/" no chat e selecionar um; a mensagem vai pro input já com o nome do cliente substituído.

---

## FASE 7: Sugestões Contextuais (Motor Sem IA)
### Objetivo
Inteligência e recomendação baseada em regras determinísticas.
### Contexto
Prepara o terreno para IA sugerindo a coisa certa baseada no funil, mas resolvido em client-side.
### Pré-requisitos
FASES 4 e 6 concluídas.
### Arquivos/áreas afetadas
*   `src/domain/conversations/suggestionEngine.ts` (Novo)
*   `src/components/conversas/SugestoesList.tsx`
### Frontend
*   Mapear palavras-chave na última mensagem (ex: "valor", "preço").
*   Avaliar estado do `lead`: se "Orçamento Enviado", sugerir Template "Follow-up de orçamento".
*   Exibir essas sugestões num bloco destacado (ex: "Sugestões para esta conversa").
### Critérios de aceite
Sempre que uma mensagem chegar, o motor roda. Se bater com a heurística, 1 a 3 templates/ações aparecem sugeridas no painel direito.

---

## FASE 8: Responsividade Mobile e Refinamento
### Objetivo
Otimizar o uso do módulo em dispositivos móveis.
### Contexto
3 colunas simultâneas não funcionam em celulares.
### Arquivos/áreas afetadas
*   `src/pages/Conversas.tsx` (CSS responsivo, Drawer/Bottom Sheets)
### Frontend
*   Mobile state: `viewMode` = `list` | `chat` | `context`.
*   Na raiz, mostra a lista. Clicar vai para o chat. No chat, botão "Menu" abre o contexto (leads/finanças/notas) via Drawer.
### Critérios de aceite
Navegação fluída no celular (semelhante ao app do WhatsApp web no mobile).

---

## FASE 9: Testes, QA e Lançamento
### Objetivo
Auditoria e segurança do módulo.
### Arquivos/áreas afetadas
*   Toda a aplicação.
### Tarefas
*   Validar RLS de ponta a ponta (ver se um usuário não consegue ver chat de outro).
*   Testar concorrência pesada (Webhooks em massa da Evolution API).
*   Validar expurgo de cache do IndexedDB se houver sobrecarga.
*   Auditoria de tamanho do bundle do frontend.

---
**NOTA FINAL:** Nenhuma FASE acima deve começar a ser codificada antes da aprovação total deste plano. Não criar schemas ou UI sem a ordem acima para mitigar retrabalho.
