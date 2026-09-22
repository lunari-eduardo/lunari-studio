# Reconstrução das capas do construtor de propostas

## Objetivo
Entregar seis capas realmente distintas, estáveis e responsivas, com geometria previsível, orientação escolhida manualmente e ajuste contextual do texto diretamente no canvas. O mesmo documento deve manter composição equivalente no editor, preview mobile, tela cheia e link público.

## Diagnóstico confirmado

### 1. Os modelos atuais não correspondem ao catálogo exibido
- O catálogo declara `minimal-center`, `poster-split`, `seam-side` e `hero-full`.
- O renderizador possui implementação própria apenas para `poster-split`.
- `minimal-center`, `seam-side`, `hero-full` e qualquer valor desconhecido caem no mesmo componente minimalista.
- Por isso Minimal, Split e Hero parecem iguais; não é apenas um problema visual, mas um fallback estrutural.

### 2. Frontend, IA e templates persistidos falam contratos diferentes
- O frontend usa `minimal-center`, `poster-split`, `seam-side` e `hero-full`.
- O Worker de IA aceita e solicita `split`, `full` e `centered`.
- Há template persistido com `gradient_parallax`, enquanto outros templates não gravam variante e dependem do fallback.
- Novas propostas podem, portanto, nascer com variantes antigas, ausentes ou não renderizadas.

### 3. Texto e fotografia disputam a mesma geometria
- A capa minimal atual distribui texto e foto com `flex-1`.
- O comprimento do texto participa do cálculo do layout e pode comprimir ou deslocar a imagem.
- Não há contrato de slot de mídia com largura, altura, proporção e posição invariáveis.
- A foto precisa ser controlada por uma região própria; texto maior deve reduzir, quebrar ou truncar conforme regras da variante, nunca redimensionar a região da imagem.

### 4. O preview mobile não simula corretamente a entrega final
- O canvas mobile é limitado a `375 × 812`, usa `overflow-hidden` e depende de container queries.
- O projeto não possui configuração explícita do plugin de container queries; as regras `@md` e `@lg` usadas pelas capas precisam ser eliminadas ou comprovadamente suportadas.
- O modo mobile atual representa o documento inteiro como uma caixa com altura fixa. Conteúdo maior pode ser cortado, em vez de rolar naturalmente.
- O link público força `viewMode="desktop"` e depende apenas do CSS interno para se adaptar; isso permite divergência entre preview e experiência real.
- A edição inline está desativada quando o editor está em viewport mobile, o que impede o fluxo solicitado de selecionar texto e ajustar seu tamanho nesse modo.

### 5. O sistema já tem uma base adequada para persistir novos controles
- `updateBlockField` e `setPath` já suportam alterações pontuais, histórico, desfazer/refazer e coalescência.
- As versões salvam o bloco completo em `material_versions.content`; propriedades de orientação e tipografia podem seguir o mesmo fluxo.
- O que falta é um estado explícito de elemento textual selecionado e um contrato tipado para suas propriedades visuais.

### 6. Não existe cobertura automatizada deste motor
- Não foram encontrados testes específicos para `CoverBlock`, renderização de variantes, seleção de texto, orientação, preview mobile ou paridade com o link público.
- A validação atual não impede que novas variantes voltem a cair silenciosamente no mesmo fallback.

### 7. O erro citado em `use-mobile.tsx` não foi reproduzido na fonte atual
- A linha informada contém apenas a constante do breakpoint; não há uso de UMD que justifique o TS2686 no arquivo atual.
- O log disponível aponta outro erro preexistente, em `useCreateMaterialWizard.ts`, relacionado ao parâmetro obrigatório `canvas`.
- Esse erro deve ser validado novamente na fase de segurança, mas não explica as capas iguais nem o corte do preview.

## Contrato funcional proposto

### Seis variantes oficiais
1. **Minimal Editorial (`minimal-center`)**  
   Composição tipográfica central, fotografia em faixa ou moldura inferior independente e bastante respiro.

