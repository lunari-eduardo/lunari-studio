# LUA — DNA de Atendimento e Biblioteca Inteligente

**Status:** aprovado para implementação faseada  
**Fonte de verdade:** este documento substitui propostas anteriores sobre a Lua.  
**Princípio inegociável:** a Lua é uma assistente de rascunhos. Ela nunca envia WhatsApp, e-mail ou qualquer comunicação externa.

---

## 1. Objetivo e decisões aprovadas

A Lua personaliza sugestões de atendimento para cada estúdio a partir de um **DNA de Atendimento** estruturado, do conhecimento declarado do estúdio e da Biblioteca Inteligente de Modelos. O DNA não é um histórico de chat nem um contexto bruto permanente.

Decisões consolidadas:

- A alimentação é explícita: o fotógrafo escolhe **Alimentar DNA da Lua** no menu de uma conversa. Não há aprendizado silencioso.
- O material selecionado é capturado integralmente como snapshot ordenado: remetente, destinatário, direção, data, horário, texto, emojis, citações, mídia, legendas e metadados.
- Áudios recebem transcrição; imagens e documentos recebem extração/OCR assíncrona. A v1 não executa análise visual multimodal além da extração textual.
- O snapshot auditável é mantido por 90 dias. Depois, o sistema remove seu conteúdo integral e conserva somente hash, métricas, artefatos derivados e a versão do DNA produzida.
- Nome, cidade e contatos são reutilizados de `profiles`. Horários, políticas, serviços e exceções ficam no conhecimento complementar da Lua. Contextos comerciais existentes, quando preenchidos, são apenas fontes adicionais, não uma segunda fonte de verdade.
- A área será uma página dedicada em `/app/configuracoes/lua`.
- O consumo terá guardrails técnicos configuráveis no servidor; não haverá franquias comerciais nem alterações de billing nesta versão.
- Vetores não serão criados para mensagens brutas. O Knowledge Engine existente será preservado para futura recuperação semântica de conteúdo curado, caso a seleção determinística de modelos deixe de ser suficiente.

---

## 2. Base atual reutilizável

| Domínio | Fonte existente | Reuso pela Lua |
| --- | --- | --- |
| Conversas | `conversas_chats`, `conversas_mensagens`, `conversas_contatos` | Fonte de exportação, contexto imediato e injeção do rascunho no composer. |
| Mídia | Evolution API → `edge-workers/api` → Cloudflare R2 | Referências R2 e metadados já persistidos; a Lua não duplica binários. |
| CRM e Leads | `clientes`, `leads`, `lead_statuses` | Contexto factual do contato, sem criar outra base comercial. |
| Workflow e Financeiro | `clientes_sessoes`, `get_conversas_cliente_context`, cobranças | Contexto de sessão e financeiro somente leitura. Valores continuam calculados por triggers. |
| Categorias | `categorias` via `ConfigurationContext` | Categoria fotográfica dos modelos por chave relacional. |
| Modelos | `conversas_templates` e `useConversasTemplates` | Base compatível da Biblioteca Inteligente. |
| IA e auditoria | `assistant-chat`, `assistant-transcribe`, `assistant_invocations`, gateway configurável | Padrões de autenticação, gateway, streaming e auditoria; não reutilizar o popover simulado como runtime. |
| Knowledge | `knowledge_documents`, `knowledge_match` | Evolução futura de conteúdo curado, sem indexar histórico bruto. |

O atual `LuAssistantPopover` é apenas uma simulação com toasts e não é uma integração funcional. A futura Lua não pode assumir que ele já fornece segurança, streaming ou persistência.

---

## 3. Arquitetura alvo

### 3.1 Camadas e fluxo

```text
Conversa escolhida pelo fotógrafo
  → snapshot imutável com referências R2
  → fila de processamento autenticada
  → transcrição / OCR / normalização / deduplicação
  → sinais estruturados com evidências
  → versão incremental do DNA
  → cache do DNA ativo e índice da Biblioteca

Responder com Lua
  → janela curta da conversa + CRM/Workflow/Financeiro
  → DNA ativo + conhecimento do estúdio + modelos relevantes
  → Worker autenticado retorna { draft, metadata }
  → ChatPanel injeta somente draft no MessageComposer
  → fotógrafo revisa e usa o fluxo normal de envio
```

Os endpoints de IA devem residir no `edge-workers/api`, que já isola integrações externas e a Evolution API. O frontend nunca vê segredo de IA, credencial Evolution ou credencial de serviço Supabase.

### 3.2 DNA de Atendimento

O perfil ativo é compacto, legível e versionado. Ele registra atributos inferidos e evidências, sem permitir edição manual desses atributos:

- Linguagem: formalidade, comprimento típico, emojis, saudações, despedidas, tratamento e expressões recorrentes.
- Comercial: postura de desconto, negociação, parcelamento e apresentação de orçamento.
- Estilo: premium, acolhedor, elegante, objetivo e humanizado.
- Metadados: nível de aprendizado, conversas analisadas, fontes válidas, última atualização, versão e resumo de tom.

