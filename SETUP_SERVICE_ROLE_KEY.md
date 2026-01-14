# Setup Service Role Key - REQUIRED

## ⚠️ Critical Setup Step

Your application needs the **Supabase Service Role Key** to function properly. This key allows the auth callback to bypass RLS policies and prevent infinite recursion errors.

## How to Get Your Service Role Key

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/cjiixqnsvbevyaffhdbu

2. **Navigate to API Settings**
   - Click on **Settings** (⚙️) in the left sidebar
   - Click on **API**

3. **Copy the Service Role Key**
   - Scroll down to the **Project API keys** section
   - Find the **service_role** key (it's a long JWT token)
   - Click the copy button or click "reveal" to see it
   - It starts with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. **Add to Environment Variables**
   - Create or edit `.env.local` in your project root
   - Add the following:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://cjiixqnsvbevyaffhdbu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqaWl4cW5zdmJldnlhZmZoZGJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTk1OTEsImV4cCI6MjA4MzYzNTU5MX0.RUmD7h-BC6EYNqIYaDNC09GC5kh_gdEvR_wCtuD_ViU
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

5. **Restart Development Server**
   ```bash
   # Stop your dev server (Ctrl+C) and restart it
   npm run dev
   ```

## Security Notes

- ⚠️ **NEVER commit the service role key to version control**
- ⚠️ **NEVER expose it to the browser/client side**
- ✅ Only use it in server-side code (API routes, server components)
- ✅ Make sure `.env.local` is in your `.gitignore`

The service role key is already properly secured in this implementation:
- Only used in `lib/supabase/service-role.ts`
- Only imported by server-side route handlers
- Never sent to the browser

## Testing After Setup

Once you've added the key, try logging in again with your magic link. You should no longer see the "infinite recursion" error!

Expected successful login flow:
1. Click magic link in email
2. Redirected to `/auth/callback`
3. User is looked up in database (using service role, bypassing RLS)
4. Redirected to dashboard (if active) or appropriate page

## Troubleshooting

If you still see errors:

1. **Check the key is correct**
   - Make sure you copied the entire service_role key
   - No extra spaces or newlines

2. **Verify environment variables are loaded**
   - Restart your dev server
   - Check the logs for "Missing Supabase URL or Service Role Key"

3. **Check logs**
   - Look at your terminal output for detailed error messages
   - Should see: "Authenticated user: { id: '...', email: '...' }"
   - Should see: "User lookup by ID result: { found: true, ... }"
