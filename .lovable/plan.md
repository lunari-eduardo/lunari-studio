

# Plan: Fazer `unified_plans` ser a fonte única de verdade

## Situação atual

O painel Admin (`AdminPlanos.tsx`) atualiza a tabela `unified_plans` no banco, mas **nada lê dela**. Os preços exibidos e cobrados vêm de constantes hardcoded em 5 lugares:

| Onde | Lê de |
|------|-------|
| `src/lib/planConfig.ts` (ALL_PLAN_PRICES) | Hardcoded |
| `src/pages/EscolherPlano.tsx` | `planConfig.ts` hardcoded |
| `asaas-create-subscription/index.ts` | PLANS hardcoded |
| `asaas-upgrade-subscription/index.ts` | PLANS hardcoded |
| `asaas-create-payment/index.ts` | PLANS hardcoded |
| `asaas-downgrade-subscription/index.ts` | ALL_PLAN_PRICES hardcoded |

**Para que o Admin funcione de verdade, todos esses pontos precisam ler da tabela `unified_plans`.**

## Implementação

### 1. Hook `useUnifiedPlans` — Frontend lê do banco

Criar `src/hooks/useUnifiedPlans.ts`:
- Query `unified_plans` via Supabase com `useQuery` (5min staleTime)
- Exportar helpers: `getPlanPrice(code, cycle)`, `getPlanName(code)`, etc.
- Substituir todos os usos de `ALL_PLAN_PRICES` no frontend

### 2. Refatorar `src/lib/planConfig.ts`

- Manter `PLAN_FAMILIES`, `PLAN_ORDER`, `PLAN_INCLUDES` como fallback estático (estrutura, não preços)
- Remover `ALL_PLAN_PRICES` ou marcá-lo como fallback offline
- Adicionar export de funções que aceitem dados dinâmicos

### 3. Refatorar `src/pages/EscolherPlano.tsx`

- Usar `useUnifiedPlans()` ao invés de `ALL_PLAN_PRICES`
- Preços, nomes e features vêm do banco
- Loading state enquanto carrega planos

### 4. Refatorar 4 Edge Functions para ler do banco

Cada Edge Function (`asaas-create-subscription`, `asaas-upgrade-subscription`, `asaas-create-payment`, `asaas-downgrade-subscription`) será alterada para:

- Criar `adminClient` com Service Role Key (já fazem isso)
- Buscar plano: `adminClient.from('unified_plans').select('*').eq('code', planType).eq('is_active', true).single()`
- Usar `plan.monthly_price_cents` e `plan.yearly_price_cents` ao invés do PLANS hardcoded
- Remover a constante `PLANS` de cada função

Padrão para todas:
```typescript
// Substituir PLANS[planType] por:
const { data: plan, error: planError } = await adminClient
  .from('unified_plans')
  .select('code, name, monthly_price_cents, yearly_price_cents, is_active, select_credits_monthly')
  .eq('code', planType)
  .eq('is_active', true)
  .single();

if (!plan) {
  return new Response(JSON.stringify({ error: "Invalid plan type" }), { status: 400, ... });
}

const valueCents = billingCycle === "YEARLY" ? plan.yearly_price_cents : plan.monthly_price_cents;
```

### 5. Arquivos a modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useUnifiedPlans.ts` | **Criar** — hook que busca planos do banco |
| `src/lib/planConfig.ts` | **Editar** — remover ALL_PLAN_PRICES, manter utilitários |
| `src/pages/EscolherPlano.tsx` | **Editar** — usar hook ao invés de constantes |
| `src/pages/AdminPlanos.tsx` | **Editar** — remover comparação hardcoded (não mais necessária) |
| `supabase/functions/asaas-create-subscription/index.ts` | **Editar** — lookup no banco |
| `supabase/functions/asaas-upgrade-subscription/index.ts` | **Editar** — lookup no banco |
| `supabase/functions/asaas-create-payment/index.ts` | **Editar** — lookup no banco |
| `supabase/functions/asaas-downgrade-subscription/index.ts` | **Editar** — lookup no banco |

### Resultado

Alterar um preço no Admin → reflete imediatamente no checkout e nas cobranças, sem deploy.

