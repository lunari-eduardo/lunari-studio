# Capas das Galerias de Entrega — auditoria, correções e redesign completo

Documento de estruturação e implementação. Escrito para ser executado por outra IA sem consultar mais nada além do código.

---

## PARTE A — AUDITORIA (o que está errado hoje)

Arquivos auditados: `src/components/deliver/covers/{registry.ts,types.ts,CoverRenderer.tsx,thumbnails.tsx}`, `variants/{FullscreenCover,FloatingFrameCover,SplitCover,EditorialCover}.tsx`, `editorial/*`, `src/pages/gallery/ClientDeliverGallery.tsx`, `src/hooks/useGalleryDisplayTheme.tsx`, `src/components/FontSelect.tsx`, `index.html`.

### A1. Bug de cor ao sair e voltar da capa (confirmado)
`ClientDeliverGallery.tsx` renderiza a capa em **dois lugares com fontes de cor diferentes**:

- Linha ~192, ramo "álbuns" (galeria com pastas): componente **fora** do `GalleryThemeProvider`. Usa constantes locais `bgColor/textColor/primaryColor` (`#0E0E0E` / `#FAF9F7` / `#C6A36A`) e `isDark` derivado de `data.clientMode`.
- Linha ~339, `ClientDeliverGalleryContent`: **dentro** do provider, lê `cssVars['--gallery-bg'|'--gallery-text'|'--gallery-primary']`.

Ao entrar numa pasta e voltar para os álbuns, o componente troca de ramo — a capa remonta com paleta diferente (texto e primária mudam). É exatamente o "muda a cor do texto quando minimiza e acessa de novo".

### A2. Fontes escolhidas pelo fotógrafo não carregam
`GALLERY_FONTS` (`FontSelect.tsx`) oferece 11 famílias, mas `index.html` só carrega Bodoni Moda, Cormorant Garamond, Playfair Display, Source Sans 3, Fraunces, Inter Tight, JetBrains Mono, Instrument Serif, Geist, Manrope e Inter. Não carregam: Imperial Script, League Script, Allura, Amatic SC, Shadows Into Light, Source Serif 4, Cormorant (a lista usa `Cormorant`, o HTML carrega `Cormorant Garamond`), Raleway, Quicksand. Resultado: a capa cai em serif/cursive do sistema e fica diferente do preview.

### A3. Três capas são rascunhos
`FullscreenCover`, `FloatingFrameCover` e `SplitCover` são quase idênticas: foto + `font-light` + botão com borda + `ChevronDown` piscando. Não usam `subtitle`, `sessionDate`, `category`, `primaryColor` nem `textOverlayColor` — props que o contrato (`types.ts`) já entrega. Não há tratamento de contraste sobre a foto (só um gradiente fixo), não há grade tipográfica, e `FloatingFrame` usa `hover:${textColor}` (classe dinâmica que o Tailwind não gera — hover morto).

### A4. Outras inconsistências
- `Fullscreen` ignora `isDark` no texto (sempre branco) — em tema claro com foto clara o título some.
- `Split` usa `h-[70vh]` no mobile e `min-h-screen` no container: sobra faixa vazia em telas baixas.
- `FloatingFrame` fixa `aspect 16/10` mesmo para foto vertical — corta rosto.
- Miniaturas do catálogo (`thumbnails.tsx`) são SVGs genéricos que não representam os layouts.
- `Editorial` está correto na arquitetura, mas o peso da fonte varia (traços finos) e o fit em telas pequenas usa mínimo de 24–26px, gerando quebras apertadas.

---

## PARTE B — CORREÇÕES DE BUG (fase 1, obrigatória antes do redesign)

### B1. Fonte única de tema para a capa
`src/pages/gallery/ClientDeliverGallery.tsx`
- Mover o ramo "álbuns" para **dentro** de `ClientDeliverGalleryContent` (ou envolver os dois ramos pelo mesmo `GalleryThemeProvider`), de forma que exista **um único** cálculo de `isDark/bgColor/textColor/primaryColor`, sempre vindo de `cssVars`.
- Remover as constantes duplicadas `bgColor`, `textColor`, `primaryColor` do topo do arquivo.
- Passar `textColor` e `textOverlayColor` explicitamente ao `CoverRenderer` (hoje nunca são passados).

