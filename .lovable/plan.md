# Profile & Admin Improvements

## 1. Fix profile picture not rendering

**Diagnosis** — DB and storage are healthy: `avatar_url` is a full public URL, the `avatars` bucket is public, and the file returns HTTP 200. The screenshot also shows the name as "Student" instead of "Hili Gruber", which means the profile query itself is returning no data on that screen — the avatar is just a symptom of the whole profile not loading.

**Fixes:**
- `src/pages/Profile.tsx`: switch from `.single()` to `.maybeSingle()` so a missing/blocked row doesn't throw silently. Log query errors. If the row exists but `avatar_url` is empty, fall back to `user.user_metadata.avatar_url` (Google sign‑in photo).
- `src/components/AvatarImage.tsx`:
  - Drop the forced `?v=1` cache‑buster (it's only useful right after an upload, and on already‑cached URLs it can interact badly with the SW cache). Keep cache‑busting only when an explicit `version` prop is passed.
  - Remove `referrerPolicy="no-referrer"` for Supabase URLs (only needed for Google avatars) — keep it conditional.
  - `onError`: log the failing URL to the console so future regressions are visible.
- `src/components/AppHeader.tsx` (header avatar) and any other surface that renders a user picture (`RideCard`, `InboxDropdown`, `RideChat`) — verify they all go through `<AvatarImage>` with the same `profiles.avatar_url`. Replace any leftover hardcoded placeholder with `<AvatarImage>`.
- On `EditProfile` save, also mirror `avatar_url` into `auth.updateUser({ data: { avatar_url } })` so the header (which sometimes reads from session) stays in sync.

## 2. Reorganize Profile actions

In `src/pages/Profile.tsx`, move the action grid (Edit Profile / Settings / Admin / Calendar / Sign Out) **above** `<RideHistory />` in the right column, and give it a clearer card:

```text
┌─ Profile card (avatar, name, rating) ─┐  ┌─ Hobbies / Music ──────────────┐
│                                       │  ├─ Quick Actions  (NEW position) ┤
│                                       │  │  [Edit] [Settings]             │
│                                       │  │  [Admin?] [Calendar]           │
│                                       │  │  [Sign Out]                    │
│                                       │  ├─ Past Trips (RideHistory) ─────┤
└───────────────────────────────────────┘  └────────────────────────────────┘
```

- Wrap the buttons in a titled `glass-card` ("Quick actions" / "פעולות מהירות") so they read as a primary section, not a footer.
- Make "Edit Profile" the visually prominent button (filled `default` variant), the rest outline.

## 3. Admin management in Admin Panel

In `src/pages/Admin.tsx`, add an **"Admin management"** section below the pending‑verifications list:

- List current admins: `SELECT user_id, profiles.full_name, profiles.email FROM user_roles JOIN profiles USING(user_id) WHERE role='admin'`.
- For each admin: show name + email + a "Remove admin" button (disabled for the current user so admins can't lock themselves out).
- "Add admin" form: email input → look up `profiles` by email → `insert into user_roles (user_id, role) values (..., 'admin')` (the existing unique constraint on `(user_id, role)` prevents duplicates).
- Show a clear error if the email isn't a registered/verified student.

### RLS
`user_roles` currently allows only self‑select. To enable admin management we add two policies in a single migration:

```sql
-- admins can read every roles row
create policy "Admins can view all roles"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- admins can grant / revoke roles
create policy "Admins can insert roles"
  on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
  on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
```

(No new tables, so no GRANT changes are needed.)

## Files touched
- `src/pages/Profile.tsx` — reorder + fallback avatar
- `src/components/AvatarImage.tsx` — remove forced cache‑bust, conditional referrer, error logging
- `src/pages/EditProfile.tsx` — mirror avatar into auth metadata
- `src/pages/Admin.tsx` — new "Admin management" section
- New migration — admin RLS policies on `user_roles`

## Out of scope
No visual redesign of the rest of the app, no changes to the rating system, navigation, or theming.
