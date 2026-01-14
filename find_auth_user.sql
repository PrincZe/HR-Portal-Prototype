-- Step 1: Find your Supabase Auth user ID
-- Replace 'your-email@example.com' with the email you're using to log in
SELECT 
  id as auth_user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Step 2: Check if a user record already exists in the users table
SELECT 
  id,
  email,
  status,
  role_id,
  full_name,
  agency
FROM users
WHERE email = 'your-email@example.com';
