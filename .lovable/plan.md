

# Fix: Combo Prorata Display Missing Cross-Product Credits

## Problem

When a user has **two separate subscriptions** (e.g., Studio Starter + Transfer 5GB) and views a Combo plan card, the displayed "Pagar agora" value only accounts for the Studio subscription's proportional credit. The Transfer subscription's credit is ignored in the **display**, even though `handleSelectPlan` correctly combines both credits when navigating to payment.

**Root cause**: Lines 457-466 in `EscolherPlano.tsx` — the combo card prorata display calculation only uses `currentPriceCents` (the studio sub), without calling `getCrossProductProrata` to also include the transfer sub's credit.

The same issue exists in the studio cards section (lines 336-346), though it's less impactful since studio plans don't overlap with transfer.

## Fix

**File: `src/pages/EscolherPlano.tsx`**

In both card rendering sections (studio cards ~line 336 and combo cards ~line 457), when `isUpgradeFlag` is true, also call `getCrossProductProrata` and combine credits — exactly mirroring the logic already in `handleSelectPlan` (lines 193-203):

```ts
if (isUpgradeFlag) {
  const creditCents = Math.round(currentPriceCents * (daysRemaining / totalCycleDays));
  // Also check cross-product overlaps
  const crossProduct = getCrossProductProrata(plan.code, price);
  let combinedCredit = creditCents;
  if (crossProduct) {
    const extraCredit = crossProduct.creditCents - 
      (crossProduct.subscriptionIdsToCancel.includes(currentSubscriptionId) ? creditCents : 0);
    combinedCredit += extraCredit;
  }
  prorataValue = Math.max(0, price - combinedCredit);
}
```

This ensures the card displays the same value the user will actually pay.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/EscolherPlano.tsx` | Fix prorata display in both studio and combo card sections to include cross-product credits |