Cada processamento novo deduplica mensagens por `evolution_msg_id`, compara o conjunto de evidências com a versão ativa e só publica uma nova versão se houver alteração material. A nova versão substitui a ativa automaticamente, preservando a anterior para auditoria e rollback operacional.

### 3.3 Contexto usado em uma sugestão

A resposta deve ser montada no servidor, com orçamento de contexto fixo e nesta ordem de prioridade:

1. regras de segurança e proibição de envio;
2. DNA ativo e conhecimento declarado do estúdio;
3. dados factuais do cliente, lead, sessão, financeiro e workflow;
4. até cinco modelos ativos filtrados por etapa, categoria e palavras-chave;
5. janela recente, limitada, de mensagens não removidas da conversa.

O Worker retorna um contrato estruturado com `draft`, `dna_version`, `template_ids`, `context_sources` e `safety_flags`. Nunca retorna uma instrução de envio, mutation de CRM, registro financeiro ou ação no Workflow.

---

## 4. Persistência e contratos futuros

Todas as entidades abaixo ficarão em `public`, terão RLS, grants mínimos e políticas para `authenticated` com propriedade `auth.uid() = user_id`. Nenhuma migration tocará triggers financeiros, entidades compartilhadas com Lunari Gallery ou credenciais Evolution.

| Entidade | Finalidade | Campos essenciais |
| --- | --- | --- |
| `lua_dna_profiles` | Estado ativo e versões do DNA | `id`, `user_id`, `version`, `status`, `attributes jsonb`, `voice_summary`, `learning_metrics jsonb`, `derived_from jsonb`, timestamps. |
| `lua_dna_sources` | Snapshot selecionado e ciclo de retenção | `id`, `user_id`, `chat_id`, `source_hash`, `snapshot jsonb`, `status`, `retention_until`, `processed_at`, erro e timestamps. |
| `lua_dna_artifacts` | Resultado por mensagem/mídia sem duplicar binários | `id`, `source_id`, `message_id`, `kind`, `content`, `metadata jsonb`, `content_hash`, status de extração. |
| `lua_studio_knowledge` | Dados complementares declarados | `user_id`, `hours`, `policies`, `services`, `pix_reference`, `websites`, `socials`, `notes`, `version`, timestamps. |
| `lua_generation_audit` | Auditoria mínima de geração | `user_id`, `chat_id` opcional, `dna_version`, hashes de contexto/saída, modelo, latência, uso e status. |

`assistant_invocations` permanece a auditoria transversal do runtime de IA; não será recriada. `lua_generation_audit` não armazena o conteúdo integral do chat ou do rascunho, apenas metadados e hashes necessários para rastreabilidade.

### Biblioteca Inteligente

`conversas_templates` será evoluída de forma compatível, preservando modelos existentes. O contrato final acrescentará `categoria_id` (FK opcional para categoria do estúdio), `etapa`, `palavras_chave`, `ativo`, `ordem` e timestamps. `nome`, `conteudo` e `variaveis` permanecem como base compatível, apresentados na interface como título, conteúdo e variáveis.

As etapas permitidas são: `primeiro_contato`, `orcamento`, `follow_up`, `pre_ensaio`, `financeiro`, `pos_venda` e `entrega`. A seleção prioriza etapa, categoria e palavras-chave; modelos inativos nunca são sugeridos nem usados em testes.

---

## 5. Experiência do produto

### Configurações → Lua

A página dedicada terá quatro blocos independentes, responsivos e compatíveis com Light/Dark Mode:

1. **DNA de Atendimento:** somente leitura com nível, fontes analisadas, data da versão ativa e resumo de tom.
2. **Conhecimento do Estúdio:** mostra valores originados de `profiles` e permite manter apenas os complementos da Lua, com feedback inline de salvamento.
3. **Biblioteca de Modelos:** gerenciamento amplo, sem modal compacto; filtros por categoria, etapa, status e busca por palavra-chave.
4. **Testar Lua:** pergunta fictícia, sem chat ou cliente real, que usa DNA, conhecimento e modelos ativos e nunca envia comunicação.

### Alimentar DNA da Lua

O menu de ações da conversa abre confirmação clara com quantidade de mensagens e mídia encontrada. Ao confirmar, registra a fonte, enfileira o processamento e mostra status inline. A conversa continua utilizável enquanto a fila processa. Falhas em transcrição/OCR são registradas por item e não invalidam texto, ordem, citações ou o restante da fonte.

### Responder com Lua

O botão fica junto às ações do chat. Durante a geração, apresenta estado local de carregamento; ao finalizar, o texto é passado pelo caminho existente `injectedText` do `ChatPanel` para o `MessageComposer`. O fotógrafo pode editar, descartar ou enviar manualmente com o endpoint normal de Conversas. Nenhuma confirmação de sucesso invasiva será exibida.

