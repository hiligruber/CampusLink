// One-way backup sync: drains public.sync_outbox -> POSTs to amirdo PHP endpoint.
// Triggered by pg_cron every minute. Best-effort, never blocks the app.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BATCH_SIZE = 100;
const MAX_ATTEMPTS = 10;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AMIRDO_URL = Deno.env.get("AMIRDO_SYNC_URL")!;
const AMIRDO_SECRET = Deno.env.get("AMIRDO_SYNC_SECRET")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!AMIRDO_URL || !AMIRDO_SECRET) {
    return json({ error: "AMIRDO_SYNC_URL or AMIRDO_SYNC_SECRET not configured" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // Pull pending rows
  const { data: rows, error: fetchErr } = await supabase
    .from("sync_outbox")
    .select("id, table_name, op, row_pk, payload, attempts")
    .is("sent_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("id", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) return json({ error: fetchErr.message }, 500);
  if (!rows || rows.length === 0) return json({ ok: true, processed: 0 });

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const res = await fetch(AMIRDO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sync-Secret": AMIRDO_SECRET,
        },
        body: JSON.stringify({
          table: row.table_name,
          op: row.op,
          row_pk: row.row_pk,
          row: row.op === "DELETE" ? null : row.payload,
          deleted_id: row.op === "DELETE" ? row.row_pk : null,
        }),
      });

      const text = await res.text();
      if (res.ok) {
        await supabase
          .from("sync_outbox")
          .update({ sent_at: new Date().toISOString(), last_error: null })
          .eq("id", row.id);
        success++;
      } else {
        await supabase
          .from("sync_outbox")
          .update({
            attempts: (row.attempts ?? 0) + 1,
            last_error: `HTTP ${res.status}: ${text.slice(0, 500)}`,
          })
          .eq("id", row.id);
        failed++;
      }
    } catch (e) {
      await supabase
        .from("sync_outbox")
        .update({
          attempts: (row.attempts ?? 0) + 1,
          last_error: String((e as Error).message ?? e).slice(0, 500),
        })
        .eq("id", row.id);
      failed++;
    }
  }

  return json({ ok: true, processed: rows.length, success, failed });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
