
CREATE TABLE public.ride_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_id, rater_id, ratee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ride_ratings TO authenticated;
GRANT ALL ON public.ride_ratings TO service_role;

ALTER TABLE public.ride_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see ratings they gave or received"
  ON public.ride_ratings FOR SELECT TO authenticated
  USING (auth.uid() = rater_id OR auth.uid() = ratee_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users create their own ratings"
  ON public.ride_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rater_id AND public.is_user_in_ride(auth.uid(), ride_id));

CREATE POLICY "Users update their own ratings"
  ON public.ride_ratings FOR UPDATE TO authenticated
  USING (auth.uid() = rater_id) WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users delete their own ratings"
  ON public.ride_ratings FOR DELETE TO authenticated
  USING (auth.uid() = rater_id);

CREATE TRIGGER update_ride_ratings_updated_at
  BEFORE UPDATE ON public.ride_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recompute the ratee's average rating on each insert/update/delete
CREATE OR REPLACE FUNCTION public.recompute_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID;
  avg_rating NUMERIC;
BEGIN
  target_user := COALESCE(NEW.ratee_id, OLD.ratee_id);
  SELECT ROUND(AVG(stars)::numeric, 2) INTO avg_rating
    FROM public.ride_ratings WHERE ratee_id = target_user;
  UPDATE public.profiles
    SET rating = COALESCE(avg_rating, 5.0)
    WHERE user_id = target_user;
  RETURN NULL;
END;
$$;

CREATE TRIGGER ride_ratings_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.ride_ratings
  FOR EACH ROW EXECUTE FUNCTION public.recompute_user_rating();
