-- Fix: Ensure users can always read their own record after authentication
-- The issue is that the "Users can view own record" policy should work, 
-- but we need to make sure it's the only SELECT policy or properly ordered

-- First, let's check current policies
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users' AND cmd = 'SELECT';

-- The issue might be that multiple SELECT policies need ALL to be true
-- Let's recreate the user self-read policy to ensure it works

-- Drop and recreate the self-read policy
DROP POLICY IF EXISTS "Users can view own record" ON public.users;

CREATE POLICY "Users can view own record"
ON public.users
FOR SELECT
TO authenticated  -- Changed from 'public' to 'authenticated' for clarity
USING (auth.uid() = id);

-- Verify
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'SELECT'
ORDER BY policyname;
