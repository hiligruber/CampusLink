# Amirdo Backup — Pull-Based Approach

Lovable Cloud exposes a read-only HTTP endpoint. Your PHP server on amirdo polls it every 5 minutes and upserts into MySQL. No more push, no more timeouts on our side.

## 1. Endpoint

```
GET https://zsutltajmxgotdwiqgjt.supabase.co/functions/v1/amirdo-pull
    ?table=<name>&since=<ISO timestamp>&limit=500
Header: X-Pull-Secret: <AMIRDO_SYNC_SECRET>
```

- `table` — one of: `profiles`, `rides`, `bookings`, `ride_ratings`, `notifications`, `support_tickets`, `support_messages`.
- `since` — ISO8601 timestamp; returns rows whose cursor column is **strictly greater**. Omit on first call to pull everything.
- `limit` — max rows per call (default 500, hard cap 2000). Loop until `count < limit`.

Response:

```json
{
  "ok": true,
  "table": "rides",
  "cursor_column": "updated_at",
  "count": 42,
  "rows": [ { ...full row... } ],
  "next_since": "2026-06-14T12:34:56.789Z"
}
```

Save `next_since` locally (file or a small MySQL `sync_state` table) and pass it back next time.

## 2. Secret

Use the same `AMIRDO_SYNC_SECRET` already configured in Lovable Cloud. Put the same value in the PHP constant below — the endpoint rejects anything else with HTTP 401.

If you've lost the value, rotate it in Lovable: Cloud → Secrets → `AMIRDO_SYNC_SECRET` → Update, then paste the new value into PHP.

## 3. MySQL — cursor table

Create once:

```sql
CREATE TABLE IF NOT EXISTS sync_state (
  table_name VARCHAR(64) PRIMARY KEY,
  last_since DATETIME(3) NULL,
  last_run   DATETIME    NULL,
  last_count INT         NULL,
  last_error TEXT        NULL
);
```

The mirror tables (`profiles`, `rides`, …) are the same as in the previous doc — keep using them. Each one has `raw JSON` plus scalar columns, primary key `id` (or `user_id` for `profiles`).

## 4. PHP — `pull.php`

Drop this in cPanel and run it from cron. It loops over all tables, pulls everything new since the saved cursor, and upserts.

```php
<?php
// === CONFIG ===
const PULL_URL    = 'https://zsutltajmxgotdwiqgjt.supabase.co/functions/v1/amirdo-pull';
const PULL_SECRET = 'PASTE_SAME_VALUE_AS_AMIRDO_SYNC_SECRET';

$DB_HOST = 'localhost';
$DB_NAME = 'your_db';
$DB_USER = 'your_user';
$DB_PASS = 'your_pass';

// table => primary key column
$TABLES = [
  'profiles'         => 'user_id',
  'rides'            => 'id',
  'bookings'         => 'id',
  'ride_ratings'     => 'id',
  'notifications'    => 'id',
  'support_tickets'  => 'id',
  'support_messages' => 'id',
];

$pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
               $DB_USER, $DB_PASS,
               [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

foreach ($TABLES as $table => $pkCol) {
    try {
        // 1. Load cursor
        $stmt = $pdo->prepare("SELECT last_since FROM sync_state WHERE table_name = ?");
        $stmt->execute([$table]);
        $since = $stmt->fetchColumn() ?: null;

        $totalPulled = 0;

        // 2. Page until we drain everything new
        while (true) {
            $qs = http_build_query(array_filter([
                'table' => $table,
                'since' => $since,
                'limit' => 500,
            ]));
            $ch = curl_init(PULL_URL . '?' . $qs);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 30,
                CURLOPT_HTTPHEADER     => ['X-Pull-Secret: ' . PULL_SECRET],
            ]);
            $body = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($code !== 200) {
                throw new RuntimeException("HTTP $code from amirdo-pull: " . substr($body, 0, 300));
            }
            $data = json_decode($body, true);
            $rows  = $data['rows']       ?? [];
            $count = $data['count']      ?? 0;
            $next  = $data['next_since'] ?? $since;

            if ($count === 0) break;

            // 3. Upsert each row
            $pdo->beginTransaction();
            foreach ($rows as $row) {
                upsert($pdo, $table, $pkCol, $row);
            }
            $pdo->commit();

            $totalPulled += $count;
            $since = $next;

            if ($count < 500) break;   // last page
        }

        // 4. Save cursor + status
        $pdo->prepare("
            INSERT INTO sync_state (table_name, last_since, last_run, last_count, last_error)
            VALUES (?, ?, NOW(), ?, NULL)
            ON DUPLICATE KEY UPDATE
              last_since = VALUES(last_since),
              last_run   = VALUES(last_run),
              last_count = VALUES(last_count),
              last_error = NULL
        ")->execute([$table, $since, $totalPulled]);

        echo "$table: $totalPulled rows\n";
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        $pdo->prepare("
            INSERT INTO sync_state (table_name, last_run, last_error)
            VALUES (?, NOW(), ?)
            ON DUPLICATE KEY UPDATE last_run = NOW(), last_error = VALUES(last_error)
        ")->execute([$table, $e->getMessage()]);
        echo "$table FAILED: " . $e->getMessage() . "\n";
    }
}

function upsert(PDO $pdo, string $table, string $pkCol, array $row): void {
    // Keep scalar columns only; stash the full row in `raw`.
    $scalar = [];
    foreach ($row as $k => $v) {
        if (is_scalar($v) || is_null($v)) $scalar[$k] = $v;
    }
    $scalar['raw'] = json_encode($row, JSON_UNESCAPED_UNICODE);

    if (!isset($scalar[$pkCol])) {
        throw new RuntimeException("row missing pk $pkCol for $table");
    }

    $cols  = array_keys($scalar);
    $place = implode(',', array_fill(0, count($cols), '?'));
    $list  = '`' . implode('`,`', $cols) . '`';
    $upd   = implode(',', array_map(fn($c) => "`$c`=VALUES(`$c`)", $cols));

    $sql = "INSERT INTO `$table` ($list) VALUES ($place)
            ON DUPLICATE KEY UPDATE $upd";
    $pdo->prepare($sql)->execute(array_values($scalar));
}
```

## 5. Cron — every 5 minutes

In cPanel → Cron Jobs:

```
*/5 * * * * /usr/bin/php /home/USER/public_html/pull.php >> /home/USER/logs/amirdo-pull.log 2>&1
```

Adjust paths to your account. The log file is helpful when debugging.

## 6. Backfill

First run pulls **all rows** (since is NULL) — it may take several minutes per table. Subsequent runs are tiny because they only fetch what changed.

If you ever need to re-backfill one table:

```sql
UPDATE sync_state SET last_since = NULL WHERE table_name = 'rides';
```

## 7. Deletes

Pull-based sync does not see deletes — deleted rows simply stop being returned. If you need to mirror deletes, the cleanest option is a periodic full reconciliation: list all `id`s in MySQL that aren't in the Cloud response and drop them. Let me know if you want a script for that.

## 8. About the old push pipeline

The `sync_outbox` table, triggers, cron, and `sync-to-amirdo` edge function from the push approach are still there but inactive for your needs. You can leave them; they don't affect the app. Tell me if you want them removed.