### B2. Estabilidade da capa entre navegações
- Não remontar a capa ao trocar de pasta: manter a `<CoverRenderer>` sempre montada e alternar apenas o conteúdo abaixo dela.
- No `EditorialCover`, o `useState` inicial de `size` lê `window` — ao remontar, ocorre um frame com medida errada. Inicializar com `{width:0,height:0}` e só renderizar o título quando `width>0` (evita "pulo" do tipo).

### B3. Fontes
`index.html` — adicionar em UM único `<link>` (evitar 3 requisições) todas as famílias do catálogo novo (Parte D), com os pesos exatos listados. Remover do `GALLERY_FONTS` qualquer família que não esteja no link.

---

## PARTE C — NOVO CONTRATO DAS CAPAS

`src/components/deliver/covers/types.ts` — estender `CoverVariantProps`:

```ts
export interface CoverVariantProps {
  coverPhoto: PhotoPaths | null;
  sessionName: string;
  subtitle?: string;
  sessionDate?: string | Date | null;
  category?: string;
  issueNumber?: string;
  studioName?: string;
  sessionFont?: string;        // font-family CSS resolvida
  titleCaseMode?: TitleCaseMode;
  isDark?: boolean;
  textColor?: string;          // cor de texto do tema
  textOverlayColor?: string;   // cor de texto sobre foto
  primaryColor?: string;
  ctaLabel?: string;           // default 'Ver galeria'
  onEnter: () => void;
}
```

Criar `src/components/deliver/covers/shared/`:
- `useCoverPalette.ts` — recebe `{isDark, textColor, textOverlayColor, primaryColor}` e devolve tokens estáveis: `ink`, `inkMuted`, `onPhoto`, `onPhotoMuted`, `line`, `accent`, `surface`. Todas as variantes passam a consumir **somente** esses tokens (fim das classes `text-white`/`text-stone-900` espalhadas).
- `CoverCta.tsx` — botão único, três estilos (`outline` | `solid` | `underline`), altura 44px mínimo (toque), tracking `0.22em`, `text-[11px] md:text-xs`, uppercase, transição 300ms.
- `CoverScrollCue.tsx` — indicador de rolagem discreto (linha vertical de 40px com animação de 2.4s, sem `animate-bounce`).
- `useImageOrientation.ts` — lê `coverPhoto.width/height` e devolve `'portrait' | 'landscape' | 'square'` para as capas ajustarem enquadramento.

`registry.ts` — manter os 4 ids (`fullscreen`, `floating-frame`, `split`, `editorial`) para não quebrar galerias existentes; só o desenho muda. Renomear apenas os `name`/`description` exibidos.

---

## PARTE D — CATÁLOGO DE 10 FONTES (Google Fonts)

Substitui `GALLERY_FONTS` em `src/components/FontSelect.tsx`. Cada fonte tem personalidade distinta e uma capa "afinidade" recomendada.

| id | Família | Caráter | Pesos a carregar | Afinidade |
|---|---|---|---|---|
| `bodoni` | Bodoni Moda | Didone alto contraste | 400;500;600;700 | Editorial |
| `playfair` | Playfair Display | Serif clássica editorial | 400;500;600;700 | Editorial / Split |
| `cormorant-garamond` | Cormorant Garamond | Serif fina e romântica | 300;400;500;600 | Floating |
| `dm-serif` | DM Serif Display | Serif densa de manchete | 400 | Fullscreen |
| `instrument-serif` | Instrument Serif | Serif moderna condensada | 400 + itálico | Editorial |
| `syne` | Syne | Sans display geométrica | 400;600;700;800 | Fullscreen |
| `jost` | Jost | Sans geométrica Bauhaus | 300;400;500;600 | Split |
| `outfit` | Outfit | Sans neutra contemporânea | 300;400;500;600 | Floating |
| `marcellus` | Marcellus | Romana lapidar, luxo | 400 | Split |
| `italiana` | Italiana | Display fina, alta-costura | 400 | Floating |

Regras:
- `getFontFamilyById` continua o ponto único de resolução; o fallback passa a ser `'Playfair Display', Georgia, serif`.
- Cada entrada ganha `weightTitle` e `letterSpacing` recomendados, usados pelas capas:
  `bodoni 600/-0.01em`, `playfair 500/-0.005em`, `cormorant-garamond 500/0`, `dm-serif 400/-0.01em`, `instrument-serif 400/0`, `syne 700/-0.02em`, `jost 400/0.02em`, `outfit 400/0.01em`, `marcellus 400/0.04em`, `italiana 400/0.08em`.
