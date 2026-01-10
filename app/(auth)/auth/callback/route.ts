import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    
    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return NextResponse.redirect(`${origin}/login?error=user_not_found`);
    }

    // Check if user exists in our users table
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*, roles(*)')
      .eq('id', user.id)
      .single();

    if (dbError || !userData) {
      // User authenticated but not in our database
      return NextResponse.redirect(`${origin}/unauthorized?reason=no_access`);
    }

    // Check user status
    if (userData.status === 'pending') {
      return NextResponse.redirect(`${origin}/pending-approval`);
    }

    if (userData.status === 'rejected' || userData.status === 'disabled') {
      return NextResponse.redirect(`${origin}/unauthorized?reason=${userData.status}`);
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Log the login action
    await supabase
      .from('access_logs')
      .insert({
        user_id: user.id,
        action: 'login',
        metadata: { email: user.email }
      });

    // Successful login - redirect to dashboard
    return NextResponse.redirect(`${origin}/`);
  }

  // No code provided
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
