

# Workflow Cards: Click Area, Visual Upgrade, and Gallery Integration

## 3 Problems Identified

1. **Click-to-expand only works on specific zones** — Interactive elements (inputs, dropdowns, links, buttons) have `e.stopPropagation()`, which is correct, but the remaining clickable area feels unpredictable. The outer `<div>` wrapping the entire collapsed row receives the click, but users expect the whole card to expand.

2. **Visual design is flat** — Cards use plain `bg-card` with subtle shadows. The user wants gradient backgrounds inspired by the settings page (image 2), compatible with dark mode.

3. **Gallery access is a small icon button** that only creates new galleries — no way to see gallery status or open existing galleries from the workflow.

---

## Plan

### Task 1: Fix click-to-expand area

**File: `WorkflowCardCollapsed.tsx`**

The current approach already has `onClick={onToggleExpand}` on the grid container and `e.stopPropagation()` on interactive zones. The issue is that the outer `<div className="px-4 py-3">` wrapping all 3 layouts (desktop/tablet/mobile) does NOT have the click handler — clicks on padding areas don't trigger expand.

**Fix:** Move the `onClick={onToggleExpand}` and `cursor-pointer` to the outer wrapper `<div>` (line 228) instead of having it on each individual grid. This makes the entire card surface clickable, including padding areas. Keep `e.stopPropagation()` on interactive elements.

### Task 2: Modern gradient design with dark mode

**File: `WorkflowCard.tsx`**

Replace the flat `bg-card` with a subtle warm gradient background:
- Light mode: `bg-gradient-to-br from-white via-orange-50/30 to-amber-50/20` with a soft left border accent
- Dark mode: `bg-gradient-to-br dark:from-gray-900 dark:via-gray-800/80 dark:to-gray-900` 
- Expanded state: slightly different gradient to visually distinguish
- Add a thin left border with brand color gradient (`border-l-3 border-gradient`)

**File: `WorkflowCardList.tsx`**

Update the container background:
- Light: subtle warm gradient `bg-gradient-to-b from-orange-50/40 via-stone-50 to-orange-50/20`
- Dark: `dark:from-gray-950 dark:via-gray-900 dark:to-gray-950`

**File: `WorkflowCardExpanded.tsx`**

Update `bg-muted/5` to use a translucent gradient that blends with the card gradient.

### Task 3: Smart Gallery integration in workflow cards

**File: `WorkflowCardCollapsed.tsx`**

Replace the current simple `Image` icon button (Zona 10) with a smart gallery indicator:

- **No gallery exists** (`!galeriaId`): Show "Criar Galeria" button (current behavior, keep redirect to Gallery app)
- **Gallery exists** (`galeriaId` is set): Show a compact gallery status badge using `galeriaStatus` data already available in `SessionData`. The badge shows the current gallery state (rascunho, enviado para seleção, seleção finalizada, etc.) with appropriate colors. Clicking it opens the Gallery in a new tab using the existing gallery URL pattern.

The data (`galeriaId`, `galeriaStatus`, `galeriaStatusPagamento`) is already being loaded in `useWorkflowPackageData.ts` and mapped to `SessionData`. We just need to use it in the UI.

**Implementation details:**
- When `galeriaId` exists: render a small colored badge/chip showing gallery status + open link
- Badge colors: rascunho=gray, publicada/em_selecao=amber, finalizada=green  
- Click opens `gallery.lunarihub.com/gallery/{galeriaId}` in new tab
- Payment status indicator (small dot: green=pago, orange=pendente) alongside the gallery badge

**File: `WorkflowCardExpanded.tsx`**

Add a "Galeria" section in the expanded view (Block 3 area) that shows:
- Gallery status badge (larger)
- Payment status
- "Abrir Galeria" button that opens in new tab
- If no gallery: "Criar Galeria" button

## Files to Modify

| File | Change |
|------|--------|
| `src/components/workflow/WorkflowCardCollapsed.tsx` | Move click handler to outer div; replace gallery icon with smart status indicator |
| `src/components/workflow/WorkflowCard.tsx` | Add gradient backgrounds with dark mode support |
| `src/components/workflow/WorkflowCardList.tsx` | Update container background gradient |
| `src/components/workflow/WorkflowCardExpanded.tsx` | Add gallery section in Block 3; update background to match gradient theme |

