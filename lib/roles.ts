import { UserRole } from './types/database';

// Role hierarchy - lower tier = higher access
export const ROLE_TIERS: Record<UserRole, number> = {
  system_admin: 1,
  portal_admin: 2,
  hrl_ministry: 3,
  hrl_statboard: 4,
  hrl_rep_ministry: 5,
  hrl_rep_statboard: 6,
  hr_officer: 7,
};

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  system_admin: 'System Administrator',
  portal_admin: 'Portal Administrator',
  hrl_ministry: 'HR Leader (Ministry)',
  hrl_statboard: 'HR Leader (Statutory Board)',
  hrl_rep_ministry: 'HRL Representative (Ministry)',
  hrl_rep_statboard: 'HRL Representative (Stat Board)',
  hr_officer: 'HR Officer',
};

/**
 * Check if a user can access content based on role tier and ministry flag
 */
export function canAccessContent(
  userRole: UserRole,
  requiredTier: number | null,
  ministryOnly: boolean
): boolean {
  const userTier = ROLE_TIERS[userRole];

  // System admin always has access
  if (userRole === 'system_admin') return true;

  // Check tier - user must have equal or higher access (lower tier number)
  if (requiredTier !== null && userTier > requiredTier) {
    return false;
  }

  // Check ministry flag - only ministry roles can access
  if (ministryOnly && !userRole.includes('ministry')) {
    return false;
  }

  return true;
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'system_admin' || userRole === 'portal_admin';
}

/**
 * Check if user is system admin
 */
export function isSystemAdmin(userRole: UserRole): boolean {
  return userRole === 'system_admin';
}

/**
 * Check if user is HRL or HRL Rep (can access HRL meetings)
 */
export function canAccessHRLMeetings(userRole: UserRole): boolean {
  const tier = ROLE_TIERS[userRole];
  return userRole === 'system_admin' || tier <= 6; // HRL Rep tier and above
}

/**
 * Get role tier for a given role
 */
export function getRoleTier(userRole: UserRole): number {
  return ROLE_TIERS[userRole];
}

/**
 * Check if user is from ministry (vs statutory board)
 */
export function isMinistryUser(userRole: UserRole): boolean {
  return userRole.includes('ministry');
}
