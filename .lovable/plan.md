

# Fix: Prorata Credit Exceeding Plan Price

## Root Cause

The prorata calculation has a critical math bug in **3 places** (frontend display x2, edge function x1):

```
creditCents = round(priceCents * (daysRemaining / totalCycleDays))
```

- `totalCycleDays` is **hardcoded to 30** for monthly plans
- But actual `next_due_date` can be 60+ days away (e.g., created March 2, next_due May 3 = 62 days)
- This makes `daysRemaining / totalCycleDays > 1.0`, so **credit exceeds the plan price**

**Real example from DB:** Starter (R$14.90), 61 days remaining, totalCycleDays=30:
- Credit = round(1490 × 61/30) = **3030 cents** (R$30.30) — more than double the plan price!

This is why combo shows R$8.37 instead of ~R$46.30.

## Fix: Calculate actual cycle days from subscription data

Instead of hardcoding 30/365, calculate the real cycle length. And as a safety net, **cap each sub's credit at its own price**.

### 1. Frontend: `src/pages/EscolherPlano.tsx`

**In `getCrossProductProrata` (line 148):** Replace hardcoded `subTotalDays` with actual cycle calculation from `created_at` to `next_due_date`, and cap credit:

```ts
const subTotalDays = sub.next_due_date && sub.created_at
  ? Math.max(1, differenceInDays(new Date(sub.next_due_date), new Date(sub.created_at)))
  : (sub.billing_cycle === "YEARLY" ? 365 : 30);
const rawCredit = Math.round(subPriceCents * (subDaysRemaining / subTotalDays));
totalCreditCents += Math.min(rawCredit, subPriceCents); // cap at plan price
```

**In studio card prorata (line 338) and combo card prorata (line 466):** Same fix — calculate actual `totalCycleDays` from `studioSub` dates, and cap:

```ts
const totalCycleDays = (nextDueDate && studioSub?.created_at)
  ? Math.max(1, differenceInDays(new Date(nextDueDate), new Date(studioSub.created_at)))
  : (currentBillingCycle === "YEARLY" ? 365 : 30);
const creditCents = Math.min(
  Math.round(currentPriceCents * (daysRemaining / totalCycleDays)),
  currentPriceCents
);
```

Also update the top-level `totalCycleDays` (line 118) and `daysRemaining` usage (line 117) accordingly, since they feed the upgrade banner text too.

**`AsaasSubscription` interface needs `created_at`** — already present in the interface.

### 2. Edge Function: `supabase/functions/asaas-upgrade-subscription/index.ts`

**Line 139-142:** Same fix:

```ts
const totalCycleDays = currentSub.next_due_date && currentSub.created_at
  ? Math.max(1, daysBetween(new Date(currentSub.created_at), new Date(currentSub.next_due_date)))
  : (currentSub.billing_cycle === "YEARLY" ? 365 : 30);
const unusedValueCents = Math.min(
  Math.max(0, Math.round(currentPriceCents * (daysRemaining / totalCycleDays))),
  currentPriceCents
);
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/EscolherPlano.tsx` | Calculate actual cycle days from created_at→next_due_date; cap credit at plan price in all 3 prorata calculation sites |
| `supabase/functions/asaas-upgrade-subscription/index.ts` | Same: actual cycle days + cap credit at plan price |

