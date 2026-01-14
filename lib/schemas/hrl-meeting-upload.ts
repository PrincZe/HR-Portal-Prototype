import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const fileSchema = z
  .custom<FileList>()
  .refine((files) => !files || files.length === 0 || files[0]?.size <= MAX_FILE_SIZE, 'Max file size is 10MB')
  .refine(
    (files) => !files || files.length === 0 || ACCEPTED_FILE_TYPES.includes(files[0]?.type),
    'File type not accepted. Please use PDF, DOC, DOCX, PPT, or PPTX'
  )
  .optional();

export const hrlMeetingUploadSchema = z.object({
  // Meeting Date (Required)
  meeting_date: z.string().min(1, 'Meeting date is required'),

  // Meeting Title (Required)
  title: z.string().min(1, 'Meeting title is required').max(255, 'Title must not exceed 255 characters'),

  // Document uploads (all optional)
  agenda: fileSchema,
  presentation: fileSchema,
  minutes: fileSchema,
  other_documents: z.custom<FileList>().optional(),

  // Description (Optional)
  description: z.string().optional(),
});

export type HRLMeetingUploadFormValues = z.infer<typeof hrlMeetingUploadSchema>;
