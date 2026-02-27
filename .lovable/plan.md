

# Fix Admin Panel: RLS, Allowed Emails, and Users Tab

## Root Cause Analysis

### Bug 1: Users tab only shows admin user
The `profiles` table RLS only has `auth.uid() = user_id` policies. Admin can only see their own profile. Same issue with `subscriptions` (legacy trial table). Since profiles returns only 1 row, the entire user list shows just the admin.

### Bug 2: Credits and storage show 0
`photographer_accounts` has admin RLS policy (works), but since profiles only returns the admin's row, the join only maps to the admin account which may have 0 credits.

### Bug 3: All allowed_emails show as "Starter"
Old entries in `allowed_emails` have `plan_code = 'pro_galery_monthly'` (the column default). The `PlanBadge` component maps any code not matching `combo_completo`, `combo_pro_select2k`, `studio_pro` to the Starter fallback.

### Bug 4: PATCH 400 error when changing plan
The `allowed_emails` table uses `email` as a `citext` (USER-DEFINED) column which is the primary key. The Supabase JS client `.update().eq('email', value)` may fail with citext. Need to use a different filter approach or cast.

## Implementation Steps

### 1. SQL Migration -- Add admin RLS policies
Add SELECT policies for admin role on:
- `profiles`: `has_role(auth.uid(), 'admin')` for SELECT
- `subscriptions`: `has_role(auth.uid(), 'admin')` for SELECT
- Update `allowed_emails` default from `'pro_galery_monthly'` to `'studio_starter'`
- Update existing rows: `SET plan_code = 'studio_starter' WHERE plan_code = 'pro_galery_monthly'`

### 2. Fix AllowedEmailsManager -- PATCH error
Replace `.update().eq('email', editingEmail)` with a delete+insert approach or use `.filter('email', 'eq', editingEmail)` with explicit casting. Alternatively, use RPC function for the update to avoid citext REST API issues.

### 3. Fix PlanBadge -- Handle legacy plan_codes
Add mapping for `pro_galery_monthly` and other legacy codes in PlanBadge so they display correctly until migrated.

### 4. Fix AdminUsuarios -- Ensure all data loads
After RLS fix, the parallel fetches will return all users. No code changes needed beyond the RLS migration.

## Files to modify

| File | Action |
|------|--------|
| New SQL migration | Admin SELECT on profiles + subscriptions; update allowed_emails default and data |
| `src/components/admin/AllowedEmailsManager.tsx` | Fix update method for citext email; handle legacy plan_code in PlanBadge |

