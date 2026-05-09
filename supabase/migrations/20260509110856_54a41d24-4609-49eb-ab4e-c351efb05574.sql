
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (user_id, full_name, email, verification_status, verified_at, institution)
VALUES ('cb081198-86f7-4446-9057-18ec620282cc', 'Admin', 'hilulagru@gmail.com', 'approved', now(), 'MTA College')
ON CONFLICT (user_id) DO UPDATE SET verification_status='approved', verified_at=now();
