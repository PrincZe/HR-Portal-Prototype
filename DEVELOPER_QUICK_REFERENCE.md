# Developer Quick Reference - File Upload System

Quick reference for developers working with the HR Portal file upload system.

---

## 🎯 Quick Start

### Upload a Circular (Server Action)
```typescript
import { createClient } from '@/lib/supabase/server';
import { deleteFiles } from '@/lib/storage/file-utils';

const supabase = await createClient();
const uploadedPaths: string[] = [];

// 1. Upload main file
const mainPath = `hrl/2026/15-2026/main.pdf`;
await supabase.storage.from('circulars').upload(mainPath, file);
uploadedPaths.push(mainPath);

// 2. Upload annexes
for (const annex of annexFiles) {
  const path = `hrl/2026/15-2026/annexes/${annex.name}`;
  await supabase.storage.from('circulars').upload(path, annex);
  uploadedPaths.push(path);
}

// 3. Insert DB record
const { error } = await supabase.from('circulars').insert({
  title: 'My Circular',
  circular_number: '15/2026',
  type: 'hrl',
  file_path: mainPath,
  annex_paths: uploadedPaths.slice(1), // All except main
  // ... other fields
});

// 4. Rollback on error
if (error) {
  await deleteFiles('circulars', uploadedPaths);
  throw error;
}
```

### Get Signed URL
```typescript
import { getSignedUrl } from '@/lib/storage/file-utils';

const url = await getSignedUrl({
  bucket: 'circulars',
  path: 'hrl/2026/15-2026/main.pdf',
  expiresIn: 3600, // 1 hour
});
```

### Check Access & Get URLs
```typescript
import { canAccessCircular, getCircularAnnexUrls } from '@/lib/storage/access-control';

// Check if user can access (uses RLS)
const circular = await canAccessCircular(id);
if (!circular) return notFound();

// Get all annex URLs
const annexes = await getCircularAnnexUrls(id);
// Returns: [{ path, url, filename }, ...]
```

---

## 📁 File Paths Convention

### Circulars
```
circulars/{type}/{year}/{circular_number}/{filename}
circulars/hrl/2026/15-2026/main.pdf
circulars/hrl/2026/15-2026/annexes/annex1.pdf
```

### Resources
```
resources/{topic}/{year}/{filename}
resources/deployment/2026/1234567890_template.xlsx
```

### HRL Meetings
```
hrl-meetings/{year}/{meeting_id}/{type}_{filename}
hrl-meetings/2026/1234567890/agenda_meeting.pdf
hrl-meetings/2026/1234567890/presentation_slides.pptx
```

---

## 🗄️ Database Schema Quick Reference

### Circulars Table
```sql
circulars (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  circular_number text UNIQUE NOT NULL,
  type text CHECK (type IN ('hrl', 'hrops', 'psd')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  annex_paths text[], -- Array of annex file paths
  applicable_for text CHECK (...),
  issue_date date,
  primary_topic text CHECK (topic IN ('deployment', 'hr_analytics')),
  secondary_topic text,
  status text DEFAULT 'valid' CHECK (status IN ('valid', 'obsolete')),
  notify_update boolean DEFAULT true,
  sb_compliance text CHECK (...),
  related_circulars jsonb DEFAULT '[]',
  description text,
  min_role_tier integer,
  ministry_only boolean DEFAULT false,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

### Resources Table
```sql
resources (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  title text,
  topic text NOT NULL,
  category_type text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  description text,
  notify boolean DEFAULT false,
  min_role_tier integer,
  ministry_only boolean DEFAULT false,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)
```

### HRL Meetings Table
```sql
hrl_meetings (
  id uuid PRIMARY KEY,
  meeting_date date NOT NULL,
  title text NOT NULL,
  file_path text NOT NULL, -- Main file for compatibility
  file_name text NOT NULL,
  file_size integer,
  document_paths jsonb DEFAULT '{}', -- { agenda: "path", presentation: "path", ... }
  description text,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now()
)
```

---

## 🎨 UI Components

### Status Badge
```tsx
import { StatusBadge } from '@/components/ui/status-badge';

<StatusBadge status="valid" /> // Green ✓
<StatusBadge status="obsolete" /> // Red ✕
```

### Circular Type Badge
```tsx
import { CircularTypeBadge } from '@/components/ui/circular-type-badge';

<CircularTypeBadge type="hrl" /> // • HRL Circular
<CircularTypeBadge type="hrops" /> // • HR Ops Circular
```

### Annexes Sidebar (Yellow Box)
```tsx
import { AnnexesSidebar } from '@/components/circulars/annexes-sidebar';

const annexes = [
  { url: 'https://...', filename: 'annex1.pdf', path: '...' },
  { url: 'https://...', filename: 'annex2.pdf', path: '...' },
];

<AnnexesSidebar annexes={annexes} />
```

### Confirmation Dialog
```tsx
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

const [showConfirm, setShowConfirm] = useState(false);

<ConfirmationDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  onConfirm={() => {
    // User confirmed
  }}
  title="Confirm Upload"
  description="Custom description..."
  confirmText="Yes, Proceed"
  cancelText="Back"
/>
```

---

## 🎨 Design System

### Colors
```typescript
import { colors } from '@/lib/design-system/colors';

