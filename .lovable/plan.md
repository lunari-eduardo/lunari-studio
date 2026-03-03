

# Replicate Gallery's Subscription Management Layout in Gestão

## Current vs Target

**Current (Gestão)**: Single card with plan details, separate card for actions. Title "Minha Assinatura". No icon beside plan name. `container max-w-2xl` wrapper.

**Target (Gallery)**: All sections (header, details, banners, actions) in ONE card separated by `<Separator />`. Package icon beside plan name. Title "Gerenciar Assinaturas". Cancelled/downgrade banners are inline rows inside the card, not separate floating cards.

## Changes to `src/pages/MinhaAssinatura.tsx`

1. **Title**: "Minha Assinatura" → "Gerenciar Assinaturas"
2. **Card structure**: Merge plan details + banners + actions into a single `rounded-xl border bg-card overflow-hidden` div with `<Separator />` between sections
3. **Plan header**: Add `Package` icon (h-10 w-10 rounded-lg bg-primary/10) to the left of plan name
4. **Cancelled banner**: Move inside the card after details grid, as a `px-6 py-4 bg-amber-500/5` row (not a separate card)
5. **Downgrade banner**: Same — inside card after separator, inline row
6. **Actions**: Inside card after separator, not a separate card. Remove "Ações" heading, keep buttons + disclaimer text
7. **Import `Separator`** and `Package` icon

Structure per subscription card:
```text
┌────────────────────────────────────┐
│ [Icon] Plan name          [Badge] │
│         Plano mensal/anual        │
├────────────────────────────────────┤
│ Valor    Próxima cobrança  Desde  │
├────────────────────────────────────┤
│ ⚠ Cancelled banner (if applies)   │
├────────────────────────────────────┤
│ ↓ Downgrade banner (if applies)   │
├────────────────────────────────────┤
│ [Upgrade] [Cancelar]              │
│ Alterações proporcionais...       │
└────────────────────────────────────┘
```

No other files need changes. Logic, hooks, and navigation remain identical.

