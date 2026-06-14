
-- Extensions for scheduled HTTP delivery
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) Outbox queue
CREATE TABLE IF NOT EXISTS public.sync_outbox (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  op TEXT NOT NULL CHECK (op IN ('INSERT','UPDATE','DELETE')),
  row_pk TEXT,
  payload JSONB,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_outbox_pending_idx
  ON public.sync_outbox (id)
  WHERE sent_at IS NULL AND attempts < 10;

-- Service-role only. No GRANTs to anon/authenticated by design.
GRANT ALL ON public.sync_outbox TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sync_outbox_id_seq TO service_role;

ALTER TABLE public.sync_outbox ENABLE ROW LEVEL SECURITY;
-- No policies = no access for anon/authenticated. service_role bypasses RLS.

-- 2) Generic enqueue trigger function
CREATE OR REPLACE FUNCTION public.enqueue_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pk TEXT;
  v_payload JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_pk := (to_jsonb(OLD) ->> 'id');
    v_payload := to_jsonb(OLD);
  ELSE
    v_pk := (to_jsonb(NEW) ->> 'id');
    v_payload := to_jsonb(NEW);
  END IF;

  INSERT INTO public.sync_outbox (table_name, op, row_pk, payload)
  VALUES (TG_TABLE_NAME, TG_OP, v_pk, v_payload);

  RETURN NULL;
END;
$$;

-- 3) Attach triggers to the 7 tables
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'profiles','rides','bookings','ride_ratings',
    'notifications','support_tickets','support_messages'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_sync_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.enqueue_sync()',
      t, t
    );
  END LOOP;
END $$;

-- 4) Schedule: every minute, invoke the edge function to drain the outbox
SELECT cron.unschedule('amirdo-sync-drain')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'amirdo-sync-drain');

SELECT cron.schedule(
  'amirdo-sync-drain',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zsutltajmxgotdwiqgjt.supabase.co/functions/v1/sync-to-amirdo',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdXRsdGFqbXhnb3Rkd2lxZ2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzIzMTEsImV4cCI6MjA5MzY0ODMxMX0.6qfC1_p16Y-HVudep17rjwe6mkxhwAh8PRZwdUD4B7o'
    ),
    body := '{}'::jsonb
  );
  $$
);
