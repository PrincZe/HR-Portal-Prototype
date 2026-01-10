import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { User, UserRole } from './types/database';

/**
 * Get the current authenticated user with their role information
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  // Fetch user data with role information
  const { data: userData, error } = await supabase
    .from('users')
    .select('*, roles(*)')
    .eq('id', authUser.id)
    .single();

  if (error || !userData) return null;

  return userData as User;
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.status !== 'active') {
    redirect('/pending-approval');
  }

  return user;
}

/**
 * Require specific role(s) - redirect if user doesn't have required role
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.roles.name)) {
    redirect('/unauthorized');
  }

  return user;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Check if user is authenticated (without redirecting)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null && user.status === 'active';
}
