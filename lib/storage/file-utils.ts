// File Storage Utilities for Supabase Storage
'use server';

import { createClient } from '@/lib/supabase/server';

export interface FileUploadOptions {
  bucket: 'circulars' | 'resources' | 'hrl-meetings';
  path: string;
  file: File;
  upsert?: boolean;
}

export interface SignedUrlOptions {
  bucket: string;
  path: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(options: FileUploadOptions) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from(options.bucket)
    .upload(options.path, options.file, {
      upsert: options.upsert || false,
      cacheControl: '3600',
    });
  
  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
  
  return data;
}

/**
 * Generate a signed URL for downloading a file
 */
export async function getSignedUrl(options: SignedUrlOptions) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from(options.bucket)
    .createSignedUrl(options.path, options.expiresIn || 3600);
  
  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
}

/**
 * Get public URL for a file (if bucket is public)
 */
export async function getPublicUrl(bucket: string, path: string) {
  const supabase = await createClient();
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
}

/**
 * Delete multiple files (for rollback)
 */
export async function deleteFiles(bucket: string, paths: string[]) {
  if (!paths || paths.length === 0) return;
  
  const supabase = await createClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove(paths);
  
  if (error) {
    throw new Error(`Batch file deletion failed: ${error.message}`);
  }
}

/**
 * List files in a directory
 */
export async function listFiles(bucket: string, path: string = '') {
  const supabase = await createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path);
  
  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }
  
  return data;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(bucket: string, path: string) {
  const supabase = await createClient();
  
  // Extract directory and filename from path
  const parts = path.split('/');
  const filename = parts.pop();
  const directory = parts.join('/');
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(directory, {
      limit: 100,
      search: filename,
    });
  
  if (error || !data || data.length === 0) {
    throw new Error('File not found');
  }
  
  return data[0];
}
