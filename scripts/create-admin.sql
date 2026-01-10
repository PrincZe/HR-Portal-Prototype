-- Bootstrap Script: Create First Admin User
-- Run this in Supabase SQL Editor after your first OTP login

-- Step 1: Find your auth user ID (replace the email if needed)
-- SELECT id FROM auth.users WHERE email = 'silent_will7@hotmail.com';

-- Step 2: Copy the ID from above and use it below
-- Replace 'YOUR_AUTH_USER_ID_HERE' with the actual UUID

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
  'YOUR_AUTH_USER_ID_HERE', -- Replace with your auth.users.id
  'silent_will7@hotmail.com',
  'System Administrator',
  'PSD',
  1, -- System Admin role
  'active',
  NOW(),
  NOW()
);

-- Verify it was created
SELECT u.*, r.display_name as role_name 
FROM public.users u 
JOIN public.roles r ON u.role_id = r.id 
WHERE u.email = 'silent_will7@hotmail.com';