2. **Poster Fotográfico (`poster-split`)**  
   Fotografia em sangria total, contraste localizado e tipografia sobreposta com zona segura.

3. **Costura Lateral (`seam-side`)**  
   Painel textual e fotografia divididos por uma costura determinística; parte do título pode atravessar a divisão sem alterar a largura da foto.

4. **Hero Imersivo (`hero-full`)**  
   Fotografia fullscreen, conteúdo ancorado em uma área segura e CTA separado do título.

5. **Díptico Editorial (`editorial-diptych`)**  
   Duas regiões fotográficas estáveis e uma coluna ou faixa tipográfica independente.

6. **Moldura Flutuante (`floating-frame`)**  
   Fotografia elevada dentro de moldura editorial, título externo e metadados alinhados por grid.

Cada variante terá DOM, hierarquia, regras de mídia e comportamento mobile próprios. Não haverá um componente genérico mascarado por classes diferentes.

### Propriedades compartilhadas
```text
props.cover = {
  orientation: "portrait" | "landscape",
  mediaPlacement: "left" | "right" | "top" | "bottom" | "background",
  focalPoint: { x: number, y: number },
  typography: {
    eyebrowSize: number,
    titleSize: number,
    accentSize: number,
    subtitleSize: number,
    authorSize: number,
    ctaSize: number
  }
}
```

- `orientation` controla a proporção do design e é uma escolha manual persistida, não consequência da variante.
- `mediaPlacement` controla o lado da fotografia somente nas variantes que oferecem essa escolha.
- Trocar variante preserva conteúdo, imagem, ponto focal, orientação e tamanhos quando forem compatíveis.
- Valores serão limitados por campo e variante para impedir estouro visual.

## Plano de execução

### Fase 1 — Unificar o contrato e proteger conteúdo legado
**Arquivos principais**
- `src/pages/comercial/blocks/registryDefinitions.ts`
- `src/pages/comercial/blocks/normalization.ts`
- `src/pages/comercial/blocks/registry.ts`
- `workers/proposals-ai/src/sanitize.ts`
- Tipos compartilhados novos em `src/pages/comercial/blocks/`

**Ações**
1. Criar uma fonte única tipada para IDs, nomes, capacidades, defaults e limites das seis variantes.
2. Separar propriedades de conteúdo, composição, orientação, posicionamento de mídia e tipografia.
3. Criar normalização explícita de legados:
   - `centered` → `minimal-center`;
   - `split` → `seam-side`;
   - `full` e `gradient_parallax` → `hero-full`;
   - variante ausente → `minimal-center`.
4. Preservar propriedades desconhecidas durante a leitura para não destruir documentos antigos.
5. Remover fallback silencioso: variante inválida deve ser normalizada na entrada; o renderizador deve possuir estado de diagnóstico apenas no editor se algo escapar.
6. Manter o formato de `material_versions.content`; não exigir alteração de tabela para esses controles.

**Critério de saída**
- Todo bloco existente resolve para uma das seis variantes sem perder texto, imagem ou link.

### Fase 2 — Construir seis motores visuais reais
**Arquivos principais**
- `src/pages/comercial/components/editor/blocks/CoverBlocks.tsx`
- Novos componentes em `src/pages/comercial/components/editor/blocks/covers/`
- Utilitários de geometria e tipografia em `src/pages/comercial/blocks/`

**Ações**
1. Dividir o arquivo atual em seis renderizadores pequenos, um por variante.
2. Criar um shell compartilhado apenas para acessibilidade, seleção, tokens e edição; não compartilhar a composição visual.
3. Definir para cada variante:
   - aspect ratio em retrato e paisagem;
   - grid e zonas seguras;
   - slot de mídia com dimensões estáveis;
   - limites mínimo/máximo de texto;
   - regras de quebra, fitting e overflow;
   - comportamento específico em larguras pequenas.
