

# Plan: Admin Panel for Managing Plans and Pricing

## Current State Analysis

### Where prices live today (the problem)

Prices are **hardcoded in 5+ separate places** across two projects, creating a synchronization nightmare:

| Location | Project | Type |
|----------|---------|------|
| `src/lib/planConfig.ts` (ALL_PLAN_PRICES) | Studio | Frontend display + prorata calc |
| `src/lib/transferPlans.ts` (ALL_PLAN_PRICES) | Gallery | Frontend display + prorata calc |
| `supabase/functions/asaas-create-subscription` | Shared (both deploy) | Billing at Asaas |
| `supabase/functions/asaas-upgrade-subscription` | Shared (both deploy) | Billing at Asaas |
| `supabase/functions/asaas-create-payment` | Shared (both deploy) | Yearly billing |
| `unified_plans` table in Supabase | Shared DB | Access control (get_access_state RPC) |

The `unified_plans` table already exists with all 8 plans, complete with `monthly_price_cents`, `yearly_price_cents`, `includes_studio`, `includes_select`, `includes_transfer`, `select_credits_monthly`, `transfer_storage_bytes`, `sort_order`, and `is_active`. **This is the ideal single source of truth** -- it just isn't being used by the frontends or edge functions yet.

### What needs to change

**Phase 1 (this plan):** Build an admin page to edit `unified_plans` directly.

**Phase 2 (follow-up):** Refactor frontends and edge functions to read from `unified_plans` instead of hardcoded constants. This is documented at the end for both projects.

---

## Implementation Plan

### 1. Create Admin "Produtos & Planos" page

New file: `src/pages/AdminPlanos.tsx`

A page at route `/app/admin/planos` (wrapped in `AdminRoute`) with:

- **Table view** of all `unified_plans` rows, grouped by `product_family` (Studio, Transfer, Combo)
- Each row shows: name, code, monthly price (R$), yearly price (R$), includes flags, credits, storage, active toggle
- **Inline edit** or modal to update: `name`, `monthly_price_cents`, `yearly_price_cents`, `description`, `select_credits_monthly`, `transfer_storage_bytes`, `is_active`, `sort_order`
- Prices displayed in R$ (converted from cents) with input validation
- Save button that updates `unified_plans` directly via Supabase client
- Visual diff: show current hardcoded values vs DB values if they differ (warning banner)

### 2. Add RLS policy for admin write access

The `unified_plans` table needs admin-only UPDATE policy:

```sql
CREATE POLICY "Admins can update unified_plans"
ON public.unified_plans
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Anyone authenticated can read unified_plans"
ON public.unified_plans
FOR SELECT
TO authenticated
USING (true);
```

### 3. Register the route

In `src/App.tsx`, add:
```tsx
<Route path="admin/planos" element={
  <AdminRoute><AdminPlanos /></AdminRoute>
} />
```

### 4. Add navigation link

In the admin sidebar/menu (wherever AdminUsuarios and AdminConteudos are linked), add a link to `/app/admin/planos`.

### 5. Files to create/modify

| File | Action |
|------|--------|
| `src/pages/AdminPlanos.tsx` | **Create** - Full admin page |
| `src/App.tsx` | **Edit** - Add route |
| `src/components/layout/Sidebar.tsx` or equivalent | **Edit** - Add nav link |
| Migration SQL | **Create** - RLS policies on unified_plans |

### 6. Page layout

