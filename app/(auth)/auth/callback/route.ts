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

    // Get the authenticated user - verify session is established
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return NextResponse.redirect(`${origin}/login?error=user_not_found`);
    }

    console.log('Authenticated user:', { id: user.id, email: user.email });

    // Check if user exists in our users table - first by ID, then by email
    // Query without roles join first to avoid RLS recursion, then fetch roles separately
    console.log('Looking up user in database:', { userId: user.id, userEmail: user.email });
    let { data: userData, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // If user found, fetch role separately to avoid RLS recursion
    if (userData && !dbError) {
      const { data: roleData } = await supabase
        .from('roles')
        .select('*')
        .eq('id', userData.role_id)
        .single();
      
      if (roleData) {
        userData.roles = roleData;
      }
    }

    console.log('User lookup by ID result:', { 
      found: !!userData, 
      error: dbError?.message,
      userId: userData?.id,
      userEmail: userData?.email,
      userStatus: userData?.status
    });

    // If not found by ID, try finding by email (in case user was created manually in Supabase Auth)
    if (dbError || !userData) {
      console.log(`User not found by ID ${user.id}, trying to find by email ${user.email}`);
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();
      
      // If user found by email, fetch role separately
      if (userByEmail && !emailError) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('*')
          .eq('id', userByEmail.role_id)
          .single();
        
        if (roleData) {
          userByEmail.roles = roleData;
        }
      }
      
      console.log('User lookup by email result:', {
        found: !!userByEmail,
        error: emailError?.message,
        userId: userByEmail?.id,
        userEmail: userByEmail?.email,
        userStatus: userByEmail?.status
      });
      
      if (userByEmail && !emailError) {
        // Found user by email but ID doesn't match - this indicates a data inconsistency
        // The user exists in our database but with a different Supabase Auth ID
        console.error('User found by email but ID mismatch:', {
          authUserId: user.id,
          dbUserId: userByEmail.id,
          email: user.email
        });
        // Use the found user data but note the ID mismatch
        userData = userByEmail;
      } else {
        // User not found at all in our database
        console.error('User not found in database:', {
          authUserId: user.id,
          authUserEmail: user.email,
          dbError: dbError?.message,
          emailError: emailError?.message
        });
        const response = NextResponse.redirect(`${origin}/unauthorized?reason=no_access`);
        // Set cookies on response
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        return response;
      }
    }

    if (!userData) {
      // Final check - user still not found
      console.error('User data is null after all attempts');
      const response = NextResponse.redirect(`${origin}/unauthorized?reason=no_access`);
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }

    // Use the database user ID (which might differ from auth user ID if found by email)
    const dbUserId = userData.id;
    
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
        .eq('id', dbUserId);

      // Log the login action
      await supabase
        .from('access_logs')
        .insert({
          user_id: dbUserId,
          action: 'login',
          metadata: { email: user.email, auth_user_id: user.id }
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
