// Read-only pull endpoint for the Amirdo MySQL backup.
// PHP server calls: GET /functions/v1/amirdo-pull?table=rides&since=2026-06-14T00:00:00Z&limit=500
// Header: X-Pull-Secret: <AMIRDO_SYNC_SECRET>
//
// Returns: { ok, table, count, rows, next_since }
// next_since = max(updated_at|created_at) of returned rows — pass it back next call.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET = Deno.env.get("AMIRDO_SYNC_SECRET")!;

// table -> cursor column (prefer updated_at, fall back to created_at)
const TABLES: Record<string, string> = {
  profiles: "updated_at",
  rides: "updated_at",
  bookings: "updated_at",
  ride_ratings: "created_at",
  notifications: "created_at",
  support_tickets: "updated_at",
  support_messages: "created_at",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const provided = req.headers.get("x-pull-secret") ?? "";
  if (!SECRET || provided !== SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = new URL(req.url);
  const table = url.searchParams.get("table") ?? "";
  const since = url.searchParams.get("since"); // ISO timestamp, optional
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "500", 10) || 500, 2000);

  if (!(table in TABLES)) {
    return json({ error: "unknown or disallowed table", allowed: Object.keys(TABLES) }, 400);
  }
  const cursorCol = TABLES[table];

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  let q = supabase.from(table).select("*").order(cursorCol, { ascending: true }).limit(limit);
  if (since) q = q.gt(cursorCol, since);

  const { data, error } = await q;
  if (error) {
    console.error("amirdo-pull query error", { table, error: error.message });
    return json({ error: error.message }, 500);
  }

  const rows = data ?? [];
  const nextSince = rows.length > 0
    ? (rows[rows.length - 1] as Record<string, unknown>)[cursorCol] ?? since
    : since;

  return json({
    ok: true,
    table,
    cursor_column: cursorCol,
    count: rows.length,
    rows,
    next_since: nextSince,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
