# Prompt para Antigravity — Implementação da Lua

Copie o conteúdo abaixo para o Antigravity no contexto deste repositório.

---

# LUNARI — IMPLEMENTAÇÃO FASEADA
## DNA de Atendimento + Lua + Biblioteca Inteligente

Atue como engenheiro de produto e software responsável por implementar a Lua no Lunari Studio, seguindo as convenções reais deste repositório.

## Fonte de verdade e início obrigatório

Antes de editar qualquer arquivo:

1. Leia integralmente `AGENTS.md` na raiz e `LUA_DNA_MASTER_PLAN.md`.
2. Inspecione `git status`, diffs e histórico relevante. Preserve alterações locais, arquivos não rastreados e trabalho feito por outras pessoas.
3. Faça um inventário curto do que já está implementado para esta iniciativa, do que está parcial e do que continua pendente. Verifique o código e o banco; não conclua que algo está pronto só porque um plano ou componente com nome semelhante existe.
4. Identifique os pontos existentes que podem ser reutilizados, incluindo Conversas, modelos, categorias, contexto CRM/Workflow, R2, Workers, assistente, transcrição e auditoria.
5. Inicie exclusivamente a primeira fase ainda não concluída, seguindo a ordem e os critérios de aceite do documento mestre. Se nenhuma fase estiver concluída, comece pela Fase 1.

Estado inicial observado no momento em que este prompt foi preparado: `LUA_DNA_MASTER_PLAN.md` foi criado; não foi feita implementação de código ou banco da Lua. `.claude/settings.local.json` aparece como arquivo não rastreado e pertence ao workspace; preserve-o. Confirme tudo no `git status` antes de agir, pois o estado pode ter mudado.

## Autoridade arquitetural

`LUA_DNA_MASTER_PLAN.md` é a fonte de verdade das decisões aprovadas. Não replaneje o sistema nem altere essas decisões silenciosamente. Siga também a Constituição do Lunari e os padrões vigentes no repositório.

Invariantes do produto e da arquitetura:

- Lua é uma assistente de rascunhos. Nunca envia WhatsApp, e-mail ou qualquer comunicação externa; o fotógrafo revisa e envia pelo fluxo normal.
- Alimentar o DNA é uma ação explícita iniciada pelo fotógrafo. Não existe aprendizagem silenciosa.
- O DNA é compacto, estruturado, incremental e versionado; não é um histórico bruto enviado em todas as chamadas.
- Snapshots integrais têm retenção de 90 dias. Áudios são transcritos e imagens/documentos passam por extração/OCR assíncrona conforme o plano.
- Mídia usa referências aos objetos já armazenados no Cloudflare R2. Não introduza Supabase Storage como destino.
- Use o Cloudflare Worker `edge-workers/api` para novas rotas de integração de IA previstas no plano. Segredos e service role ficam somente no servidor.
- Respeite o isolamento multi-tenant com RLS e ownership. Não reutilize nem enfraqueça políticas para acelerar a implementação.
- Reutilize as fontes existentes de Conversas, CRM, Leads, Workflow, Financeiro, categorias, perfil, Knowledge e auditoria. Não crie fontes duplicadas da verdade.
- Não altere triggers financeiros, contratos do Lunari Gallery, fluxo de billing/Asaas ou credenciais da Evolution API sem relação direta e autorização arquitetural explícita.
- Não crie embeddings para conversas brutas. Preserve o Knowledge Engine para conteúdo curado e uso futuro descritos no plano.
- A Biblioteca preserva os modelos atuais e sua inserção no composer. Modelos inativos não podem ser sugeridos nem usados nos testes da Lua.
- Respeite os temas claro/escuro, responsividade, Design DNA, feedback inline e ausência de toasts de sucesso desnecessários.

## Execução em fases com ponto de parada

Implemente exatamente uma fase por vez, conforme a seção “Fases de implementação” do `LUA_DNA_MASTER_PLAN.md`.

Para a fase atual, siga esta sequência:

### 1. Diagnóstico

Resuma o objetivo da fase, o que já existe e será reutilizado, componentes/tabelas/Workers envolvidos e riscos concretos. Baseie o diagnóstico no código atual.

### 2. Arquivos

Liste apenas os arquivos que realmente precisam ser criados ou alterados. Não modifique arquivos alheios à fase.

### 3. Implementação

Implemente somente a fase atual. Faça alterações pequenas, compatíveis e coerentes com os padrões existentes. Não adiante trabalho de fases futuras.

### 4. Validação

Revise o diff linha a linha. Para as partes pertinentes à fase, verifique UI/UX, banco/RLS, realtime, responsividade e regressões. Não declare testes que não executou. Se um serviço remoto, credencial ou ambiente indisponível impedir algum teste, diga exatamente qual validação ficou pendente e por quê.

Execute obrigatoriamente `npm run typecheck:changed` e `npm run build`, conforme `AGENTS.md`. Confirme o código de saída de ambos. Não aceite erros de tipo ou variáveis ausentes. Registre avisos relevantes de build e diferencie-os de falhas.

### 5. Resultado e parada

Relate o que ficou pronto, os arquivos alterados, validações executadas e limitações. Atualize o documento mestre somente se uma correção factual for indispensável e explique-a antes de fazê-la. Ao concluir a fase atual, pare e aguarde minha aprovação explícita. Não comece a fase seguinte no mesmo turno.

## Ordem e escopo das fases

Use exatamente a divisão e os critérios de aceite do plano mestre:

1. **Estrutura do DNA:** persistência, versionamento, fontes, artefatos, conhecimento complementar, auditoria, tipos, índices e RLS mínimos. Sem UI, filas, análise de IA, biblioteca ou ações de Conversas.
2. **Biblioteca Inteligente:** evolução compatível dos modelos, categorias existentes, etapas, palavras-chave, status ativo/inativo e gestão ampla. Preserve interpolação e inserção atual. Se a página dedicada ainda não estiver montada, mantenha o trabalho desta fase limitado à biblioteca e aos componentes necessários; a composição completa da página pertence à Fase 3.
3. **Painel administrativo da Lua:** rota `/app/configuracoes/lua`, DNA somente leitura, conhecimento complementar e teste fictício isolado, sem conversa real ou envio.
4. **Alimentar DNA:** exportação ordenada e integral, ação explícita na conversa, fila, extração/transcrição, deduplicação, síntese incremental, versionamento, cache e expurgo de 90 dias.
5. **Responder com Lua:** geração autenticada, contexto limitado construído no servidor, seleção de modelos, guardrails e auditoria; injetar somente o rascunho no `MessageComposer`.

O inventário inicial decide qual é a próxima fase pendente. Se uma fase estiver parcialmente implementada, complete apenas as lacunas dessa fase e valide o que já existe. Não recrie tabelas, rotas, telas ou hooks equivalentes.

## Como tratar impedimentos ou conflitos

Se encontrar contradição entre o plano mestre, `AGENTS.md`, uma migration existente ou um contrato ativo:

- não improvise nem aplique uma mudança de arquitetura por conta própria;
- pare antes da alteração dependente;
- apresente o trecho/arquivo conflitante, o impacto, as opções viáveis e sua recomendação técnica;
- aguarde minha decisão.

Faça o mesmo se a implementação exigir credenciais ausentes, mudança em serviço remoto/produção, alteração de política de retenção, envio automático ou quebra de compatibilidade com Conversas, Supabase ou Gallery. Continue apenas o trabalho independente que não dependa do impedimento.

## Primeira ação

Faça a auditoria inicial descrita acima e implemente somente a primeira fase pendente. Ao final, apresente o resultado e pare para aprovação.