4. Aplicar `minmax(0, …)`, `min-width: 0`, proporções e tracks fixos para impedir que texto altere a largura da imagem.
5. Usar `object-fit: cover` e `object-position` a partir do ponto focal; a foto pode recortar, mas nunca deformar.
6. No modelo Seam, usar duas camadas tipográficas posicionadas no mesmo sistema de coordenadas e recortadas pela costura do container, sem duplicação perceptível ou deslocamento.
7. Respeitar tokens da proposta e os estados de imagem vazia/erro sem introduzir cores avulsas.
8. Incluir redução de movimento e ordem semântica correta para leitores de tela.

**Critério de saída**
- As seis miniaturas podem ser reconhecidas apenas pela composição e nenhuma delas muda a geometria da fotografia ao editar textos.

### Fase 3 — Orientação manual e independente
**Arquivos principais**
- `src/pages/comercial/components/editor/PropertiesSidebar.tsx`
- `src/pages/comercial/EditorPropostaPage.tsx`
- `src/hooks/useMaterialEditor.ts`
- Controles shadcn já existentes

**Ações**
1. Adicionar seletor segmentado Retrato/Paisagem no bloco Capa.
2. Adicionar seletor visual de posição da mídia somente quando a variante suportar essa capacidade.
3. Retirar qualquer derivação de orientação baseada no nome da composição.
4. Persistir mudanças via `updateBlockField`, com undo/redo e autosave existentes.
5. Ao trocar de variante, manter a orientação escolhida; quando um posicionamento não existir no novo modelo, usar o default documentado sem alterar `orientation`.
6. Exibir controles incompatíveis como indisponíveis com explicação curta, em vez de alterar silenciosamente o design.

**Critério de saída**
- A mesma variante funciona em retrato e paisagem; trocar o modelo não troca a orientação escolhida pelo fotógrafo.

### Fase 4 — Seleção de texto e slider contextual
**Arquivos principais**
- `src/pages/comercial/blocks/EditableText.tsx`
- `src/pages/comercial/blocks/inlineContext.ts`
- `src/pages/comercial/components/editor/VisualRenderer.tsx`
- Novo controle contextual em `src/pages/comercial/components/editor/`
- `src/pages/comercial/EditorPropostaPage.tsx`

**Ações**
1. Criar estado de seleção com `blockId`, `fieldPath`, tipo do campo, valor atual e limites permitidos.
2. Ao clicar ou focar eyebrow, título, destaque, subtítulo, autoria ou CTA, selecionar o campo sem interferir no `contentEditable`.
3. Mostrar um popover/toolbar ancorado ao texto com slider, valor numérico e ação de restaurar o padrão.
4. Gravar o tamanho em `props.cover.typography.<campo>Size`, nunca como estilo solto dentro do HTML editável.
5. Coalescer eventos contínuos do slider em uma única operação lógica de histórico.
6. Fechar ou reposicionar o controle ao trocar bloco, excluir bloco, rolar, mudar viewport ou pressionar Escape.
7. No mobile real, apresentar o controle em barra inferior segura para não cobrir o texto nem depender de hover.
8. Aplicar limites por variante e campo; o fitting continua como proteção final, não como substituto do tamanho escolhido.

**Critério de saída**
- Selecionar qualquer texto editável da capa revela o slider correto; o valor sobrevive a salvar, recarregar, desfazer e refazer.

### Fase 5 — Corrigir o preview responsivo e garantir paridade pública
**Arquivos principais**
- `src/pages/comercial/components/editor/VisualRenderer.tsx`
- `src/pages/comercial/EditorPropostaPage.tsx`
- `src/pages/comercial/components/editor/modals/FullscreenPreviewModal.tsx`
- `src/pages/comercial/PublicProposalViewer.tsx`
- Estilos dedicados do motor de propostas

**Ações**
1. Substituir a altura fixa do telefone por viewport com largura controlada e rolagem interna real; o documento não será cortado por `overflow-hidden`.
2. Separar:
   - viewport de edição;
   - tamanho lógico do documento;
   - escala visual do preview.