- Nunca usar peso 300 em título sobre foto (é a origem dos traços finos).

---

## PARTE E — REDESIGN DAS CAPAS

Escala tipográfica compartilhada (usar `clamp`, nunca breakpoints soltos):
- Display XL: `clamp(2.6rem, 9vw, 7rem)`
- Display L: `clamp(2.2rem, 6.5vw, 4.75rem)`
- Display M: `clamp(1.9rem, 4.5vw, 3.25rem)`
- Kicker: `clamp(0.62rem, 1.1vw, 0.75rem)`, tracking `0.32em`, uppercase
- Meta: `clamp(0.65rem, 1vw, 0.78rem)`, tracking `0.18em`

### E1. `FullscreenCover` → "Cinemática"
Foto em tela cheia, título ancorado na base, não no centro.
- Estrutura: foto `object-cover` + **duas** camadas de véu: gradiente vertical `rgba(0,0,0,.55) → transparent 55%` de baixo para cima, e um `backdrop-blur-[2px]` só na faixa inferior de 38% (garante legibilidade sem escurecer a foto inteira).
- Conteúdo alinhado à esquerda, dentro de um container `max-w-[1440px]` com padding `px-6 md:px-14`, base `pb-16 md:pb-20`.
- Ordem: kicker (`studioName` · `category`), título Display XL em duas linhas com `text-balance`, régua fina de 56px na cor `accent`, meta (data formatada `dd 'de' MMMM 'de' yyyy` pt-BR), CTA `outline` claro.
- Peso do título: vem de `weightTitle` da fonte; mínimo 500.
- Mobile: título Display L, kicker acima, CTA largura total até 320px.
- Movimento: foto com `scale(1.04) → 1` em 1.2s ease-out no mount; texto sobe 12px com fade escalonado (60ms entre elementos). Respeitar `prefers-reduced-motion`.

### E2. `FloatingFrameCover` → "Passe-partout"
Moldura de museu: a foto flutua sobre o fundo do tema.
- Fundo: cor `surface` do tema (não branco fixo) + textura de grão sutil via `radial-gradient` de 2% de opacidade.
- Moldura: `max-w-[min(1100px,86vw)]`, proporção **derivada da orientação real** (`useImageOrientation`): retrato `4/5`, paisagem `3/2`, quadrado `1/1`; `max-height: 74vh`; sombra `0 40px 80px -40px rgba(0,0,0,.45)`.
- Título **abaixo** da foto, centralizado, Display M, com o subtítulo em itálico da mesma família e um filete de 1px acima com 72px de largura na cor `accent`.
- Kicker do estúdio acima da moldura, `Kicker`.
- Data e categoria em uma linha só, separadas por `·`, cor `inkMuted`.
- CTA estilo `underline` (texto + linha animada que cresce da esquerda no hover).
- Mobile: moldura `92vw`, título Display M reduzido, tudo empilhado com gap 24px.

### E3. `SplitCover` → "Diptych"
Duas colunas com tensão editorial.
- Grade `md:grid-cols-[1.35fr_1fr]`; foto à esquerda, painel à direita na cor `surface`.
- Painel com padding `px-8 md:px-14 lg:px-20`, conteúdo alinhado ao baseline óptico (usar `justify-center` + `translate-y-[-4%]`).
- Ordem: número/ediçāo opcional (`issueNumber`) em mono discreto, kicker, título Display L com quebra manual por palavras (máx. 2 linhas, `hyphens:none`), subtítulo, filete vertical de 1px × 64px na cor `accent` colado à esquerda do bloco, meta, CTA `solid` (fundo `accent`, texto de contraste calculado).
- Detalhe de sofisticação: a foto avança 40px sobre o painel em desktop (`md:mr-[-40px] z-10`) criando sobreposição — o painel ganha `pl-[64px]`.
- Mobile: foto `h-[52vh]` no topo, painel abaixo com `pt-10 pb-14`, sem sobreposição, sem `min-h-screen` (usa altura de conteúdo) — corrige a faixa vazia.

