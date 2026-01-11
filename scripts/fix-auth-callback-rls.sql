-- Fix: Add RLS policy to allow auth callback to read user records
-- This allows the auth callback to check user status even before the session is fully established

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Allow auth callback to read user records" ON public.users;

-- Create a new policy that allows reading user records during auth callback
-- This checks if the email matches between auth.users and public.users
CREATE POLICY "Allow auth callback to read user records"
ON public.users
FOR SELECT
TO public
USING (
  -- Allow if the user is querying their own record (existing policy)
  auth.uid() = id
  OR
  -- Allow if the email matches (for auth callback before session is established)
  email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Verify the policy was created
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users' 
  AND policyname = 'Allow auth callback to read user records';
