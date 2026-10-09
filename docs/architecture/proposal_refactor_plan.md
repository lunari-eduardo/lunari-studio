# RELATÓRIO DE AUDITORIA E PLANO COMPLETO DE REFATORAÇÃO: MÓDULO DE PROPOSTAS DO LUNARI

## A. Resumo executivo
A arquitetura atual do módulo de Propostas possui fundações sólidas (como a persistência de undo/redo via `useMaterialEditor.ts` e renderizador visual de blocos). Contudo, há problemas estruturais graves causados por falta de isolamento entre "estrutura do modelo" e "conteúdo real do cliente". Ao salvar um modelo atual, dados privados e identificadores de blocos (`keys`) são preservados no JSON, ocasionando colisões graves e vazamento de informações no momento em que uma nova proposta herda esses blocos.
A auditoria também revelou que integrações com o módulo de Leads (`material_shares`, `SendBudgetDrawer.tsx`) são dependências vitais que não podem ser corrompidas. O novo produto precisa dividir claramente a jornada em dois caminhos (Modelos vs. PDF Estático), forçar a seleção prévia de Orientação e utilizar a Inteligência Artificial ("Lua") de forma controlada como estrategista e formatadora (não como uma geradora caótica de design).

## B. Diagnóstico do estado atual
- **Modelos Contaminados (Confirmado):** A função `handleSaveAsTemplate` salva um `blocks_json` cru e literal. A instanciação via `useMaterials.ts` apenas clona esse JSON, levando chaves de React e IDs antigos.
- **Fluxo Misto e Não-Sequencial:** O Wizard atual mistura criação guiada por IA, design em branco e modelos sem respeitar a hierarquia (Orientação → Modelo → Categoria). A IA atualmente subverte o processo tentando inventar blocos do zero (`useCreateMaterialWizard.ts`).
- **Orientação Implícita:** A orientação não é persistida na base; ela é adivinhada analisando parâmetros do `CoverBlock` (`getProposalOrientation`), o que impossibilita consultas rápidas e amarra a infraestrutura visual a uma inferência falha.
- **Rastreamento de PDF Deficiente:** `NativePdfViewer.tsx` renderiza o PDF mas não dispara eventos comerciais de visualização por página como os blocos nativos.
- **Integrações (Contratos Ativos):** A gestão do CRM e o módulo de conversas dependem ativamente das referências em `commercial_materials` e `material_shares`.

## C. Mapa da arquitetura atual
- **Entrada:** `BibliotecaComercialPage.tsx` e `CreateMaterialWizardDialog.tsx`.
- **Estado do Editor:** `EditorPropostaPage.tsx` gerencia o canvas, orquestrado pelo redutor de histórico `useMaterialEditor.ts`.
- **Motor Visual:** `VisualRenderer.tsx` com separação V2 (`content` e `props`), acoplado ao `registry.ts`.
- **Armazenamento:** `proposal_templates` (modelos base), `commercial_materials` (propostas instanciadas).
- **Publicação:** `PublicProposalViewer.tsx` (orquestrador público) e `NativePdfViewer.tsx` (renderer de PDF estático sem tracking).
- **Relacionamentos:** `material_shares` faz a ponte entre a proposta, o token de acesso público e a aba do Lead (`LeadCommercialSection.tsx`).

## D. Inventário de reaproveitamento
- **`useMaterialEditor.ts` (Persistência e Histórico):** **REAPROVEITAR**. A lógica de debouncing e stack de history é segura.
- **Renderizador de Blocos (`VisualRenderer.tsx`):** **REAPROVEITAR**. A arquitetura de blocos V2 suporta o isolamento de propriedades e dados desejado.
- **`useMaterials.ts` (Instanciação de template):** **REFATORAR**. Necessita da introdução urgente de um sanitizador de JSON que separe estruturalmente o esqueleto visual do conteúdo comercial.
- **Integrações de Compartilhamento (`SendBudgetDrawer.tsx`):** **REAPROVEITAR**. A amarração de um orçamento a um lead precisa continuar intacta, ajustando apenas o escopo de atuação dos logs.
- **Wizard de Criação (`CreateMaterialWizardDialog`):** **SUBSTITUIR**. Não suporta a segregação de "Caminho Modelo" e "Caminho PDF", nem exige Orientação de antemão.

