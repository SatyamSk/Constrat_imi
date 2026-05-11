-- Fix profile role assignment for new users
-- Set default role to 'member' instead of 'guest'

-- Update the trigger function to set role to 'member'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles that have 'guest' role to 'member'
UPDATE public.profiles
SET role = 'member'
WHERE role = 'guest' AND created_at > NOW() - INTERVAL '1 day';