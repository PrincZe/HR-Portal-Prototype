import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes check
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/auth') ||
                      request.nextUrl.pathname.startsWith('/pending-approval') ||
                      request.nextUrl.pathname.startsWith('/unauthorized');
  const isPublicRoute = request.nextUrl.pathname === '/' && !user;
  const isDashboardRoute = !isAuthRoute && !isPublicRoute;

  if (!user && isDashboardRoute) {
    // Redirect to login if not authenticated
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === '/login') {
    // Check user status before redirecting
    const { data: userData } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .single();

    if (userData) {
      const url = request.nextUrl.clone();
      
      // Redirect based on user status
      if (userData.status === 'pending') {
        url.pathname = '/pending-approval';
        return NextResponse.redirect(url);
      } else if (userData.status === 'rejected' || userData.status === 'disabled') {
        url.pathname = '/unauthorized';
        return NextResponse.redirect(url);
      } else if (userData.status === 'active') {
        // Only redirect to dashboard if user is active
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }
  }

  // Prevent pending/rejected/disabled users from accessing dashboard routes
  if (user && isDashboardRoute) {
    const { data: userData } = await supabase
      .from('users')
      .select('status')
      .eq('id', user.id)
      .single();

    if (userData && userData.status !== 'active') {
      const url = request.nextUrl.clone();
      
      if (userData.status === 'pending') {
        url.pathname = '/pending-approval';
      } else {
        url.pathname = '/unauthorized';
      }
      
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse;
}