## E. Especificação do produto desejado
1. **Caminho A — Modelos:** O usuário escolhe, em ordem rigorosa: **Orientação** -> **Modelo** -> **Categoria**. O modelo serve apenas de esqueleto e design system. Uma vez no editor, o fotógrafo faz pequenos ajustes ou usa IA para organizar os dados. Nenhuma proposta herda lixo digital de outras instâncias.
2. **Caminho B — PDF:** O usuário envia um documento pré-montado, pula a seleção de orientação/modelo, atribui a uma categoria, e o Lunari apenas orquestra o rastreamento comercial e o compartilhamento. O PDF não se transforma em blocos HTML.
3. **A IA "Lua":** Atua de forma verificável. Extrai briefing ou PDFs antigos (processados via Edge Functions), aponta o que conseguiu extrair e os campos que ficaram ausentes ou incertos. Exige **confirmação humana** antes de injetar os preços e textos no modelo base. Também funciona como analista comercial via painel lateral.

## F. Arquitetura-alvo recomendada
- **Template Hydrator (Novo Service):** Camada dedicada ao `instantiate`. Recebe o JSON do modelo, separa estruturalmente o design do conteúdo, troca `crypto.randomUUID()` em todos os blocos e "esvazia" chaves conhecidas por reter dados pessoais.
- **Nova Tabela e Schemas:** Adição da coluna `orientation` em `proposal_templates` **e** em `commercial_materials`. A orientação da proposta não dependerá de leitura de blocos internos.
- **PDF Tracker Engine:** Controlador baseado em `IntersectionObserver` aliado a heurísticas de visibilidade (`document.hidden`, inatividade/idle timeout) para reportar o **tempo estimado de visualização** sem falsos positivos provocados por abas abandonadas.

## G. Plano faseado de implementação

### Fase 0 — Diagnóstico e decisões de arquitetura
- **Objetivo:** Estabelecer arquitetura, alinhar produto e mitigar integrações. (Concluído).

### Fase 1 — Fundação e Confiabilidade (Sanitização Absoluta)
- **Objetivo:** Separar estruturalmente os dados do modelo do conteúdo comercial, impedindo colisões e vazamento de dados pessoais.
- **Tarefas:**
  1. Realizar uma auditoria técnica (levantamento) dos modelos existentes no banco para identificar quais possuem dados pessoais versus conteúdo demonstrativo legítimo. Definir estratégia cirúrgica para tratá-los sem destruir seu design visual.
  2. Implementar `instantiateTemplateBlocks` para garantir que novas instâncias nasçam limpas.
- **Aceite:** O teste unitário e de integração deve comprovar que duas propostas criadas do mesmo modelo NÃO compartilham dados pessoais, NÃO compartilham referências de blocos (chaves) e NÃO dividem estado de edição (histórico independente).

### Fase 2 — Novo fluxo de criação e Orientação explícita
- **Objetivo:** Garantir a jornada Orientação → Modelo → Categoria e persistência técnica da orientação.
- **Tarefas:**
  1. Adicionar coluna `orientation` em `proposal_templates` e `commercial_materials`.
  2. Reescrever o Wizard (front-end) bloqueando navegação até que a ordem seja cumprida.
  3. Vincular o layout de publicação e do editor a essa coluna no banco (e não ao CoverBlock).
- **Aceite:** A orientação dita a regra de layout CSS global da proposta; o Wizard impede o avanço sem definição inicial.

### Fase 3 — Caminho independente para PDF
- **Objetivo:** Divisão clara do roteiro do usuário.
- **Tarefas:** Upload direto de arquivo no primeiro passo (como alternativa a modelos). Desabilitar injeção de blocos caso a proposta seja "estática".
- **Aceite:** Arquivo PDF é enviado e a página não tenta carregar as ferramentas de bloco nativas.

### Fase 4 — Modelo de Referência e Validação (Alfa)
- **Objetivo:** Homologar um modelo vertical de ponta-a-ponta.
- **Tarefas:** Configurar template com capa, pacotes, extras e termos. Simular `criação -> edição -> publicação`.
- **Aceite:** Consistência tipográfica e de layout se mantém em todas as larguras de tela, sem vazamento do banco.

### Fase 5 — Importação verificável por IA (Extração de PDF)
- **Objetivo:** IA como auxiliar humana e transparente, não autônoma cega.
- **Tarefas:** 
  1. Edge Function recebe o PDF, processa OCR/Vision e devolve um JSON mapeando dados extraídos vs. confiança.
  2. Construir UI de revisão onde o sistema sinaliza campos incertos/ausentes.
- **Aceite:** A IA obrigatoriamente solicita a confirmação dos preços e das condições comerciais. Apenas após a aprovação humana o modelo visual recebe a injeção dos blocos comerciais.

