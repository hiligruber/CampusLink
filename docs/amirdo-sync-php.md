# Amirdo Backup Sync — PHP/MySQL Receiver

Drop-in receiver for the one-way backup pipeline.
Lovable Cloud (Supabase) POSTs every insert/update/delete to this endpoint.

## 1. Endpoint URL

Point `AMIRDO_SYNC_URL` (in Lovable secrets) to something like:

```
https://amirdo.mtacloud.co.il/sync.php
```

## 2. Shared secret

Put the same value you saved in Lovable's `AMIRDO_SYNC_SECRET` into the
`$SYNC_SECRET` constant below. The edge function sends it as the
`X-Sync-Secret` header on every request — reject anything else.

## 3. Request format

```json
{
  "table": "rides",
  "op": "INSERT" | "UPDATE" | "DELETE",
  "row_pk": "uuid-string",
  "row":  { ...full row as JSON... } | null,
  "deleted_id": "uuid-string" | null
}
```

Return HTTP 200 on success. Anything else is retried (up to 10 times).

## 4. MySQL tables

Mirror schema — UUIDs stored as `CHAR(36)`, Supabase JSON columns as `JSON`,
timestamps as `DATETIME`. Adjust nullability/columns to match your needs.

```sql
CREATE TABLE IF NOT EXISTS profiles (
  user_id CHAR(36) PRIMARY KEY,
  full_name VARCHAR(255), email VARCHAR(255),
  phone VARCHAR(64), avatar_url TEXT, campus VARCHAR(255),
  student_id_url TEXT, verification_status VARCHAR(64),
  rating DECIMAL(3,2), bio TEXT, raw JSON,
  created_at DATETIME, updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS rides (
  id CHAR(36) PRIMARY KEY,
  driver_id CHAR(36),
  origin TEXT, destination TEXT,
  departure_time DATETIME,
  total_seats INT, available_seats INT,
  price DECIMAL(10,2), notes TEXT,
  status VARCHAR(64), ride_phase VARCHAR(64),
  raw JSON, created_at DATETIME, updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) PRIMARY KEY,
  ride_id CHAR(36), passenger_id CHAR(36),
  status VARCHAR(64), pickup_location TEXT, seats INT,
  raw JSON, created_at DATETIME, updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS ride_ratings (
  id CHAR(36) PRIMARY KEY,
  ride_id CHAR(36), rater_id CHAR(36), ratee_id CHAR(36),
  stars INT, comment TEXT,
  raw JSON, created_at DATETIME
);

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36), type VARCHAR(64),
  title TEXT, body TEXT,
  ride_id CHAR(36), booking_id CHAR(36),
  read_at DATETIME, raw JSON, created_at DATETIME
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36), subject TEXT, status VARCHAR(64),
  raw JSON, created_at DATETIME, updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS support_messages (
  id CHAR(36) PRIMARY KEY,
  ticket_id CHAR(36), sender_id CHAR(36),
  body TEXT, raw JSON, created_at DATETIME
);
```

## 5. sync.php

```php
<?php
// === CONFIG ===
const SYNC_SECRET = 'PASTE_SAME_VALUE_AS_AMIRDO_SYNC_SECRET';
$DB_HOST = 'localhost';
$DB_NAME = 'your_db';
$DB_USER = 'your_user';
$DB_PASS = 'your_pass';

// === AUTH ===
$header = $_SERVER['HTTP_X_SYNC_SECRET'] ?? '';
if (!hash_equals(SYNC_SECRET, $header)) {
  http_response_code(401);
  echo json_encode(['error' => 'unauthorized']); exit;
}

// === PARSE ===
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data || !isset($data['table'], $data['op'])) {
  http_response_code(400);
  echo json_encode(['error' => 'bad payload']); exit;
}

$allowed = ['profiles','rides','bookings','ride_ratings',
            'notifications','support_tickets','support_messages'];
if (!in_array($data['table'], $allowed, true)) {
  http_response_code(400);
  echo json_encode(['error' => 'unknown table']); exit;
}

// === DB ===
$pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
               $DB_USER, $DB_PASS,
               [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$table = $data['table'];
$op    = $data['op'];
$pk    = $data['row_pk'] ?? null;

// profiles is keyed by user_id; everything else by id.
$pkCol = ($table === 'profiles') ? 'user_id' : 'id';

if ($op === 'DELETE') {
  $stmt = $pdo->prepare("DELETE FROM `$table` WHERE `$pkCol` = ?");
  $stmt->execute([$data['deleted_id'] ?? $pk]);
  echo json_encode(['ok' => true, 'op' => 'delete']); exit;
}

// INSERT / UPDATE -> upsert
$row = $data['row'] ?? [];
if (!is_array($row) || empty($row)) {
  http_response_code(400);
  echo json_encode(['error' => 'empty row']); exit;
}

// Stash the full JSON in `raw` for safety, plus map known scalar cols.
$cols = array_keys($row);
// Only keep scalar columns that exist in MySQL (skip arrays/objects except raw).
$scalarRow = [];
foreach ($row as $k => $v) {
  if (is_scalar($v) || is_null($v)) $scalarRow[$k] = $v;
}
$scalarRow['raw'] = json_encode($row, JSON_UNESCAPED_UNICODE);

$colNames = array_keys($scalarRow);
$placeholders = implode(',', array_fill(0, count($colNames), '?'));
$colList = '`' . implode('`,`', $colNames) . '`';
$updateList = implode(',', array_map(fn($c) => "`$c`=VALUES(`$c`)", $colNames));

$sql = "INSERT INTO `$table` ($colList) VALUES ($placeholders)
        ON DUPLICATE KEY UPDATE $updateList";
$stmt = $pdo->prepare($sql);
try {
  $stmt->execute(array_values($scalarRow));
  echo json_encode(['ok' => true, 'op' => strtolower($op)]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}
```

## 6. Verify it works

1. Create a test ride in the app.
2. Within ~60 seconds, the row appears in your MySQL `rides` table.
3. To see queue health:
   ```sql
   SELECT table_name, op, attempts, sent_at, last_error
   FROM public.sync_outbox ORDER BY id DESC LIMIT 20;
   ```
   `sent_at IS NOT NULL` = delivered. `attempts >= 10` = giving up, inspect `last_error`.
