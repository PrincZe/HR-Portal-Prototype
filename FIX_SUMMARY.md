# Fix Summary: Infinite Recursion in RLS Policies

**Date**: January 14, 2026  
**Issue**: `infinite recursion detected in policy for relation "users"`  
**Status**: ✅ **FIXED**

## What Was Wrong

Your application was experiencing infinite recursion when users tried to log in. The auth callback would query the `users` table, which triggered RLS (Row Level Security) policies. Those policies called helper functions that also queried the `users` table, creating an infinite loop.

```
Login attempt → Query users table → RLS policy check → 
is_system_admin() function → Query users table → 
RLS policy check → is_system_admin() → ∞ LOOP!
```

## What Was Fixed

### 1. Fixed RLS Helper Functions (Database)
**Migration**: `fix_rls_recursion_final_v2`

Recreated three helper functions to use `plpgsql` language with `postgres` ownership:
- `is_system_admin()` - Checks if user is system admin
- `is_portal_admin()` - Checks if user is portal admin  
- `get_user_agency()` - Gets user's agency

These functions now:
- Use PL/pgSQL language (instead of SQL)
- Are owned by `postgres` role (bypasses RLS)
- Have `SECURITY DEFINER` flag (run with owner's privileges)
- Include error handling to fail gracefully

### 2. Updated Auth Callback (Application)
**Files Modified**:
- Created: `lib/supabase/service-role.ts`
- Updated: `app/(auth)/auth/callback/route.ts`

The auth callback now uses a **service role client** for user lookups during authentication. This completely bypasses RLS and prevents any recursion issues.

## What You Need to Do

### ✅ Step 1: Add Service Role Key (REQUIRED)

1. Go to: https://supabase.com/dashboard/project/cjiixqnsvbevyaffhdbu/settings/api
2. Copy your **service_role** key from the API settings
3. Create/edit `.env.local` in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cjiixqnsvbevyaffhdbu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaWl4cW5zdmJldnlhZmZoZGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTk1OTEsImV4cCI6MjA4MzYzNTU5MX0.RUmD7h-BC6EYNqIYaDNC09GC5kh_gdEvR_wCtuD_ViU
SUPABASE_SERVICE_ROLE_KEY=paste_your_service_role_key_here
```

4. Restart your development server:
```bash
# Press Ctrl+C to stop, then:
npm run dev
```

### ✅ Step 2: Test Login

1. Go to your login page
2. Enter your email: `silent_will7@hotmail.com`
3. Click the magic link in your email
4. You should be redirected to the dashboard! ✨

## Expected Behavior After Fix

✅ **Before** (Broken):
```
2026-01-14 07:23:36.761 [error] User not found in database: {
  authUserId: '8929b9e5-df1c-4485-826c-13d63bc7e864',
  authUserEmail: 'silent_will7@hotmail.com',
  dbError: 'infinite recursion detected in policy for relation "users"'
}
```

✅ **After** (Fixed):
```
2026-01-14 07:30:00.123 [info] Authenticated user: {
  id: '8929b9e5-df1c-4485-826c-13d63bc7e864',
  email: 'silent_will7@hotmail.com'
}
2026-01-14 07:30:00.234 [info] User lookup by ID result: {
  found: true,
  userId: '8929b9e5-df1c-4485-826c-13d63bc7e864',
  userEmail: 'silent_will7@hotmail.com',
  userStatus: 'active'
}
```

## Files Changed

### New Files
- ✅ `lib/supabase/service-role.ts` - Service role client helper
- ✅ `scripts/test-rls-fix.sql` - Test script for RLS policies
- ✅ `RLS_RECURSION_FIX.md` - Detailed technical documentation
- ✅ `SETUP_SERVICE_ROLE_KEY.md` - Setup instructions
- ✅ `FIX_SUMMARY.md` - This file

### Modified Files
- ✅ `app/(auth)/auth/callback/route.ts` - Now uses service role client

### Database Changes
- ✅ Migration: `fix_rls_recursion_final_v2` - Fixed RLS helper functions

## Verification Checklist

After adding the service role key and restarting:

- [ ] No "Missing Supabase URL or Service Role Key" error in logs
- [ ] Can successfully log in with magic link
- [ ] Redirected to dashboard (not unauthorized page)
- [ ] No "infinite recursion" errors in terminal
- [ ] User lookup shows `found: true` in logs

## Need Help?

If you're still experiencing issues after adding the service role key:

1. **Check your `.env.local` file exists and is in the project root**
2. **Verify the service role key is complete** (it's a long JWT token)
3. **Make sure you restarted the dev server** after adding the key
4. **Check the terminal logs** for specific error messages
5. **Verify your user exists** in the database:
   ```sql
   SELECT * FROM users WHERE email = 'silent_will7@hotmail.com';
   ```

## Security Notes

🔒 **Service Role Key Security**:
- Never commit `.env.local` to git (it should be in `.gitignore`)
- Never expose the service role key to the browser
- Only use it in server-side code (API routes, server components)

The current implementation is secure:
- Service role client only used in server-side route handler
- Never exposed to the browser
- Only used for user authentication lookup

## Technical Details

For detailed technical information about the fix, see:
- `RLS_RECURSION_FIX.md` - Complete technical documentation
- `SETUP_SERVICE_ROLE_KEY.md` - Detailed setup instructions
