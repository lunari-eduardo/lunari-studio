---
trigger: always_on
description: Diretrizes de UI/UX Premium, Design Tokens, Tailwind e padrões visuais do Lunari Studio
---

# Design DNA & UI/UX Premium (Lunari Studio)

Toda interface construída no Lunari Studio deve refletir sofisticação, organização e velocidade ("Luxo Silencioso").

---

## 🎨 1. Distribuição Cromática
- **85% Neutros**: Tons claros suaves (`bg-background`, `bg-muted/30`) ou escuros elegantes (`dark:bg-[#121212]`).
- **12% Preto Grafite**: Superfícies escuras sólidas (`bg-[#171717]`, texto de alto contraste).
- **3% Dourado Lunari (`hsl(var(--accent-gold))` / `#D4AF37`)**:
  - Usado como detalhe de alto valor: bordas de itens ativos, pequenos acentos de ícones, badges especiais ou CTAs principais.
  - **PROIBIDO**: Criar botões gigantes com fundo dourado berrante ou banners dourados completos que ofusquem o conteúdo.

---

## 🧱 2. Componentes e Estilo Visual
- **Cantos Arredondados**: Padronizar em `rounded-xl` para cartões internos e `rounded-2xl` para modais e cartões mestre.
- **Sombras Sofisticadas**: Evitar sombras pretas duras. Usar sombras suaves de grande dispersão, ex: `shadow-[0_4px_30px_rgba(0,0,0,0.06)]`.
- **Bordas**: `border-border/60` a `border-border/80`. Sempre sutis.
- **Tipografia**:
  - Títulos: Fonte sóbria com tracking refinado (`tracking-tight font-semibold`).
  - Textos de Apoio: `text-xs text-muted-foreground`.
  - Dados Financeiros / Monetários: Usar sempre `useCurrencyInput` e alinhamento mono-espaçado quando em tabelas.

---

## 📱 3. Responsividade & Áreas de Rolagem (Ergonomia)
- **Mobile Safe Area**: Todo container com rolagem vertical deve ter margem inferior generosa:
  ```tsx
  style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}
  ```
- **Contenção Flexbox**: Nunca colocar cartões de documento (como folhas A4 ou listas extensas) em `display: flex; justify-content: center;` sem `items-start` ou sem bloco `mx-auto`, para evitar o bug de corte de altura vertical e vazamento de texto para o fundo cinza.
- **Menus e Barras Fixas**: Editores de tela cheia devem fixar o cabeçalho e a barra de ferramentas no topo (`shrink-0 border-b`), mantendo apenas a área do documento rolável.

---

## 🔕 4. Feedback Silencioso
- Não use toasts de sucesso para ações comuns de edição ou salvamento em segundo plano.
- Prefira estados discretos no cabeçalho: *"Salvo agora"*, *"Salvando..."*, *"Alterações não salvas"*.