---

## 6. Performance, custos e segurança

- Processamento pesado é assíncrono, idempotente e limitado por fonte; webhooks da Evolution não esperam análise de IA.
- Cada item de mídia usa a referência R2 existente. Não haverá cópia de áudio, imagem ou documento para o banco.
- Cachear por `user_id + dna_version` o DNA compacto e, por `user_id + templates_updated_at`, o índice de modelos. Invalidar ao publicar DNA, editar conhecimento ou alterar modelos.
- Aplicar limites configurados no servidor para concorrência, tamanho de exportação, minutos de áudio, páginas de documento, testes e rascunhos. Os valores ficam em configuração operacional, não hard-coded no frontend.
- O custo unitário será contabilizado por: minutos transcritos, páginas OCR, tokens de síntese do DNA e tokens de geração. Não há custo recorrente por reintroduzir snapshots no prompt.
- Usar o gateway e o modelo já configurados para o assistente, com fallback controlado; erros 429/5xx exibem erro recuperável e não fazem tentativas infinitas.
- Validar JWT, ownership do chat e RLS em toda leitura. Service role é restrito ao Worker. Prompts recebem dados mínimos necessários e auditoria armazena hashes, não conversas integrais.
- Um job agendado expurga snapshots após 90 dias e mantém metadados de retenção para prova de processamento.

Riscos principais: conteúdo sensível de clientes, OCR/transcrição parcial, custo de arquivos grandes, deriva de estilo por amostra pequena e regressão em Conversas. Mitigações: ação explícita, retenção curta, processamento por item, evidências/versionamento, limites técnicos, rollback de versão e testes isolados por fase.

---

## 7. Fases de implementação

Cada fase é independente. Ao final de cada uma: revisar `git diff`, executar `npm run typecheck:changed`, executar `npm run build`, validar banco/UI/realtime/responsividade pertinente e aguardar aprovação explícita antes da seguinte.

### Fase 1 — Estrutura do DNA

Criar somente a fundação persistente: migrations das entidades `lua_dna_profiles`, `lua_dna_sources`, `lua_dna_artifacts`, `lua_studio_knowledge` e `lua_generation_audit`; RLS, índices, tipos e acesso de leitura/escrita mínimo. Não criar UI, fila, análise de IA, biblioteca, menu ou botão de resposta.

Aceite: isolamento entre usuários comprovado, retenção representável, versão única ativa por usuário, tabelas existentes de Conversas intactas e build limpo.

### Fase 2 — Biblioteca Inteligente

Evoluir compativelmente `conversas_templates`, criar os tipos/hooks necessários e implementar a gestão ampla na página dedicada Lua. Reutilizar categorias existentes e manter a inserção atual de modelos no composer sem mudança de comportamento.

Aceite: CRUD respeita RLS, modelo ativo/inativo funciona, filtros são locais/eficientes, variáveis continuam renderizando e Light/Dark/mobile permanecem corretos.

### Fase 3 — Painel administrativo da Lua

Implementar a rota `/app/configuracoes/lua`, conhecimento complementar do estúdio, resumo somente leitura do DNA e Testar Lua em modo sem cliente real. Esta fase não gera respostas para chats reais nem processa fontes.

Aceite: dados de perfil são somente leitura na origem correta, complementos persistem com feedback inline, teste não cria mensagens nem usa endpoint de envio.

### Fase 4 — Alimentar DNA da Lua

Adicionar a ação ao menu da conversa, construir exportador de snapshot, fila/consumer de processamento, transcrição/OCR, deduplicação, síntese incremental, versionamento, cache e expurgo. A mídia permanece em R2 e a conversa continua responsiva durante o processamento.

Aceite: exportação integral ordenada, falhas parciais recuperáveis, reprocessamento idempotente, nova versão auditável e nenhum impacto no webhook ou envio existente.

### Fase 5 — Responder com Lua

Criar o endpoint autenticado de geração, montagem de contexto no servidor, seleção de modelos, guardrails, auditoria e substituição do popover simulado pela ação real no chat. A única saída permitida é a injeção do rascunho no composer.

Aceite: resposta contextual usa DNA/modelos/dados reais permitidos, respeita limites e cache, funciona em desktop/mobile, nunca chama `send-message` e não cria mutações em CRM, Workflow ou Financeiro.

---

## 8. Checklist obrigatório por fase

- Revisar cada linha do diff e preservar alterações não relacionadas do usuário.
- Garantir imports, variáveis, ícones e hooks usados no JSX.
- Validar políticas RLS, ownership e ausência de segredo no cliente.
- Confirmar que `clientes_sessoes`, valores financeiros, Gallery e Evolution continuam com seus contratos existentes.
- Executar `npm run typecheck:changed` e `npm run build` com saída 0.
- Testar UI, UX, banco, realtime, responsividade e regressões pertinentes antes de solicitar aprovação da próxima fase.
