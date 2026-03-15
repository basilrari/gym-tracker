-- Auto-create profile when a new user signs up (username must be unique; use id suffix)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := COALESCE(split_part(NEW.email, '@', 1), 'user');
  final_username := base_username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, final_username)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert (run in Supabase SQL editor if migration fails)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