```text
┌─────────────────────────────────────────────────┐
│ Produtos & Planos                    [Salvar]   │
├─────────────────────────────────────────────────┤
│ ⚠ Aviso: Alterações refletem nos dois sistemas │
│   (Studio e Gallery) após deploy.               │
├─────────────────────────────────────────────────┤
│ STUDIO                                          │
│ ┌───────────┬──────────┬──────────┬──────────┐  │
│ │ Plano     │ Mensal   │ Anual    │ Ativo    │  │
│ ├───────────┼──────────┼──────────┼──────────┤  │
│ │ Starter   │ R$14,90  │ R$151,98 │ ✓        │  │
│ │ Pro       │ R$35,90  │ R$366,18 │ ✓        │  │
│ └───────────┴──────────┴──────────┴──────────┘  │
│                                                 │
│ TRANSFER                                        │
│ ┌───────────┬──────────┬──────────┬──────┬────┐ │
│ │ Plano     │ Mensal   │ Anual    │ GB   │ ✓  │ │
│ ├───────────┼──────────┼──────────┼──────┼────┤ │
│ │ 5GB       │ R$12,90  │ R$123,84 │  5   │ ✓  │ │
│ │ 20GB      │ R$24,90  │ R$239,04 │ 20   │ ✓  │ │
│ │ 50GB      │ R$34,90  │ R$335,04 │ 50   │ ✓  │ │
│ │ 100GB     │ R$59,90  │ R$575,04 │ 100  │ ✓  │ │
│ └───────────┴──────────┴──────────┴──────┴────┘ │
│                                                 │
│ COMBOS                                          │
│ ┌──────────────────┬────────┬────────┬─────────┐│
│ │ Plano            │ Mensal │ Anual  │ Créditos││
│ ├──────────────────┼────────┼────────┼─────────┤│
│ │ Pro + Select 2k  │ R$44,90│R$452,59│ 2000    ││
│ │ Combo Completo   │ R$64,90│R$661,98│ 2000    ││
│ └──────────────────┴────────┴────────┴─────────┘│
└─────────────────────────────────────────────────┘
```

---

## Documentation for Gallery Project (Lunari Gallery)

The following changes must be applied to the [Lunari Gallery](/projects/8f0538c4-45b7-450e-b9bb-169d0dcc657e) project to complete the unification:

### 1. Edge Function: `asaas-create-subscription/index.ts`

**Problem:** Gallery's PLANS map is missing `studio_starter` and `studio_pro`. This causes 400 errors when Studio deploys are overwritten.

**Fix:** Add to line 14:
```typescript
const PLANS: Record<string, { monthlyPrice: number; yearlyPrice: number; name: string }> = {
  studio_starter: { monthlyPrice: 1490, yearlyPrice: 15198, name: "Lunari Starter" },
  studio_pro: { monthlyPrice: 3590, yearlyPrice: 36618, name: "Lunari Pro" },
  transfer_5gb: { monthlyPrice: 1290, yearlyPrice: 12384, name: "Transfer 5GB" },
  // ... keep rest
};
```

Apply the same pattern to `asaas-upgrade-subscription`, `asaas-create-payment`, and `asaas-downgrade-subscription`.

### 2. Future: Read prices from `unified_plans` table

Both projects should eventually refactor their `ALL_PLAN_PRICES` / `PLANS` constants to fetch from the `unified_plans` table at runtime instead of using hardcoded values. This will make the admin panel changes effective immediately without needing code deploys.

**Frontend pattern (both projects):**
```typescript
// Replace hardcoded ALL_PLAN_PRICES with a hook
export function usePlanPrices() {
  return useQuery({
    queryKey: ['unified-plans'],
    queryFn: async () => {
      const { data } = await supabase
        .from('unified_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
```

**Edge Function pattern:**
```typescript
// Replace hardcoded PLANS with DB lookup
const { data: plans } = await adminClient
  .from('unified_plans')
  .select('code, monthly_price_cents, yearly_price_cents, name')
  .eq('is_active', true);

const plan = plans?.find(p => p.code === planType);
if (!plan) return error("Invalid plan type");

const valueCents = billingCycle === "YEARLY"
  ? plan.yearly_price_cents
  : plan.monthly_price_cents;
```

### 3. Keep `transferPlans.ts` synchronized

Until the DB-driven refactor is complete, Gallery's `src/lib/transferPlans.ts` must match Studio's `src/lib/planConfig.ts` exactly for all shared constants (`ALL_PLAN_PRICES`, `PLAN_FAMILIES`, `PLAN_INCLUDES`).

