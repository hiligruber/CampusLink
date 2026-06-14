# One-Way Backup Sync to amirdo PHP/MySQL

Mirror writes from Lovable Cloud (Supabase) to the external PHP server at `amirdo.mtacloud.co.il` as a passive backup. Nothing in the existing app changes — no UI, auth, realtime, or business logic is touched.

## Architecture

```text
Supabase table write (INSERT/UPDATE/DELETE)
        │
        ▼
AFTER trigger  ──►  sync_outbox (queue table)
        │
        ▼
pg_cron (every 1 min)  ──►  pg_net.http_post  ──►  Edge Function: sync-to-amirdo
        │                                                  │
        │                                                  ▼
        │                                       POST https://amirdo.mtacloud.co.il/sync.php
        │                                       Header: X-Sync-Secret: <SYNC_SECRET>
        │                                       Body: { table, op, row, deleted_id }
        ▼
On success → mark row sent.  On failure → retry with backoff, log error.
```

Why an outbox + edge function (not a direct trigger HTTP call):
- Triggers run inside the user's transaction. A slow/down PHP server would slow user requests. Outbox decouples them.
- Retries, ordering, and visibility are trivial with a queue.
- Failures never block the main app — backup is best-effort.

## Tables synchronized

`profiles`, `rides`, `bookings`, `ride_ratings`, `notifications`, plus `support_tickets` + `support_messages` (the "support_requests" the user referenced — current schema splits them).

## What gets built

### 1. Database (single migration)
- `public.sync_outbox(id, table_name, op, row_pk, payload jsonb, attempts, last_error, sent_at, created_at)`.
- Generic trigger function `public.enqueue_sync()` that inserts the NEW/OLD row as JSON into `sync_outbox`. SECURITY DEFINER, restricted search_path.
- `AFTER INSERT OR UPDATE OR DELETE` triggers on the 7 tables above.
- GRANTs: `sync_outbox` is service-role only (no anon/authenticated access).
- Enable `pg_cron` and `pg_net` extensions.
- pg_cron job (every minute) calling `net.http_post` to the edge function with the service-role key.

### 2. Edge function `sync-to-amirdo`
- Reads up to N unsent rows from `sync_outbox` ordered by `id`.
- POSTs each (or batched) to `https://amirdo.mtacloud.co.il/sync.php` with header `X-Sync-Secret`.
- On 2xx → set `sent_at = now()`. On failure → increment `attempts`, store `last_error`. Rows with `attempts >= 10` are skipped (kept for inspection).
- `verify_jwt = false` (called by cron); protected by shared secret check on the PHP side.

### 3. Secrets (added via Lovable secrets tool)
- `AMIRDO_SYNC_URL` — full endpoint URL.
- `AMIRDO_SYNC_SECRET` — shared secret sent in `X-Sync-Secret` header; PHP must verify.

### 4. PHP side (user implements on amirdo)
A single `sync.php` endpoint that:
- Verifies `X-Sync-Secret`.
- Accepts JSON `{ table, op, row, deleted_id }`.
- Upserts into the mirror MySQL tables on INSERT/UPDATE, deletes on DELETE.
- Returns 200 on success.

I'll provide a ready-to-paste PHP template and the MySQL `CREATE TABLE` statements matching the Supabase schema (UUIDs stored as `CHAR(36)`, JSON columns as `JSON`, timestamps as `DATETIME`).

## Guarantees

- **Zero impact on app**: triggers only do a local insert into `sync_outbox` (microseconds). No HTTP in the user transaction.
- **One-way**: no code path ever reads from amirdo.
- **No UI changes, no auth changes, no realtime changes.**
- **Eventual consistency**: backup lags by up to ~1 minute.
- **Self-healing**: retries on failure; outbox preserves failed rows for inspection.

## Out of scope (confirm if you want them)

- Backfill of existing rows (can be a one-shot script after the pipeline works).
- Storage bucket file mirroring (`student-ids`, `avatars`) — currently DB-only.
- Admin UI to view sync status.
