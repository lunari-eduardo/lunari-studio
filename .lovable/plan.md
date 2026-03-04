

# Redesign Plan: Lunari Studio → Gallery Visual Parity

## Summary of Differences

After analyzing the Gallery design document against the Studio codebase, there are **significant differences** across colors, sizing, typography scale, shadows, borders, inputs, buttons, and cards. The redesign touches primarily **CSS variables and a handful of UI primitives** — the component logic stays untouched.

## Detailed Changes

### 1. CSS Variables (`src/index.css`)

The core color palette needs a full update to match Gallery's warm terracotta + cool gray system:

| Token | Studio (current) | Gallery (target) |
|-------|-----------------|-----------------|
| `--background` | `60 4% 97%` (#f8f8f7) | `0 0% 100%` (#FFFFFF) |
| `--foreground` | `0 0% 23%` | `25 20% 15%` (#302720 warm brown) |
| `--primary` | `15 54% 28%` (dark brown) | `18 55% 55%` (#C47A50 terracotta) |
| `--muted` | `60 4% 97%` | `220 10% 95%` (#F1F2F3 cool gray) |
| `--muted-foreground` | `0 0% 49%` | `25 10% 45%` (#7A7068 warm gray) |
| `--accent` | `60 4% 97%` | `25 60% 95%` (#FDF3EB warm bg) |
| `--accent-foreground` | `0 0% 23%` | `25 50% 35%` (#8B5E2B) |
| `--border` | `60 3% 94%` | `220 10% 90%` (#E3E5E8 cool gray) |
| `--card` | `0 0% 99%` | `0 0% 100%` (#FFFFFF) |
| `--ring` | `15 54% 28%` | `18 55% 55%` (= new primary) |
| `--secondary` | `60 4% 97%` | `220 10% 50%` (#737D88 gray) |
| `--secondary-foreground` | `0 0% 23%` | `0 0% 100%` (white) |
| `--destructive` | `12 74% 61%` | `0 72% 51%` (#E02424) |

Also update the matching `--lunar-*` variables to point to the same values so existing `lunar-*` classes stay consistent.

Add Gallery's `--primary-hover: 18 55% 48%` variable.

**Dark mode** tokens: Update to match Gallery's pure gray dark mode (already close, minor tweaks needed).

**Global scale**: Add `html { font-size: 90%; }` to match Gallery's compact aesthetic.

**Shadows**: Replace warm-tinted shadows with Gallery's system:
- `--shadow-sm`: `0 1px 2px hsl(25 20% 15% / 0.03)`
- `--shadow-md`: `0 3px 8px hsl(25 20% 15% / 0.04)`
- `--shadow-lg`: `0 6px 16px hsl(25 20% 15% / 0.06)`
- `--shadow-glow`: `0 0 30px hsl(18 55% 55% / 0.15)`

**Card gradient**: Add `.lunari-card` class matching Gallery's card styling with `border border-border/50 rounded-xl` and subtle gradient `linear-gradient(180deg, #FFF 0%, #F7F8F9 100%)`.

**Hover on cards**: Add micro-elevation effect: `-translate-y-0.5` + `shadow-md` on hover.

### 2. Button Component (`src/components/ui/button.tsx`)

Gallery uses larger buttons. Update sizes:

| Size | Studio | Gallery |
|------|--------|---------|
| sm | `h-6` | `h-9` |
| default | `h-7` | `h-10` |
| lg | `h-8` | `h-11` |
| icon | `h-7 w-7` | `h-10 w-10` |

Update text sizes: `text-xs` → `text-sm` for default, keep `text-xs` for sm.

Update variants to use new tokens:
- `default`: add `hover:shadow-md` gradient feel
- `secondary`: `bg-secondary text-white hover:opacity-80` (Gallery uses gray secondary with white text)
- `outline`: `border border-input bg-background hover:bg-accent`
- `ghost`: `hover:bg-accent`

### 3. Input Component (`src/components/ui/input.tsx`)

Gallery: `bg-background border border-input rounded-lg px-4 py-2.5`, focus: `ring-2 ring-ring/20 border-primary`

Update from `h-7 rounded-md px-3 py-1 text-xs` → `h-10 rounded-lg px-4 py-2.5 text-sm`, with `border border-input bg-background` and focus ring update.

### 4. Card Component (`src/components/ui/card.tsx`)

Update base class: `rounded-md` → `rounded-xl`, shadow → Gallery's `shadow-sm`. Add subtle hover micro-elevation. Keep using shadcn tokens (already correct after CSS var update).

Update padding: `p-3` → `p-6` for CardHeader/CardContent to match Gallery's more spacious layout.

### 5. Badge Component (`src/components/ui/badge.tsx`)

Gallery's secondary badge uses `bg-secondary text-white` (cool gray). This will work automatically once `--secondary` and `--secondary-foreground` CSS variables are updated.

### 6. Tailwind Config (`tailwind.config.ts`)

- Update `borderRadius.lg` from `12px` to match Gallery's `--radius: 0.75rem` (already 12px, OK)
- Update `boxShadow` entries to Gallery's warm-tinted shadow system
- Add `xl` button size: `h-12`

### 7. Sidebar & Header

Gallery nav uses `bg-primary/10 text-primary` for active state. Studio already uses `text-lunar-accent bg-lunar-surface` — once `--lunar-accent` is updated to terracotta, this auto-adjusts.

Header: Gallery uses `sticky top-0 z-50 h-16 backdrop-blur border-b border-border/50`. Verify Header.tsx matches.

### 8. Animations

Gallery specifies `transition-all duration-200` globally. Studio uses `duration-150` in many places. Update to `duration-200` for consistency.

## Files to Modify

| File | Scope |
|------|-------|
| `src/index.css` | Color variables (light + dark), global font-size 90%, shadows, card utility class, body gradient, hover effects |
| `src/components/ui/button.tsx` | Sizes (h-7→h-10 etc), variant styles, text sizes |
| `src/components/ui/input.tsx` | Height, padding, border-radius, border, focus ring |
| `src/components/ui/card.tsx` | Border-radius, padding spacing |
| `src/components/ui/badge.tsx` | No change needed (auto-updates via CSS vars) |
| `tailwind.config.ts` | Box shadow definitions, add xl button size |

## What stays the same

- All component logic, hooks, services, pages
- Route structure
- Supabase integration
- Dark mode structure (just updated values)
- Font family (both use Inter)

## Risk mitigation

The `--primary` change from dark brown (`15 54% 28%`) to brighter terracotta (`18 55% 55%`) is the most impactful — it affects every button, link, accent, and focus ring. But this is exactly what Gallery uses, so it's intentional. The `--lunar-accent` variables will be updated in sync.

