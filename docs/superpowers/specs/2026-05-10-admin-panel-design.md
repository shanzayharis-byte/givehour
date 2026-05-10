# givehour Admin Panel — Design Spec
Date: 2026-05-10

## Overview
Add an admin panel to the givehour app, accessible as an extra tab in the bottom nav for admin users only. Admins can view all users with last-login info, invite new users by email, and delete accounts. `shanzay.haris@gmail.com` is seeded as the first admin.

## Database
**Migration:** add one boolean column to the existing `users` table:
```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
```
No new tables. Shanzay's row gets `is_admin = true` via a one-off seed script.

## Backend — 3 Vercel API Routes

All three endpoints live under `api/admin/`. Each one:
1. Reads the `Authorization: Bearer <jwt>` header from the request
2. Uses the service key to call `supabase.auth.getUser(token)` to identify the caller
3. Checks the caller's `users` row for `is_admin = true` — rejects with 403 if not

### `GET /api/admin/users`
- Fetches all rows from the `users` table (id, name, email, role, is_admin)
- Fetches `last_sign_in_at` for each user from `auth.users` via the admin API
- Joins by user id and returns the merged list
- Response: `{ users: [{ id, name, email, role, is_admin, last_sign_in_at }] }`

### `POST /api/admin/invite`
- Body: `{ email: string }`
- Calls `supabase.auth.admin.inviteUserByEmail(email)`
- Supabase sends the invite email automatically (uses configured SMTP)
- Response: `{ ok: true }` or error message

### `DELETE /api/admin/delete-user`
- Body: `{ userId: string }`
- Calls `supabase.auth.admin.deleteUser(userId)` — cascades to `users` table
- Response: `{ ok: true }` or error message

## Frontend

### `src/screens/Admin.jsx` (new file)
Two cards:

**Invite User card**
- Email input + "Send Invite" button
- On success: shows "Invite sent!" in green for 3 seconds, clears input
- On error: shows error message in red

**All Users card**
- Table rows: Name · Email · Role pill · Last Login · Remove button
- Last Login: relative time string ("just now", "Xm ago", "Xh ago", "Xd ago", "Never")
- Active badge: green dot next to name when `last_sign_in_at` is within 15 minutes
- Admin badge: gold "Admin" label next to admin users' names
- Remove: two-step confirm ("Remove?" → "Confirm") — cannot remove yourself
- Loads on mount via `GET /api/admin/users`

### `src/App.jsx` changes
- Import `Admin` screen
- Add `'admin'` to the screen routing
- Add Admin nav item `{ id: 'admin', icon: '⚙', label: 'Admin' }` to `NAV` — **only rendered when `dbUser?.is_admin === true`**
- Pass `authUser` to Admin screen so it can send the JWT in API calls

## Seeding shanzay.haris@gmail.com as Admin
One-off Node script `scripts/make-admin.mjs` using the service key:
- Finds the user by email in the `users` table
- Sets `is_admin = true`
- Run once locally, then delete the script

## Files Touched
- Supabase SQL editor: migration
- `api/admin/users.js` — new
- `api/admin/invite.js` — new
- `api/admin/delete-user.js` — new
- `src/screens/Admin.jsx` — new
- `src/App.jsx` — add Admin tab + routing
- `scripts/make-admin.mjs` — one-off seed, delete after running

## Out of Scope
- Role promotion from the UI (admin → admin toggle)
- Bulk delete
- Search/filter on the users list
