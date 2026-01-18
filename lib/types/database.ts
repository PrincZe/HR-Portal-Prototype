// Database type definitions
// These will be generated from Supabase in Phase 3

export type UserRole = 
  | 'system_admin'
  | 'portal_admin'
  | 'hrl_ministry'
  | 'hrl_statboard'
  | 'hrl_rep_ministry'
  | 'hrl_rep_statboard'
  | 'hr_officer';

export type UserStatus = 'pending' | 'active' | 'rejected' | 'disabled';

export interface Role {
  id: number;
  name: UserRole;
  display_name: string;
  tier: number;
  description: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  agency: string | null;
  role_id: number;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  last_login: string | null;
  roles: Role;
}

export interface Circular {
  id: string;
  title: string;
  circular_number: string;
  type: 'hrl' | 'hrops' | 'psd' | 'psd_minute';
  file_path: string;
  file_name: string;
  file_size: number | null;
  description: string | null;
  min_role_tier: number | null;
  ministry_only: boolean;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  topic: string;
  tags: string[] | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  description: string | null;
  min_role_tier: number | null;
  ministry_only: boolean;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
}

export interface HRLMeeting {
  id: string;
  meeting_date: string;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  display_order: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}
