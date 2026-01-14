// Access Control Functions for File Access
'use server';

import { createClient } from '@/lib/supabase/server';
import { getSignedUrl } from './file-utils';

/**
 * Check if user can access a circular
 */
export async function canAccessCircular(circularId: string) {
  const supabase = await createClient();
  
  // This uses RLS policies, so just try to fetch
  // If user doesn't have access, it will return null
  const { data, error } = await supabase
    .from('circulars')
    .select('*')
    .eq('id', circularId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}

/**
 * Get signed URL for circular main document
 */
export async function getCircularDocumentUrl(circularId: string) {
  const circular = await canAccessCircular(circularId);
  
  if (!circular) {
    throw new Error('Access denied or circular not found');
  }
  
  if (!circular.file_path) {
    throw new Error('Circular has no file attached');
  }
  
  return await getSignedUrl({
    bucket: 'circulars',
    path: circular.file_path,
    expiresIn: 3600,
  });
}

/**
 * Get signed URLs for all circular annexes
 */
export async function getCircularAnnexUrls(circularId: string) {
  const circular = await canAccessCircular(circularId);
  
  if (!circular || !circular.annex_paths || circular.annex_paths.length === 0) {
    return [];
  }
  
  const urls = await Promise.all(
    circular.annex_paths.map(async (path: string) => {
      const url = await getSignedUrl({
        bucket: 'circulars',
        path,
        expiresIn: 3600,
      });
      
      return {
        path,
        url,
        filename: path.split('/').pop() || path,
      };
    })
  );
  
  return urls;
}

/**
 * Check if user can access a resource
 */
export async function canAccessResource(resourceId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('id', resourceId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}

/**
 * Get signed URL for resource file
 */
export async function getResourceFileUrl(resourceId: string) {
  const resource = await canAccessResource(resourceId);
  
  if (!resource) {
    throw new Error('Access denied or resource not found');
  }
  
  if (!resource.file_path) {
    throw new Error('Resource has no file attached');
  }
  
  return await getSignedUrl({
    bucket: 'resources',
    path: resource.file_path,
    expiresIn: 3600,
  });
}

/**
 * Check if user can access HRL meeting
 */
export async function canAccessHRLMeeting(meetingId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('hrl_meetings')
    .select('*')
    .eq('id', meetingId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}

/**
 * Get signed URLs for HRL meeting documents
 */
export async function getHRLMeetingDocumentUrls(meetingId: string) {
  const meeting = await canAccessHRLMeeting(meetingId);
  
  if (!meeting) {
    throw new Error('Access denied or meeting not found');
  }
  
  const urls: Record<string, string> = {};
  
  if (meeting.document_paths && typeof meeting.document_paths === 'object') {
    const docPaths = meeting.document_paths as Record<string, string | string[]>;
    
    for (const [key, value] of Object.entries(docPaths)) {
      if (typeof value === 'string') {
        urls[key] = await getSignedUrl({
          bucket: 'hrl-meetings',
          path: value,
          expiresIn: 3600,
        });
      } else if (Array.isArray(value)) {
        // Handle array of paths
        const arrayUrls = await Promise.all(
          value.map(path => getSignedUrl({
            bucket: 'hrl-meetings',
            path,
            expiresIn: 3600,
          }))
        );
        urls[key] = arrayUrls.join(','); // Or handle differently
      }
    }
  }
  
  return urls;
}
