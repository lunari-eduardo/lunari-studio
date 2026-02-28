

# Fix: Cross-product upgrade prorata for Gallery → Combo

## Root Cause

`EscolherPlano.tsx` line 99 filters `activeSub` to only Studio-family plans (`isStudioFamilyPlan`). When the user has only `transfer_5gb`, `studioSub` is null, `isUpgradeMode` is false, and the page treats any selection as a brand new subscription — no prorata discount.

The edge function `asaas-upgrade-subscription` already supports `subscriptionIdsToCancel[]` for cross-product upgrades, but the frontend never sends it.

## Fix

### Step 1: Update `EscolherPlano.tsx` — detect cross-product upgrades

Instead of only checking for a studio subscription, check ALL active subscriptions. When selecting a combo/plan that "includes" a capability the user already has via another subscription, treat it as an upgrade with prorata.

**Logic:**
- Get all active subs from `useAsaasSubscription().subscriptions`
- For each plan card, check if the new plan's `PLAN_INCLUDES` overlaps with any active subscription's capabilities
- If overlap exists, calculate combined prorata from ALL overlapping subscriptions
- Pass `subscriptionIdsToCancel: string[]` (array) to payment page instead of single `currentSubscriptionId`

**Concrete changes:**
- Replace `const { subscription: activeSub, ... }` with `const { subscriptions: allSubs, subscription: activeSub, ... }`
- Compute `overlappingSubs` for each plan card: active subs whose product capabilities are included in the new plan
- Calculate combined `creditCents` from all overlapping subs
- Pass `subscriptionIdsToCancel` array + combined prorata to payment page

### Step 2: Update `EscolherPlanoPagamento.tsx` — send array to edge function

**Changes to `SubscriptionPayment` interface:**
- Add `subscriptionIdsToCancel?: string[]` (replaces `currentSubscriptionId` for cross-product)

**Changes to `SubscriptionForm` onSubmit:**
- When `isUpgrade`, send `subscriptionIdsToCancel` array to `upgradeSubscription()` instead of single `currentSubscriptionId`

### Step 3: Update `useAsaasSubscription.ts` — support `subscriptionIdsToCancel`

**Changes to `UpgradeSubscriptionParams`:**
- Add optional `subscriptionIdsToCancel?: string[]`
- In `mutationFn`, send `subscriptionIdsToCancel` to the edge function body (the edge function already supports it)

## Files to modify

| File | Change |
|------|--------|
| `src/pages/EscolherPlano.tsx` | Detect cross-product overlaps, calculate combined prorata, pass `subscriptionIdsToCancel[]` |
| `src/pages/EscolherPlanoPagamento.tsx` | Accept and forward `subscriptionIdsToCancel[]` |
| `src/hooks/useAsaasSubscription.ts` | Add `subscriptionIdsToCancel` to upgrade params |

