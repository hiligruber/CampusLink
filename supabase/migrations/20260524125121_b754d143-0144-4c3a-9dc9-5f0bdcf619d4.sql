
-- Drop previous attempt
DROP VIEW IF EXISTS public.public_profiles;

-- Restore broad row-level SELECT on profiles; column privileges will restrict sensitive fields
DROP POLICY IF EXISTS "Users view own profile or admin views any" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Restrict column-level SELECT: only safe columns accessible to authenticated role directly
REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (
  id, user_id, full_name, avatar_url,
  rating, rating_count, total_ratings,
  institution, music_preference, hobbies,
  verification_status, created_at, updated_at
) ON public.profiles TO authenticated;

-- Preserve write privileges (RLS still enforces per-row ownership/admin)
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- Owner-only secure helper for full profile (returns sensitive columns)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Admin-only secure helper for the verification queue (returns sensitive columns)
CREATE OR REPLACE FUNCTION public.get_pending_verifications()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT * FROM public.profiles
    WHERE verification_status = 'pending_review'
    ORDER BY updated_at DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_pending_verifications() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_pending_verifications() TO authenticated;
