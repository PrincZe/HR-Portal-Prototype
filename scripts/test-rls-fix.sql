-- Test script to verify RLS infinite recursion is fixed
-- Run this as an authenticated user to test the policies

-- 1. Test that the helper functions work
SELECT 
    'Testing helper functions' as test_section,
    public.is_system_admin() as is_system_admin,
    public.is_portal_admin() as is_portal_admin,
    public.get_user_agency() as user_agency;

-- 2. Test that users can query their own record
SELECT 
    'Testing SELECT own record' as test_section,
    id,
    email,
    full_name,
    status
FROM public.users
WHERE id = auth.uid();

-- 3. Test that system admins can see all users (if you're a system admin)
SELECT 
    'Testing SELECT all users (system admin)' as test_section,
    count(*) as total_users
FROM public.users;

-- 4. Verify no recursion by checking current policies
SELECT 
    'Current RLS Policies' as test_section,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY cmd, policyname;
