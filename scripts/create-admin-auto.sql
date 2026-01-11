-- Automated Bootstrap Script: Create First Admin User
-- This script automatically finds your auth user ID and creates the admin user
-- Run this in Supabase SQL Editor after your first OTP login

DO $$
DECLARE
    _user_id UUID;
    _system_admin_role_id INTEGER;
    _admin_email TEXT := 'silent_will7@hotmail.com';
BEGIN
    -- Get the auth.users ID for the email
    SELECT id INTO _user_id FROM auth.users WHERE email = _admin_email;

    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in auth.users. Please log in via OTP first.', _admin_email;
    END IF;

    -- Get the role_id for 'system_admin'
    SELECT id INTO _system_admin_role_id FROM public.roles WHERE name = 'system_admin';

    IF _system_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'System admin role not found. Please ensure the roles table is populated.';
    END IF;

    -- Check if user already exists in public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE id = _user_id) THEN
        RAISE NOTICE 'User % already exists in public.users. Updating to System Admin.', _admin_email;
        
        UPDATE public.users
        SET 
            role_id = _system_admin_role_id,
            status = 'active',
            full_name = 'System Administrator',
            agency = 'PSD',
            updated_at = NOW()
        WHERE id = _user_id;
    ELSE
        -- Insert into public.users table
        INSERT INTO public.users (
            id,
            email,
            full_name,
            agency,
            role_id,
            status,
            created_at,
            updated_at
        ) VALUES (
            _user_id,
            _admin_email,
            'System Administrator',
            'PSD',
            _system_admin_role_id,
            'active',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'System Admin user % created successfully!', _admin_email;
    END IF;
END $$;

-- Verify it was created
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.agency,
    r.display_name as role,
    u.status,
    u.created_at
FROM public.users u 
JOIN public.roles r ON u.role_id = r.id 
WHERE u.email = 'silent_will7@hotmail.com';
