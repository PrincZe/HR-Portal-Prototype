-- SQL Script to create a user record in the users table
-- Replace the values below with your actual information

-- First, check what your Supabase Auth user ID and email are:
-- Run this query in Supabase SQL Editor to find your auth user:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then insert/update the user record in the users table
-- Option 1: If the user doesn't exist, INSERT:
INSERT INTO users (
  id,                    -- Must match the Supabase Auth user ID
  email,                  -- Your email address
  full_name,             -- Your full name
  agency,                 -- Your agency name (e.g., 'PSD', 'MOH', etc.)
  role_id,                -- Role ID (see roles table below)
  status                  -- 'pending', 'active', 'rejected', or 'disabled'
)
VALUES (
  'YOUR_SUPABASE_AUTH_USER_ID_HERE',  -- Replace with your actual Supabase Auth user ID
  'your-email@example.com',            -- Replace with your email
  'Your Full Name',                    -- Replace with your name
  'PSD',                                -- Replace with your agency
  1,                                    -- 1=system_admin, 2=portal_admin, 3=hrl_ministry, etc.
  'active'                              -- Set to 'active' if already approved, 'pending' if needs approval
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  agency = EXCLUDED.agency,
  role_id = EXCLUDED.role_id,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Available Roles:
-- 1 = system_admin (System Administrator)
-- 2 = portal_admin (Portal Administrator)
-- 3 = hrl_ministry (HR Leader - Ministry)
-- 4 = hrl_statboard (HR Leader - Statutory Board)
-- 5 = hrl_rep_ministry (HRL Representative - Ministry)
-- 6 = hrl_rep_statboard (HRL Representative - Stat Board)
-- 7 = hr_officer (HR Officer)

-- Option 2: If you just need to update an existing user's status:
-- UPDATE users 
-- SET status = 'active'
-- WHERE email = 'your-email@example.com';
