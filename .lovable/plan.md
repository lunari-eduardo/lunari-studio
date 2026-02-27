

# Fix: Authorized emails ignoring plan_code for Pro access

## Root Cause

In `useAccessControl.ts` line 238, `hasPro` treats ALL `isAuthorized` users as Pro:

```typescript
const hasPro = accessState.status === 'ok' && 
  (accessState.isAdmin || 
   accessState.isVip || 
   accessState.isAuthorized ||  // ← BUG: ignores planCode
   ...);
```

When admin sets an allowed email to `studio_starter`, `get_access_state()` correctly returns `planCode: 'studio_starter'` and `isAuthorized: true`. But the client-side `hasPro` flag blindly returns `true` for any authorized user, regardless of their actual plan.

Same issue exists in `PlanRestrictionGuard.tsx` line 48 which checks `accessState?.isAuthorized` directly.

## Fix

### Step 1: Fix `hasPro` in `useAccessControl.ts`

Remove `accessState.isAuthorized` from the `hasPro` calculation. Authorized users should be evaluated by their `planCode` just like everyone else:

```typescript
const hasPro = accessState.status === 'ok' && 
  (accessState.isAdmin || 
   accessState.isVip || 
   accessState.planCode?.includes('pro') ||
   accessState.planCode?.includes('combo') ||
   accessState.isTrial);
```

### Step 2: Fix `PlanRestrictionGuard.tsx`

Remove `accessState?.isAuthorized` from the bypass condition:

```typescript
if (accessState?.isAdmin || accessState?.isVip || hasPro) {
  return <>{children}</>;
}
```

## Files to modify

| File | Change |
|------|--------|
| `src/hooks/useAccessControl.ts` | Remove `isAuthorized` from `hasPro` |
| `src/components/auth/PlanRestrictionGuard.tsx` | Remove `isAuthorized` from bypass |

