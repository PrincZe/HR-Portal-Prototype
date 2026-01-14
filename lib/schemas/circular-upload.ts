import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export const circularUploadSchema = z.object({
  // 1. Applicable For (Required)
  applicable_for: z.enum(['civil_service_and_sb', 'civil_service_only'], {
    required_error: 'Please select who this circular applies to',
  }),

  // 2. Circular Type (Required)
  type: z.enum(['hrl', 'hrops', 'psd'], {
    required_error: 'Please select a circular type',
  }),

  // 3. Circular Number (Required)
  circular_number: z.string().min(1, 'Circular number is required')
    .regex(/^\d+[a-z]?\/\d{4}$/, 'Format must be: NUMBER/YEAR (e.g., 15/2026)'),

  // 4. Issue Date (Required)
  issue_date: z.string().min(1, 'Issue date is required'),

  // 5. Primary Topic (Required)
  primary_topic: z.enum(['deployment', 'hr_analytics'], {
    required_error: 'Please select a primary topic',
  }),

  // 6. Secondary Topic (Optional)
  secondary_topic: z.string().optional(),

  // 7. Circular Title (Required)
  title: z.string().min(1, 'Title is required').max(255, 'Title must not exceed 255 characters'),

  // 8. Circular Status (Required)
  status: z.enum(['valid', 'obsolete'], {
    required_error: 'Please select a status',
  }),

  // 9. Turn On Notification (Optional, default: true)
  notify_update: z.boolean().default(true),

  // 10. SB Compliance (Required)
  sb_compliance: z.enum(['for_information', 'partial_compliance', 'full_compliance'], {
    required_error: 'Please select SB compliance level',
  }),

  // 11. Upload Circular Document (Required)
  main_document: z.custom<FileList>()
    .refine((files) => files?.length === 1, 'Please select a file')
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, 'Max file size is 10MB')
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      'Only PDF, DOC, and DOCX files are accepted'
    ),

  // 12. Upload Annex Documents (Optional)
  annex_documents: z.custom<FileList>().optional(),

  // 13 & 14. Related Circulars (Optional, Repeatable)
  related_circulars: z.array(z.object({
    title: z.string().min(1, 'Related circular title is required').max(63999),
    url: z.string().url('Must be a valid URL'),
  })).optional(),

  // Access Control
  min_role_tier: z.string().optional(),
  ministry_only: z.boolean().default(false),
  
  // Description (not in spec but useful)
  description: z.string().optional(),
});

export type CircularUploadFormValues = z.infer<typeof circularUploadSchema>;
