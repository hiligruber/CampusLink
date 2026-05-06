
-- Roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Verification status enum
CREATE TYPE public.verification_status AS ENUM ('pending_submission', 'pending_review', 'approved', 'rejected');

-- Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN institution text,
  ADD COLUMN student_id_url text,
  ADD COLUMN verification_status verification_status NOT NULL DEFAULT 'pending_submission',
  ADD COLUMN rejection_reason text,
  ADD COLUMN verified_at timestamptz;

-- Allow admins to view + update all profiles (for verification)
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for student IDs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('student-ids', 'student-ids', false);

CREATE POLICY "Users upload own student id" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-ids' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own student id" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'student-ids' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own student id" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-ids' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