### Fase 6 — Organização de conteúdo por IA no Layout
- **Objetivo:** Alocação de dados nos templates.
- **Tarefas:** Mapper que transpõe o JSON revisado pelo usuário (Fase 5) para as props da arquitetura de blocos V2.
- **Aceite:** Os dados injetados preservam os *design tokens* (fontes/cores) originais do template escolhido.

### Fase 7 — Estratégia comercial com a Lua
- **Objetivo:** Consultoria sob demanda no editor.
- **Tarefas:** Módulo lateral de sugestões sobre objeções, ancoragem e fluidez.
- **Aceite:** Aplicação estritamente opt-in. Zero alterações silenciosas.

### Fase 8 — PDF como produto digital (Tempo Estimado de Leitura)
- **Objetivo:** Analytics realista e não superestimado.
- **Tarefas:** Aprimorar `NativePdfViewer` cruzando `IntersectionObserver` com `Page Visibility API` e detectores de inatividade (idle timeout).
- **Aceite:** O resultado apresentado no CRM comercial será estritamente tratado e classificado como "tempo estimado de visualização", pausando a contagem quando o cliente mudar de aba ou minimizar a tela no mobile.

### Fase 9 — Refinamento do editor
- **Objetivo:** Foco no refinamento de cópia.
- **Tarefas:** Reduzir ferramentas globais destrutivas.
- **Aceite:** Interface ultra-focada em texto e troca de mídias.

### Fase 10 — Integração CRM e Regras de Negócio Seguras
- **Objetivo:** Garantir que visualizar não corrompe o funil do usuário.
- **Tarefas:** Especificar estritamente o comportamento das logs comerciais (`material_shares`). 
- **Aceite:** O sistema registra a leitura (ex: "Proposta Aberta", "Tempo estimado X"), mas **sob nenhuma hipótese** avança o Lead automaticamente de estágio no funil CRM, tampouco realiza transições de status financeiro por conta de uma mera visualização.

## H. Matriz de riscos
- **Alto | Fase 1 e 10:** Deleção em cascata desconectar propostas dos Leads. *Mitigação*: Schema protegido. Regra estrita de não-transição de estágio do lead.
- **Médio | Fase 5:** Alucinação no parser de PDF. *Mitigação*: UI de "Quarentena/Revisão Humana" obrigatória.
- **Baixo | Fase 8:** Limitação de APIs do iOS Safari para idle. *Mitigação*: Reduzir tolerância de timeout em dispositivos touch para não gerar falsos tempos altíssimos.

## I. Decisões Consolidadas
- **Sanitização e Legados:** Auditoria primária dos templates antigos antes da limpeza automatizada. Comprovação de isolamento de estado é o marco zero (Fase 1).
- **Coluna de Orientação na Raiz:** A orientação pertencerá à tabela da proposta e não inferida no JSON de capa.
- **IA Restrita e Auditável:** Vetada injeção cega de pacotes extraídos. Revisão humana (Fase 5) passa a ser obrigatória.
- **Analytics de PDF Estimado:** Adoção de arquitetura ciente de background-tabs. O tempo de leitura será abertamente tratado como "estimativa" para o fotógrafo.
- **CRM Protegido:** Regra de negócio explícita: Evento de leitura gera log visual, mas NÃO move cards no funil.

## J. Pacote de transferência para o Claude Code
- **Caminho crítico inicial:** Você deverá iniciar pela **Fase 1**, conduzindo o script em formato de auditoria passiva ("dry-run") nos modelos de banco antes de qualquer commit, depois implemente o `instantiateTemplateBlocks` com o teste unitário de isolamento.
- **Arquitetura da Base:** Assegure-se de injetar a orientação diretamente no `commercial_materials` logo na inserção (Fase 2). Remova as lógicas confusas que tentam ler `CoverBlock` no frontend.
- **Leads:** Ao testar envios em `SendBudgetDrawer.tsx` (Fase 10), valide se a chamada ao Supabase emite logs sem tocar na coluna de estágio do lead.

## K. Definição de pronto
O módulo de Propostas Lunari será promovido para uso geral assim que:
1. Um usuário gerar orçamentos do mesmo modelo sem vazar dados ou dividir estado de Undo/Redo.
2. A criação começar forçando a orientação, e o carregamento do CSS base respeitar a diretiva do banco, e não do layout interno.
3. Extrações por IA passarem por validação de interface do fotógrafo.
4. O Analytics de PDFs registrar engajamento ignorando abas ocultas (tempo estimado confiável).
5. Nenhum Lead no CRM mudar de estágio (coluna) sozinho apenas porque o cliente clicou no PDF.
