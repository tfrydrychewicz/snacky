-- On new auth.users signup, auto-create a public.users + user_profiles row
-- so the user immediately has a profile record ready for onboarding.

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    v_email TEXT;
    v_display_name TEXT;
    v_avatar_url TEXT;
    v_google_id TEXT;
BEGIN
    v_email := NEW.email;
    v_display_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name',
        split_part(v_email, '@', 1)
    );
    v_avatar_url := NEW.raw_user_meta_data ->> 'avatar_url';
    v_google_id := NEW.raw_user_meta_data ->> 'sub';

    INSERT INTO public.users (id, google_id, email, display_name, avatar_url, last_login_at)
    VALUES (NEW.id, v_google_id, v_email, v_display_name, v_avatar_url, NOW())
    ON CONFLICT (id) DO UPDATE SET
        last_login_at = NOW(),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        display_name = COALESCE(EXCLUDED.display_name, public.users.display_name);

    INSERT INTO public.user_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
