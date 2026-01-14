import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    
    // Track cookies that need to be set on the response
    const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSetArray) {
            // Store cookies to set on response
            cookiesToSetArray.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore - will set on response instead
              }
              cookiesToSet.push({ name, value, options });
            });
          },
        },
      }
    );
    
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
      const response = NextResponse.redirect(`${origin}/unauthorized?reason=no_access`);
      // Set cookies on response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    // Determine redirect URL based on user status
    let redirectUrl = `${origin}/`;
    
    if (userData.status === 'pending') {
      redirectUrl = `${origin}/pending-approval`;
    } else if (userData.status === 'rejected' || userData.status === 'disabled') {
      redirectUrl = `${origin}/unauthorized?reason=${userData.status}`;
    } else {
      // User is active - update last login timestamp
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
    }

    // Create response with cookies
    const response = NextResponse.redirect(redirectUrl);
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  }

  // No code provided
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
