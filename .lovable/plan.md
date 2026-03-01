

# Fix: Card Width 70% + Gallery Column Alignment

## Changes

### 1. Card width = 70% of container

**File: `src/components/workflow/WorkflowCardList.tsx`**
- Keep `min-w-[1100px]` on the card wrapper but add `w-[70%]` so the card occupies 70% of the container width (remaining 30% reserved for future task panel)
- Container keeps horizontal scroll

### 2. Gallery column aligned like other fields with label

**File: `src/components/workflow/WorkflowCardCollapsed.tsx`**
- Change Zona 10 from a centered `div` to match the pattern of other zones: a `flex flex-col gap-0.5` with a `<span>` label "Galerias" (same `text-[10px] text-muted-foreground uppercase tracking-wide` as other labels like "Descrição", "Pacote", "Status")
- Gallery buttons sit below the label, aligned with other fields
- Grid column stays `auto` to fit content

## Files to Modify

| File | Change |
|------|--------|
| `src/components/workflow/WorkflowCardList.tsx` | Card wrapper gets `w-[70%]` |
| `src/components/workflow/WorkflowCardCollapsed.tsx` | Zona 10 gets "Galerias" label above buttons |