### E4. `EditorialCover` — apenas ajustes
Não alterar a arquitetura (seam, `composition.ts`, `useSeamContrast`, `useFittedTitle`).
1. Peso: aplicar `fontWeight` do catálogo (mínimo 500; Bodoni/Playfair 600) e `-webkit-text-stroke: 0.35px currentColor` **somente** quando `fontSize < 48px`, para os traços finos não sumirem.
2. Fit: em `useFittedTitle`, elevar o mínimo mobile de 24px para 30px e reduzir `maxFontSizeVw` vertical de 16→14 (single) e 11→10 (duas linhas), evitando estouro.
3. Responsivo: em `composition.ts`, mover a costura vertical de mobile para 46% da altura e aumentar a margem lateral do título de forma proporcional (`clamp(16px, 6vw, 64px)`).
4. Inicialização de `size` conforme B2.
5. Nada mais muda visualmente.

### E5. Miniaturas do catálogo
`thumbnails.tsx` — redesenhar os 4 SVGs para refletirem os layouts finais (retângulo de foto + barras de texto na posição real), 3:2, traços de 1px, cor `currentColor`, sem texto.

---

## PARTE F — CONTROLES NO EDITOR
`src/pages/gallery/deliver/detail/components/DeliverDesignTab.tsx`
- O `CoverCatalog` passa a mostrar nome novo + miniatura nova + descrição de uma linha.
- Adicionar seletor de fonte usando o catálogo de 10 (componente `FontSelect` já existente) na mesma aba, com preview usando o nome real da sessão.
- Preview da capa no editor deve receber os mesmos tokens de paleta do público (importar `useCoverPalette`), garantindo paridade editor ↔ link público.

---

## PARTE G — TESTES DE ACEITE
1. Galeria com pastas: entrar num álbum, voltar — cor de texto, fundo e cor primária da capa idênticas (bug A1).
2. Cada uma das 10 fontes selecionada renderiza a família correta (inspecionar `computedStyle.fontFamily` e conferir que não caiu no fallback).
3. As 4 capas em: 375×667, 390×844, 768×1024, 1440×900, 1920×1080 — sem estouro horizontal, sem texto cortado, CTA sempre visível sem rolagem.
4. Foto vertical, horizontal e quadrada em cada capa — sem corte de rosto no centro.
5. Tema claro e escuro em cada capa — contraste do título ≥ 4.5:1 sobre a foto.
6. Editorial: comparar antes/depois — layout igual, apenas peso e tamanho ajustados.
7. `prefers-reduced-motion: reduce` desliga as animações de entrada.
8. Galerias antigas com `cover_id` salvo continuam abrindo na mesma variante.

---

## ARQUIVOS ALTERADOS / CRIADOS
Alterados:
- `index.html`
- `src/components/FontSelect.tsx`
- `src/components/deliver/covers/types.ts`
- `src/components/deliver/covers/registry.ts`
- `src/components/deliver/covers/thumbnails.tsx`
- `src/components/deliver/covers/variants/FullscreenCover.tsx`
- `src/components/deliver/covers/variants/FloatingFrameCover.tsx`
- `src/components/deliver/covers/variants/SplitCover.tsx`
- `src/components/deliver/covers/variants/EditorialCover.tsx`
- `src/components/deliver/covers/editorial/composition.ts`
- `src/components/deliver/covers/editorial/useFittedTitle.ts`
- `src/pages/gallery/ClientDeliverGallery.tsx`
- `src/pages/gallery/deliver/detail/components/DeliverDesignTab.tsx`

Criados:
- `src/components/deliver/covers/shared/useCoverPalette.ts`
- `src/components/deliver/covers/shared/CoverCta.tsx`
- `src/components/deliver/covers/shared/CoverScrollCue.tsx`
- `src/components/deliver/covers/shared/useImageOrientation.ts`

Sem alteração de banco de dados: `cover_id`, `configuracoes.sessionFont` e `titleCaseMode` já existem.

---

## ORDEM DE EXECUÇÃO
1. Parte B (bugs) → 2. Parte C (contrato + shared) → 3. Parte D (fontes) → 4. E1 → 5. E2 → 6. E3 → 7. E4 (Editorial) → 8. E5 + Parte F → 9. Parte G.