3. Fazer desktop, mobile e link público fornecerem a mesma largura efetiva ao motor responsivo.
4. Remover dependência incerta de variantes `@md/@lg` ou configurar oficialmente container queries; preferencialmente centralizar breakpoints em CSS do próprio motor.
5. Não usar `window.innerWidth` para decidir a composição de um canvas reduzido dentro do desktop; a resposta deve depender da largura do próprio documento.
6. Fazer o viewer público determinar o modo pelo container/viewport real, em vez de forçar desktop.
7. Validar rolagem, safe area, teclado virtual e barra contextual em celular.
8. Manter zoom como transformação visual sem mudar os cálculos internos de layout.

**Critério de saída**
- O mesmo bloco tem resultado equivalente no preview mobile e no link aberto em celular; nenhuma capa ou seção termina cortada na altura de 812 px.

### Fase 6 — Alinhar IA, modelos de biblioteca e criação de propostas
**Arquivos principais**
- `workers/proposals-ai/src/index.ts`
- `workers/proposals-ai/src/sanitize.ts`
- `src/hooks/useProposalAI.ts`
- `src/hooks/useMaterials.ts`
- `src/pages/comercial/biblioteca/hooks/useCreateMaterialWizard.ts`
- `src/pages/comercial/biblioteca/components/wizard/StepTemplateGallery.tsx`
- Nova migração idempotente para `proposal_templates`

**Ações**
1. Atualizar o catálogo do Worker com os seis IDs oficiais e suas capacidades.
2. A IA poderá escolher uma variante, mas não inventar IDs, tamanhos fora da faixa nem orientação implícita.
3. Normalizar a resposta do Worker novamente no cliente antes de criar a versão inicial.
4. Atualizar templates ativos para variantes oficiais e defaults completos, preservando propostas já criadas.
5. Substituir cards genéricos da biblioteca por previews/miniaturas que representem a composição real.
6. Corrigir no mesmo escopo o parâmetro `canvas` exigido pelo fluxo de criação, caso o typecheck atual confirme o erro.
7. Não introduzir novo armazenamento ou serviço; esta frente usa o conteúdo já persistido nas versões.

**Critério de saída**
- Propostas criadas manualmente, por template ou por IA entram no editor com o mesmo contrato válido e uma capa renderizável.

### Fase 7 — Compatibilidade e segurança de edição
**Ações**
1. Criar fixtures para documentos legados: variante ausente, `centered`, `split`, `full`, `gradient_parallax` e props parciais.
2. Garantir leitura compatível sem regravar automaticamente o documento ao apenas abri-lo.
3. Migrar para o novo formato somente quando houver edição/salvamento ou por migração idempotente explicitamente aprovada.
4. Preservar versão publicada e links congelados; edição de uma versão publicada continua criando novo rascunho.
5. Não alterar RLS, acesso, compartilhamento ou regras financeiras nesta entrega.
6. Remover toast de sucesso do salvamento comum e manter feedback inline, conforme o Design DNA; erros continuam explícitos.

### Fase 8 — Testes automatizados e matriz visual
**Testes unitários**
- Normalização de todos os IDs legados.
- Defaults e limites tipográficos por variante.
- Preservação de orientação ao trocar composição.
- Fitting sem mutação do slot da fotografia.
- Sanitização de resposta da IA.

**Testes de componente**
- Um teste por variante em retrato e paisagem.
- Texto curto, longo, palavra sem espaços e campos vazios.
- Imagens vertical, horizontal, quadrada, ausente e com erro.
- Seleção de cada campo, slider, reset, undo/redo e troca de bloco.

**Testes de integração/E2E**
- Criar proposta vazia, por cada template e por IA.
- Editar texto e imagem sem mudança nas dimensões do slot de mídia.
- Salvar, recarregar e publicar mantendo orientação e tamanhos.
- Comparar editor, preview tela cheia e link público.

**Matriz de viewports**
- 320 × 568
- 375 × 812
- 390 × 844
- 768 × 1024
- 1024 × 768
- 1280 × 800
- 1440 × 900

