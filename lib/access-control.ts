import { User, ContentGroup, PrimaryTopic, ApplicableFor, CircularType } from './types/database';

interface CircularAccessFields {
  applicable_for?: ApplicableFor | null;
  circular_type?: CircularType | null;
  primary_topic?: PrimaryTopic | string | null;
}

/**
 * Filter circulars based on user's access control settings.
 * This is a client-side backup to RLS policies.
 */
export function filterCircularsByAccess<T extends CircularAccessFields>(
  circulars: T[],
  user: User
): T[] {
  const roleName = user.roles?.name;

  // System Admin sees all
  if (roleName === 'system_admin') {
    return circulars;
  }

  // Content Editor sees their assigned topics
  if (roleName === 'content_editor') {
    const assignedTopics = user.assigned_topics || [];
    if (assignedTopics.length === 0) {
      return [];
    }
    return circulars.filter(c =>
      c.primary_topic && assignedTopics.includes(c.primary_topic as PrimaryTopic)
    );
  }

  // HRL/HRO/Portal Admin based on content_group
  const contentGroup = user.content_group;

  // Portal Admin without content_group sees nothing
  if (!contentGroup) {
    // Allow circulars without new access control fields (backwards compatibility)
    return circulars.filter(c =>
      c.applicable_for === null ||
      c.applicable_for === undefined ||
      c.circular_type === null ||
      c.circular_type === undefined
    );
  }

  return circulars.filter(c => {
    const { applicable_for, circular_type } = c;

    // If circular doesn't have access control fields, allow based on backwards compatibility
    if (!applicable_for || !circular_type) {
      return true;
    }

    // Apply the access control matrix
    if (applicable_for === 'cs_only' && circular_type === 'hrl') {
      return contentGroup === 'hrl_cs';
    }

    if (applicable_for === 'cs_only' && circular_type === 'hr_ops') {
      return contentGroup === 'hrl_cs' || contentGroup === 'hro_cs';
    }

    if (applicable_for === 'cs_and_sb' && circular_type === 'hrl') {
      return contentGroup === 'hrl_cs' || contentGroup === 'hrl_sb';
    }

    if (applicable_for === 'cs_and_sb' && circular_type === 'hr_ops') {
      return ['hrl_cs', 'hrl_sb', 'hro_cs', 'hro_sb'].includes(contentGroup);
    }

    return false;
  });
}

/**
 * Check if a user can access a specific circular
 */
export function canAccessCircular(
  circular: CircularAccessFields,
  user: User
): boolean {
  return filterCircularsByAccess([circular], user).length > 0;
}

/**
 * Get the available topics for a user (for upload forms)
 * Content Editors only see their assigned topics
 * Other users see all topics
 */
export function getAvailableTopicsForUser(
  user: User,
  allTopics: Array<{ value: string; label: string }>
): Array<{ value: string; label: string }> {
  const roleName = user.roles?.name;

  if (roleName === 'content_editor') {
    const assignedTopics = user.assigned_topics || [];
    return allTopics.filter(t => assignedTopics.includes(t.value as PrimaryTopic));
  }

  // Admins and other roles see all topics
  return allTopics;
}

/**
 * Check if a user can upload a circular with a specific topic
 */
export function canUploadCircularWithTopic(
  topic: string,
  user: User
): boolean {
  const roleName = user.roles?.name;

  // System Admin and Portal Admin can upload any topic
  if (roleName === 'system_admin' || roleName === 'portal_admin') {
    return true;
  }

  // Content Editor can only upload for assigned topics
  if (roleName === 'content_editor') {
    const assignedTopics = user.assigned_topics || [];
    return assignedTopics.includes(topic as PrimaryTopic);
  }

  // Other roles (HRL/HRO) cannot upload
  return false;
}
