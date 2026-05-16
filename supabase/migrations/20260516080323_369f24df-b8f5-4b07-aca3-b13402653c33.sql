
-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  ride_id uuid,
  booking_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- inserts are done via SECURITY DEFINER triggers; no insert policy needed

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Trigger: on new booking, notify both passenger and driver
CREATE OR REPLACE FUNCTION public.notify_on_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride public.rides;
  v_passenger_name text;
  v_when text;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = NEW.ride_id;
  IF v_ride IS NULL THEN RETURN NEW; END IF;
  SELECT full_name INTO v_passenger_name FROM public.profiles WHERE user_id = NEW.passenger_id;
  v_when := to_char(v_ride.departure_time AT TIME ZONE 'Asia/Jerusalem', 'DD/MM HH24:MI');

  -- to passenger
  INSERT INTO public.notifications (user_id, type, title, body, ride_id, booking_id)
  VALUES (
    NEW.passenger_id,
    'booking_requested',
    'הבקשה נשלחה',
    'ביקשת להצטרף לנסיעה ' || v_ride.origin || ' ← ' || v_ride.destination || ' בתאריך ' || v_when,
    NEW.ride_id, NEW.id
  );
  -- to driver
  INSERT INTO public.notifications (user_id, type, title, body, ride_id, booking_id)
  VALUES (
    v_ride.driver_id,
    'booking_received',
    'בקשה חדשה לנסיעה',
    COALESCE(v_passenger_name, 'סטודנט') || ' רוצה להצטרף לנסיעה שלך ' || v_ride.origin || ' ← ' || v_ride.destination,
    NEW.ride_id, NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_booking_insert
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_booking_insert();

-- Trigger: on booking status update, notify passenger
CREATE OR REPLACE FUNCTION public.notify_on_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride public.rides;
  v_when text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT * INTO v_ride FROM public.rides WHERE id = NEW.ride_id;
  IF v_ride IS NULL THEN RETURN NEW; END IF;
  v_when := to_char(v_ride.departure_time AT TIME ZONE 'Asia/Jerusalem', 'DD/MM HH24:MI');

  IF NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, title, body, ride_id, booking_id)
    VALUES (
      NEW.passenger_id, 'booking_accepted', 'הבקשה אושרה! 🎉',
      'הצטרפת לנסיעה ' || v_ride.origin || ' ← ' || v_ride.destination || ' ביציאה ב-' || v_when,
      NEW.ride_id, NEW.id
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, ride_id, booking_id)
    VALUES (
      NEW.passenger_id, 'booking_rejected', 'הבקשה נדחתה',
      'הבקשה שלך לנסיעה ' || v_ride.origin || ' ← ' || v_ride.destination || ' נדחתה',
      NEW.ride_id, NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_booking_status
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_booking_status_change();

-- ============ DRIVER LOCATIONS ============
CREATE TABLE public.driver_locations (
  ride_id uuid PRIMARY KEY,
  driver_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Driver can insert/update/delete their own ride location
CREATE POLICY "Drivers manage own location" ON public.driver_locations
  FOR ALL TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- Driver and accepted passengers can view
CREATE POLICY "Driver and accepted passengers view location" ON public.driver_locations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = driver_id
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.ride_id = driver_locations.ride_id
        AND b.passenger_id = auth.uid()
        AND b.status = 'accepted'
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;
