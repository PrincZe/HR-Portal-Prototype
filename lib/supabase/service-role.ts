import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with service role key
 * This client bypasses RLS and should only be used in secure server-side contexts
 * NEVER expose this client to the browser!
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase URL or Service Role Key');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
