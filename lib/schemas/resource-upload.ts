import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export const resourceUploadSchema = z.object({
  // Name (Required)
  name: z.string().min(1, 'Name is required').max(255, 'Name must not exceed 255 characters'),

  // Title (Optional)
  title: z.string().max(255, 'Title must not exceed 255 characters').optional(),

  // Topic (Required)
  topic: z.string().min(1, 'Please select a topic'),

  // Category Type (Optional)
  category_type: z.string().optional(),

  // Notify (Checkbox, default: false)
  notify: z.boolean().default(false),

  // File Upload (Required)
  file: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, 'Please select a file')
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, 'Max file size is 10MB')
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      'File type not accepted. Please use PDF, DOC, DOCX, XLS, XLSX, PPT, or PPTX'
    ),

  // Description (Optional)
  description: z.string().optional(),

  // Access Control
  min_role_tier: z.string().optional(),
  ministry_only: z.boolean().default(false),
});

export type ResourceUploadFormValues = z.infer<typeof resourceUploadSchema>;
