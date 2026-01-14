# RLS Infinite Recursion Fix

## Problem

The application was experiencing an **infinite recursion error** when trying to authenticate users:

```
infinite recursion detected in policy for relation "users"
```

### Root Cause

The RLS policies on the `users` table were calling helper functions like `is_system_admin()` which queried the `users` table. This created a circular dependency:

1. User tries to query `users` table → RLS policy is checked
2. RLS policy calls `is_system_admin()` function → function queries `users` table
3. Querying `users` table → RLS policy is checked again → **infinite loop!**

### Initial Implementation Issues

The original functions were written in SQL language with `SECURITY DEFINER`:

```sql
CREATE FUNCTION is_system_admin() 
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE ...);
$$;
```

**Problem:** SQL language functions with `SECURITY DEFINER` still respect RLS policies, even though they run with elevated privileges.

## Solution

Applied a **two-part fix**:

### Part 1: Fix RLS Helper Functions

Converted all helper functions to **PL/pgSQL language** and ensured they're **owned by the postgres role**:

```sql
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE plpgsql  -- Changed from 'sql' to 'plpgsql'
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND r.name = 'system_admin'
      AND u.status = 'active'
  ) INTO is_admin;
  
  RETURN COALESCE(is_admin, FALSE);
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Critical: Set owner to postgres role which bypasses RLS
ALTER FUNCTION public.is_system_admin() OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated, anon, public;
```

### Key Changes

1. **Language**: Changed from `sql` to `plpgsql`
2. **Owner**: Explicitly set to `postgres` role (superuser)
3. **Error Handling**: Added `EXCEPTION` block to gracefully handle any issues
4. **Grants**: Explicitly granted execute permissions to all roles that need it

### Functions Fixed

- `is_system_admin()` - Checks if current user is a system administrator
- `is_portal_admin()` - Checks if current user is a portal administrator
- `get_user_agency()` - Returns the current user's agency

### Part 2: Use Service Role Client in Auth Callback

The auth callback now uses a **service role client** for the initial user lookup. This completely bypasses RLS and prevents any recursion issues during authentication.

**Created**: `lib/supabase/service-role.ts`
```typescript
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

**Updated**: `app/(auth)/auth/callback/route.ts`
- Now uses `createServiceRoleClient()` for user lookups
- Service role client bypasses all RLS policies
- Only used in secure server-side context (never exposed to browser)

## How It Works Now

1. User authenticates via magic link → Supabase Auth creates session
2. Auth callback queries `public.users` table → RLS policy activates
3. RLS policy calls `is_system_admin()` function
4. Function runs as `postgres` role (SECURITY DEFINER + postgres owner)
5. **postgres role bypasses RLS** → No recursion!
6. Function returns true/false → RLS policy completes → Query succeeds

## Testing

After applying the migration, users should be able to:

1. ✅ Log in successfully via magic link
2. ✅ Query their own user record
3. ✅ System admins can see all users
4. ✅ Portal admins can see users in their agency
5. ✅ No infinite recursion errors

## Setup Required

### Environment Variable

You need to add the **Supabase Service Role Key** to your environment variables:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (keep this secret!)
4. Add to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ← Add this
```

⚠️ **Security Warning**: The service role key bypasses all RLS policies. Never expose it to the browser or commit it to version control!

## Migration Applied

- Migration: `fix_rls_recursion_final_v2`
- Date: 2026-01-14
- Status: ✅ Applied successfully
- Files Modified:
  - `lib/supabase/service-role.ts` (created)
  - `app/(auth)/auth/callback/route.ts` (updated)

## Additional Notes

### Why PL/pgSQL vs SQL?

When a function is declared as `SECURITY DEFINER`:
- **SQL language**: Still respects RLS on tables it queries (even with elevated privileges)
- **PL/pgSQL language**: Combined with `postgres` ownership, fully bypasses RLS

### Security Implications

These functions are **SECURITY DEFINER** with **postgres ownership**, which means:
- They bypass RLS policies
- They run with superuser privileges
- ⚠️ **Important**: Keep these functions simple and focused
- ⚠️ **Important**: Never expose user input directly to these functions
- ⚠️ **Important**: Only check permissions, don't perform data modifications

Current implementation is safe because:
1. Functions only check `auth.uid()` (Supabase-managed, secure)
2. Functions only perform SELECT queries
3. Functions return only boolean or simple values
4. No user input is used in queries

## Related Files

- Migration: `supabase/migrations/*_fix_rls_recursion_final_v2.sql`
- Auth callback: `app/(auth)/auth/callback/route.ts`
- Auth utilities: `lib/auth.ts`
- Test script: `scripts/test-rls-fix.sql`
