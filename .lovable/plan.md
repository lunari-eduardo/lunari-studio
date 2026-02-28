

# Fix: Navigation loop between EscolherPlano and EscolherPlanoPagamento

## Problem

The "Voltar" button on `EscolherPlano.tsx` uses `navigate(-1)` (browser history back). When the user flow is:

1. MinhaAssinatura → EscolherPlano → Pagamento
2. User clicks "Voltar" on Pagamento → goes to `/escolher-plano` (correct)
3. User clicks "Voltar" on EscolherPlano → `navigate(-1)` goes back to `/escolher-plano/pagamento` (loop!)

The history stack becomes: `[..., /escolher-plano, /pagamento, /escolher-plano]`, so `-1` goes right back to pagamento.

## Fix

Replace `navigate(-1)` in `EscolherPlano.tsx` with an explicit route. The primary entry point is `/minha-assinatura`, with fallbacks from the access wall or trial banner. Using `/minha-assinatura` as the explicit back target is the safest choice since that's the main management page.

### `src/pages/EscolherPlano.tsx` (line 262)

Change:
```typescript
onClick={() => navigate(-1)}
```
To:
```typescript
onClick={() => navigate("/minha-assinatura")}
```

### Files to modify

| File | Change |
|------|--------|
| `src/pages/EscolherPlano.tsx` | Replace `navigate(-1)` with `navigate("/minha-assinatura")` on back button |

