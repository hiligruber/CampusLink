
-- 1. Restrict profiles SELECT to owner + admin, expose public fields via a view
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users view own profile or admin views any"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT user_id, full_name, avatar_url, rating, rating_count, total_ratings,
       institution, music_preference, hobbies, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- The view needs to bypass the new restrictive policy for cross-user reads:
-- switch to security_definer view scoped to safe columns only
DROP VIEW public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT user_id, full_name, avatar_url, rating, rating_count, total_ratings,
       institution, music_preference, hobbies, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;
REVOKE ALL ON public.public_profiles FROM anon;

-- 2. Update is_user_in_ride to require accepted bookings only
CREATE OR REPLACE FUNCTION public.is_user_in_ride(_user_id uuid, _ride_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rides r WHERE r.id = _ride_id AND r.driver_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.ride_id = _ride_id AND b.passenger_id = _user_id
      AND b.status = 'accepted'
  );
$$;

-- 3. Storage: add DELETE policy for student-ids (owner or admin)
CREATE POLICY "Users or admins delete own student id"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-ids'
  AND ((auth.uid())::text = (storage.foldername(name))[1]
       OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- 4. Restrict avatars bucket listing to owner (public URL access still works via CDN)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Users list own avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Revoke anon EXECUTE on SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_user_in_ride(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_in_ride(uuid, uuid) TO authenticated;
