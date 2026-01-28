// Database type definitions
// These will be generated from Supabase in Phase 3

export type UserRole =
  | 'system_admin'
  | 'portal_admin'
  | 'hrl_ministry'
  | 'hrl_statboard'
  | 'hrl_rep_ministry'
  | 'hrl_rep_statboard'
  | 'hr_officer'
  | 'content_editor';

export type UserStatus = 'pending' | 'active' | 'rejected' | 'disabled';

export type ContentGroup = 'hrl_cs' | 'hrl_sb' | 'hro_cs' | 'hro_sb';

export type ApplicableFor = 'cs_only' | 'cs_and_sb';

export type CircularType = 'hrl' | 'hr_ops';

export type PrimaryTopic =
  | 'business_continuity_planning'
  | 'hr_analytics'
  | 'organisational_design'
  | 'public_service_transformation'
  | 'internship'
  | 'psc_scholarships'
  | 'recruitment_appointment'
  | 'deployment'
  | 'learning_growth'
  | 'performance_management'
  | 'talent_management_development'
  | 'compensation'
  | 'conduct_discipline'
  | 'employee_recognition_wellbeing'
  | 'flexible_work_arrangements'
  | 'industrial_relations'
  | 'leave'
  | 'medical'
  | 'transport_travel'
  | 'other_benefits'
  | 'leaving_service'
  | 're_employment'
  | 'general'
  | 'personnel_board_matters'
  | 'approving_authorities'
  | 'data_systems';

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
  content_group: ContentGroup | null;
  assigned_topics: PrimaryTopic[];
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
  circular_type: CircularType | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  description: string | null;
  min_role_tier: number | null;
  ministry_only: boolean;
  applicable_for: ApplicableFor | null;
  primary_topic: PrimaryTopic | null;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
  ai_summary: string | null;
  extracted_content: string | null;
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
  applicable_for: ApplicableFor | null;
  circular_type: CircularType | null;
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
