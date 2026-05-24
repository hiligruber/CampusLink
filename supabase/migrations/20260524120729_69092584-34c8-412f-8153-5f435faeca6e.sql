-- Add phase tracking to rides
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS ride_phase text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.rides
    ADD CONSTRAINT rides_ride_phase_check
    CHECK (ride_phase IN ('scheduled','en_route','in_progress','completed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notify accepted passengers when phase changes
CREATE OR REPLACE FUNCTION public.notify_on_ride_phase_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body  text;
  v_route text;
  r record;
BEGIN
  IF NEW.ride_phase = OLD.ride_phase THEN RETURN NEW; END IF;
  v_route := NEW.origin || ' ← ' || NEW.destination;

  IF NEW.ride_phase = 'en_route' THEN
    v_title := 'הנהג בדרך אליך 🚗';
    v_body  := 'הנהג יצא לדרך לנסיעה ' || v_route;
  ELSIF NEW.ride_phase = 'in_progress' THEN
    v_title := 'הנסיעה התחילה';
    v_body  := 'הנסיעה ' || v_route || ' בעיצומה';
  ELSIF NEW.ride_phase = 'completed' THEN
    v_title := 'הנסיעה הסתיימה ✅';
    v_body  := 'הגעת ליעד: ' || NEW.destination;
    DELETE FROM public.driver_locations WHERE ride_id = NEW.id;
  ELSE
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT passenger_id FROM public.bookings
    WHERE ride_id = NEW.id AND status = 'accepted'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, ride_id)
    VALUES (r.passenger_id, 'ride_phase_' || NEW.ride_phase, v_title, v_body, NEW.id);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_ride_phase_change ON public.rides;
CREATE TRIGGER trg_notify_on_ride_phase_change
AFTER UPDATE OF ride_phase ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.notify_on_ride_phase_change();