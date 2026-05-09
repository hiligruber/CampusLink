
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS driver_name text NOT NULL DEFAULT '';

ALTER TABLE public.rides DROP CONSTRAINT IF EXISTS rides_status_check;
ALTER TABLE public.rides ADD CONSTRAINT rides_status_check CHECK (status IN ('active','cancelled'));

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending','accepted','rejected','cancelled'));

CREATE INDEX IF NOT EXISTS idx_rides_departure ON public.rides(departure_time);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON public.rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ride ON public.bookings(ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger ON public.bookings(passenger_id);

CREATE OR REPLACE FUNCTION public.sync_available_seats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride_id uuid;
BEGIN
  v_ride_id := COALESCE(NEW.ride_id, OLD.ride_id);
  UPDATE public.rides r
     SET available_seats = GREATEST(
       0,
       r.total_seats - (
         SELECT COUNT(*) FROM public.bookings b
         WHERE b.ride_id = v_ride_id AND b.status = 'accepted'
       )
     )
   WHERE r.id = v_ride_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_sync_seats ON public.bookings;
CREATE TRIGGER trg_bookings_sync_seats
AFTER INSERT OR UPDATE OF status OR DELETE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_available_seats();

DROP TRIGGER IF EXISTS trg_rides_updated_at ON public.rides;
CREATE TRIGGER trg_rides_updated_at
BEFORE UPDATE ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Passengers can cancel their bookings" ON public.bookings;
CREATE POLICY "Passengers can cancel their bookings"
ON public.bookings FOR UPDATE
TO authenticated
USING (auth.uid() = passenger_id);