colors.primary.teal      // #17A2B8
colors.primary.darkTeal  // #138496
colors.status.valid      // #28A745
colors.status.obsolete   // #DC3545
colors.bg.annexes        // #FFF4D4
colors.bg.annexesBorder  // #E5D4A0
```

### Typography Classes
```typescript
import { typography } from '@/lib/design-system/typography';

typography.headings.h1   // "text-3xl font-bold text-gray-900"
typography.headings.h2   // "text-2xl font-semibold text-gray-800"
typography.links.primary // "text-[#17A2B8] hover:underline cursor-pointer"
```

### Topics
```typescript
import { PRIMARY_TOPICS, SECONDARY_TOPICS, RESOURCE_CATEGORY_TYPES } from '@/lib/constants/topics';

// 2 primary topics
PRIMARY_TOPICS // [{ value: 'deployment', label: 'Deployment' }, ...]

// 41 secondary topics
SECONDARY_TOPICS // [{ value: 'approving_authorities', label: 'Approving Authorities' }, ...]

// 18 resource categories
RESOURCE_CATEGORY_TYPES // [{ value: 'advice', label: 'Advice' }, ...]
```

---

## 🔐 Access Control

### Role Tiers (Lower = More Access)
```
1 - System Admin      (Full access)
2 - Portal Admin      (Can upload HR Ops, view HRL)
3 - HRL Ministry      (View HRL, HR Ops)
4 - HRL Stat Board    (View HRL, HR Ops)
5 - HRL Rep Ministry  (View HRL, HR Ops)
6 - HRL Rep           (View HRL, HR Ops)
7 - HR Officer        (View HR Ops only)
```

### Checking Access
RLS policies automatically filter based on:
- `min_role_tier` - User's role tier must be ≤ this value
- `ministry_only` - User must be from a ministry (not stat board)

```sql
-- Example RLS policy
CREATE POLICY "Users can view based on role"
ON circulars FOR SELECT
USING (
  (min_role_tier IS NULL OR 
   auth.uid() IN (
     SELECT id FROM users WHERE role_tier <= min_role_tier
   ))
  AND
  (NOT ministry_only OR 
   auth.uid() IN (
     SELECT id FROM users WHERE agency_type = 'ministry'
   ))
);
```

---

## 🔧 Form Validation

### Circular Upload Schema
```typescript
import { circularUploadSchema } from '@/lib/schemas/circular-upload';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const form = useForm({
  resolver: zodResolver(circularUploadSchema),
  defaultValues: {
    notify_update: true,
    status: 'valid',
    // ...
  },
});
```

### Custom File Validation
```typescript
// Max 10MB, PDF/DOC/DOCX only
file: z.custom<FileList>()
  .refine((files) => files?.length === 1, 'Please select a file')
  .refine((files) => files?.[0]?.size <= 10 * 1024 * 1024, 'Max 10MB')
  .refine(
    (files) => ['application/pdf', ...].includes(files?.[0]?.type),
    'Only PDF, DOC, DOCX accepted'
  )
```

---

## 🎯 Common Patterns

### Upload with Rollback
```typescript
const uploadedPaths: string[] = [];

try {
  // Upload files...
  uploadedPaths.push(path1, path2);
  
  // Insert DB record...
  const { error } = await supabase.from('table').insert(data);
  
  if (error) throw error;
  
  toast.success('Success!');
} catch (error) {
  // Rollback uploaded files
  await deleteFiles('bucket', uploadedPaths);
  toast.error(error.message);
}
```

### Multi-file Upload (Annexes)
```typescript
const [annexFiles, setAnnexFiles] = useState<File[]>([]);

// Add files
const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  setAnnexFiles(prev => [...prev, ...files]);
};

// Remove file
const removeFile = (index: number) => {
  setAnnexFiles(prev => prev.filter((_, i) => i !== index));
};

// Upload all
for (const file of annexFiles) {
  const path = `.../${file.name}`;
  await supabase.storage.from('bucket').upload(path, file);
  annexPaths.push(path);
}
```

### Dynamic Form Fields (Related Circulars)
```typescript
import { useFieldArray } from 'react-hook-form';

const { fields, append, remove } = useFieldArray({
  control: form.control,
  name: 'related_circulars',
});

// Add row
<Button onClick={() => append({ title: '', url: '' })}>
  Add Related Circular
</Button>

// Render fields
{fields.map((field, index) => (
  <div key={field.id}>
    <Input {...form.register(`related_circulars.${index}.title`)} />
    <Input {...form.register(`related_circulars.${index}.url`)} />
    <Button onClick={() => remove(index)}>Remove</Button>
  </div>
))}
```

---

## 🐛 Debugging

### Check RLS Policies
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'circulars';
```

### Check Storage Policies
```sql
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
```

### Test File Access
```typescript
// In browser console
const { data, error } = await supabase.storage
  .from('circulars')
  .createSignedUrl('hrl/2026/15-2026/main.pdf', 60);
console.log(data?.signedUrl);
```

### View Access Logs
```sql
SELECT * FROM access_logs 
WHERE action IN ('upload_circular', 'download_circular', 'view_circular')
ORDER BY created_at DESC 
LIMIT 50;
```

---

## 📞 Support

- Spec: `HR_Portal_Prototype_Specification.md`
- Guide: `HR_Portal_File_Upload_Implementation_Guide.md`
- Summary: `IMPLEMENTATION_COMPLETE.md`
- This Reference: `DEVELOPER_QUICK_REFERENCE.md`

---

**Last Updated:** January 14, 2026