**Regressão visual**
- Capturas estáveis das 6 variantes × 2 orientações × mobile/desktop.
- Limites geométricos medidos: largura e proporção do slot de imagem devem permanecer iguais antes e depois de alterar cada texto.
- Sem sobreposição incoerente, texto cortado, scroll horizontal ou controles fora da tela.

### Fase 9 — Validação obrigatória e liberação gradual
1. Revisar o diff linha a linha nos arquivos alterados.
2. Executar `npm run typecheck:changed` e corrigir todos os erros reportados.
3. Executar a suíte focada do construtor e o build de produção.
4. Conferir `/tmp/observability/build-errors.log`, runtime e console.
5. Rodar Playwright no editor e no link público com as dimensões da matriz.
6. Liberar inicialmente atrás de flag para propostas novas.
7. Validar propostas antigas antes de ampliar a flag.
8. Manter rollback para o renderizador anterior durante a janela de estabilização.

## Ordem recomendada de entrega
```text
Contrato e legado
    ↓
6 renderizadores reais
    ↓
orientação manual
    ↓
seleção + slider
    ↓
preview responsivo e viewer público
    ↓
IA + templates
    ↓
testes, flag e liberação
```

## Arquivos previstos

### Alteração direta
- `src/pages/comercial/components/editor/blocks/CoverBlocks.tsx`
- `src/pages/comercial/blocks/registryDefinitions.ts`
- `src/pages/comercial/blocks/normalization.ts`
- `src/pages/comercial/blocks/registry.ts`
- `src/pages/comercial/blocks/EditableText.tsx`
- `src/pages/comercial/blocks/inlineContext.ts`
- `src/pages/comercial/components/editor/VisualRenderer.tsx`
- `src/pages/comercial/components/editor/PropertiesSidebar.tsx`
- `src/pages/comercial/EditorPropostaPage.tsx`
- `src/pages/comercial/components/editor/modals/FullscreenPreviewModal.tsx`
- `src/pages/comercial/PublicProposalViewer.tsx`
- `src/hooks/useMaterialEditor.ts`
- `src/hooks/useProposalAI.ts`
- `src/hooks/useMaterials.ts`
- `src/pages/comercial/biblioteca/hooks/useCreateMaterialWizard.ts`
- `src/pages/comercial/biblioteca/components/wizard/StepTemplateGallery.tsx`
- `workers/proposals-ai/src/index.ts`
- `workers/proposals-ai/src/sanitize.ts`

### Criação provável
- Tipos e catálogo compartilhado das capas.
- Seis componentes de composição em `blocks/covers/`.
- Utilitário de fitting e geometria.
- Toolbar contextual de tipografia.
- Estilos dedicados ao canvas responsivo.
- Fixtures e testes do motor.
- Migração idempotente dos templates oficiais.

## Critérios finais de aceite
- Existem exatamente seis modelos oficiais, visualmente e estruturalmente distintos.
- Nenhuma variante oficial cai no renderizador de outra.
- Texto nunca altera largura, altura ou proporção do slot reservado à fotografia.
- Orientação é manual, persistida e independente da composição.
- Clicar em texto editável abre o ajuste contextual de tamanho.
- Slider, reset, undo/redo, salvar, recarregar e publicar funcionam.
- Preview mobile e link público apresentam composição equivalente.
- Não há corte vertical causado pela moldura de telefone.
- Conteúdo legado continua abrindo com mapeamento previsível.
- Templates e IA produzem apenas o contrato vigente.
- Typecheck, testes focados, build e inspeção visual passam sem regressões.

## Fora do escopo
- Refatorar outros blocos da proposta além do necessário para o canvas compartilhado.
- Alterar regras comerciais, pacotes, preços, compartilhamento ou pagamentos.
- Criar novo backend, storage ou fluxo de upload.
- Redesenhar a biblioteca inteira ou a navegação do módulo Comercial.
