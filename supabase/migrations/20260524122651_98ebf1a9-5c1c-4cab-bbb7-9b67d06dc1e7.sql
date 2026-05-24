
CREATE TABLE public.ride_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ride_messages_thread ON public.ride_messages (ride_id, sender_id, recipient_id, created_at);
CREATE INDEX idx_ride_messages_recipient_unread ON public.ride_messages (recipient_id, read) WHERE read = false;

ALTER TABLE public.ride_messages ENABLE ROW LEVEL SECURITY;

-- Helper: is user part of the ride (driver or any booking)?
CREATE OR REPLACE FUNCTION public.is_user_in_ride(_user_id uuid, _ride_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rides r WHERE r.id = _ride_id AND r.driver_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.ride_id = _ride_id AND b.passenger_id = _user_id
      AND b.status IN ('pending','accepted')
  );
$$;

CREATE POLICY "Participants view their messages"
ON public.ride_messages FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Recipient marks read"
ON public.ride_messages FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "Ride participants send messages"
ON public.ride_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_user_in_ride(auth.uid(), ride_id)
  AND public.is_user_in_ride(recipient_id, ride_id)
  AND sender_id <> recipient_id
);

-- Notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_ride_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_name text;
BEGIN
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, ride_id)
  VALUES (
    NEW.recipient_id,
    'ride_message',
    'הודעה חדשה מ-' || COALESCE(v_sender_name, 'משתתף נסיעה'),
    LEFT(NEW.body, 120),
    NEW.ride_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_ride_message
AFTER INSERT ON public.ride_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_ride_message();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages;
ALTER TABLE public.ride_messages REPLICA IDENTITY FULL;
