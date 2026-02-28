

# Fix: Prorata calculation using wrong date — `next_due_date` stores payment date, not period end

## Root Cause

The entire prorata system is broken because `next_due_date` stores the **payment charge date**, not the **end of the billing period**.

**Flow that causes the bug:**
1. User creates subscription → `asaas-create-subscription` stores `next_due_date = getNextBusinessDay()` (tomorrow)
2. Webhook fires `PAYMENT_CONFIRMED` → updates `next_due_date = payment.dueDate` (today/tomorrow)
3. User tries to upgrade → frontend calculates `daysRemaining = differenceInDays(tomorrow, today) = 1`
4. Credit = R$14.90 × (1/30) = R$0.50 → charges R$35.40 instead of ~R$21.50

**Correct behavior:** `next_due_date` should represent when the **next cycle starts** (i.e., end of current paid period). For a monthly plan created today, that's today + 30 days.

## Bugs Found (4 total)

| # | Location | Bug |
|---|----------|-----|
| 1 | `asaas-create-subscription` line 223 | Stores Asaas's `nextDueDate` (first charge date = tomorrow) as `next_due_date` |
| 2 | `asaas-webhook` line 219 | On `PAYMENT_CONFIRMED`, sets `next_due_date = payment.dueDate` (current payment date, not next period end) |
| 3 | `asaas-upgrade-subscription` line 255 | New subscription uses `latestNextDueDate` from cancelled subs — which may be wrong for same reason |
| 4 | `asaas-webhook` `SUBSCRIPTION_RENEWED` (line 290) | Doesn't update `next_due_date` at all on renewal |

## Fix Plan

### Step 1: Fix `asaas-create-subscription/index.ts`

After creating the subscription, calculate the correct period end date instead of using Asaas's `nextDueDate`:

```typescript
// Line 223: Replace asaasData.nextDueDate with calculated period end
const periodEnd = new Date();
if (billingCycle === "YEARLY") {
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);
} else {
  periodEnd.setDate(periodEnd.getDate() + 30);
}
next_due_date: periodEnd.toISOString().split("T")[0],
```

### Step 2: Fix `asaas-webhook/index.ts` — `PAYMENT_CONFIRMED`

On payment confirmation, advance `next_due_date` by one cycle from the payment date:

```typescript
// Line 219: Calculate next period end from payment date
const paymentDate = new Date(payment.dueDate);
// Need to know billing cycle — fetch sub first, then calculate
const cycleDays = sub.billing_cycle === "YEARLY" ? 365 : 30;
const nextPeriodEnd = new Date(paymentDate);
nextPeriodEnd.setDate(nextPeriodEnd.getDate() + cycleDays);
next_due_date: nextPeriodEnd.toISOString().split("T")[0],
```

Restructure the `PAYMENT_CONFIRMED` handler to fetch the subscription FIRST (need `billing_cycle`), then update with the correct `next_due_date`.

### Step 3: Fix `asaas-webhook/index.ts` — `SUBSCRIPTION_RENEWED`

Add `next_due_date` update on renewal using the subscription's cycle:

```typescript
// After line 296, also advance next_due_date
const cycleDays = sub.billing_cycle === "YEARLY" ? 365 : 30;
const nextPeriodEnd = new Date();
nextPeriodEnd.setDate(nextPeriodEnd.getDate() + cycleDays);
// update next_due_date
```

### Step 4: Fix `asaas-upgrade-subscription/index.ts`

For the new subscription's `nextDueDate`, calculate the period end properly instead of inheriting from cancelled subs:

```typescript
// Line 248-256: Always calculate fresh period end
nextDueDate: (() => {
  const d = new Date();
  if (billingCycle === 'YEARLY') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setDate(d.getDate() + 30);
  }
  return d.toISOString().split("T")[0];
})(),
```

And store the correct `next_due_date` in the DB insert (line 306).

### Step 5: Deploy all 3 edge functions

Deploy `asaas-create-subscription`, `asaas-upgrade-subscription`, and `asaas-webhook`.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/asaas-create-subscription/index.ts` | Store period end date, not Asaas charge date |
| `supabase/functions/asaas-webhook/index.ts` | Fix `PAYMENT_CONFIRMED` and `SUBSCRIPTION_RENEWED` to advance `next_due_date` by cycle |
| `supabase/functions/asaas-upgrade-subscription/index.ts` | Calculate fresh period end for new subscription |

## No frontend changes needed

The frontend calculation in `EscolherPlano.tsx` is correct — it properly computes `daysRemaining` from `next_due_date`. The bug is that the backend stores the wrong date.

