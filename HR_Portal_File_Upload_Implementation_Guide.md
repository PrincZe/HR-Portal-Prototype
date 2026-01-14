# HR Portal - File Upload & Display Implementation Guide

**Version:** 1.0  
**Date:** January 15, 2026  
**Purpose:** Phased implementation guide for adding file upload and display functionality to HR Portal prototype

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Implementation Phases](#implementation-phases)
4. [Reference Documentation](#reference-documentation)
5. [Success Criteria](#success-criteria)

---

## Overview

### What This Guide Covers

This guide provides step-by-step instructions to implement:

1. **Admin Upload System** - Allow admins to upload circulars, resources, and HRL meeting materials
2. **File Storage** - Store files in Supabase Storage with proper organization
3. **Frontend Display** - Show uploaded files to users with role-based access
4. **Professional UI** - Match the current HR Portal's look and feel

### Architecture Reference

All work builds on the existing prototype specified in `HR_Portal_Prototype_Specification.md`. This guide focuses specifically on the file handling features.

**Key Technologies:**
- Next.js 14 (App Router)
- Supabase (PostgreSQL + Storage)
- TypeScript
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod

---

## Current State

### What's Already Built

Based on your prototype specification:
- ✅ Database schema defined
- ✅ Authentication with Supabase
- ✅ Role-based access control structure
- ✅ Basic UI components
- ✅ Project structure

### What's Missing ("Bareback")

- ❌ File upload forms
- ❌ File storage implementation
- ❌ File display pages with proper styling
- ❌ Annexes/attachments handling
- ❌ Professional styling matching current portal

---

## Implementation Phases

### Phase 0: Preparation & Setup (Day 1)

**Goal:** Set up file storage infrastructure and verify everything works

#### Tasks:

**0.1 Create Supabase Storage Buckets**

```bash
# In Supabase Dashboard > Storage
# Create 3 private buckets:
```

1. **`circulars`** bucket:
   - Public: No (private)
   - File size limit: 10MB
   - Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

2. **`resources`** bucket:
   - Same settings as circulars
   - Additional MIME types: Excel, PowerPoint

3. **`hrl-meetings`** bucket:
   - Same settings as circulars

**0.2 Set Storage Policies**

```sql
-- In Supabase SQL Editor

-- Policy: Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id IN ('circulars', 'resources', 'hrl-meetings'));

-- Policy: Allow users to view files based on their role
-- This will be refined in Phase 2
CREATE POLICY "Users can view files" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id IN ('circulars', 'resources', 'hrl-meetings'));
```

**0.3 Update Database Schema for File Paths**

```sql
-- Add columns if not already present

-- For circulars table
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE circulars ADD COLUMN IF NOT EXISTS annex_paths TEXT[]; -- Array of annex file paths

-- For resources table
ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- For hrl_meetings table
ALTER TABLE hrl_meetings ADD COLUMN IF NOT EXISTS document_paths JSONB; -- Store multiple docs as JSON
```

**0.4 Test Manual Upload/Download**

Create a simple test script to verify Supabase Storage works:

```typescript
// test-storage.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testUpload() {
  // Create a test file
  const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
  
  // Upload to circulars bucket
  const { data, error } = await supabase.storage
    .from('circulars')
    .upload('test/test.pdf', testFile);
  
  if (error) {
    console.error('Upload failed:', error);
  } else {
    console.log('Upload successful:', data);
  }
  
  // Get signed URL
  const { data: urlData } = await supabase.storage
    .from('circulars')
    .createSignedUrl('test/test.pdf', 60);
  
  console.log('Signed URL:', urlData?.signedUrl);
}

testUpload();
```

**0.5 Verify RLS Policies**

Test that role-based access is working:

```sql
-- Check existing RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('circulars', 'resources', 'hrl_meetings');
```

#### Checklist:
- [ ] Three storage buckets created
- [ ] Storage policies added
- [ ] Database columns added
- [ ] Manual upload test successful
- [ ] Signed URL generation working
- [ ] RLS policies verified

---

### Phase 1: Admin Upload Forms (Days 2-4)

**Goal:** Build the admin interfaces to upload circulars, resources, and HRL meeting materials

---

#### Phase 1.1: Circular Upload Form

**Location:** `/app/(dashboard)/admin/circulars/upload/page.tsx`

**Required Form Fields (from FRS):**

1. **Applicable For** (Radio - Required)
   - Civil Service and Statutory Boards
   - Civil Service Only

2. **Circular Type** (Dropdown - Required)
   - HRL Circular
   - HR Ops Circular

3. **Circular Number** (Text Input - Required)
   - Auto-suggest next sequential number: `{number}/2026`
   - Format: `15/2026`
   - User can edit the suggested number
   - Must be unique

4. **Issue Date** (Date Picker - Required)
   - Date the circular was issued

5. **Primary Topic** (Dropdown - Required)
   - Only 2 options:
     - Deployment
     - HR Analytics

6. **Secondary Topic** (Dropdown - Optional)
   - 41 topics from Term Store Management:
     1. Approving Authorities
     2. Awards & Recognition
     3. Business Continuity Planning
     4. Career Transition
     5. Compensation
     6. Competencies
     7. Conduct & Discipline
     8. Confirmation
     9. Crisis Management
     10. Data Management & Governance
     11. Deployment
     12. Employee Records
     13. Employee Wellbeing
     14. Flexible Work Arrangements
     15. HR Analytics
     16. HR Management
     17. HRP System
     18. Industrial Relations
     19. Internship
     20. Leadership Development
     21. Learning
     22. Leave Benefits
     23. Leaving Service
     24. Medical & Dental Benefits
     25. Medical Board
     26. Mentoring & Coaching
     27. Organisational Design
     28. Other Benefits
     29. Our Future Workforce
     30. PSC Scholarships
     31. Performance Management
     32. Personnel Board System
     33. Recruitment & Appointment
     34. Restructuring Exercise
     35. Re-Employment
     36. Security Screening
     37. Service Injury
     38. Strategic Workforce Planning
     39. Superannuation
     40. Transport & Travel
     41. Values

7. **Circular Title** (Text Input - Required)
   - 255 character limit

8. **Circular Status** (Radio - Required)
   - Valid
   - Obsolete

9. **Turn On Notification** (Radio - Optional, Default: Yes)
   - Yes
   - No

10. **SB Compliance** (Dropdown - Required)
    - For Information
    - Partial Compliance
    - Full Compliance

11. **Upload Circular Document** (File Upload - Required)
    - Single file via "Choose File" button (not drag & drop for main doc)
    - Show confirmation popup BEFORE upload:
      ```
      "I confirm that I have indicated the classification of the circular 
       in the header and/or footer of the document.
       
       To note: HR Portal is classified as 'Restricted/Non-sensitive'"
      ```
    - Buttons: "Yes, Proceed to Upload" / "Back"
    - Accept: PDF, DOC, DOCX
    - Max size: 10MB

12. **Upload Annex Documents** (Multiple File Upload - Optional)
    - Drag & drop OR click to browse
    - Multiple files allowed
    - Show list of selected files with X to remove
    - Accept: PDF, DOC, DOCX
    - Max size per file: 10MB

13. **Related Circular Title** (Text Input - Optional, Repeatable)
    - 63999 character limit

14. **Related Circular URL** (URL Input - Optional, Repeatable)
    - Hyperlink to related circular

15. **Add Row** (Button)
    - Add more Related Circular rows

**Buttons:**
- **Create** - Submit form
- **Cancel** - Return to Manage Circulars page

**Form Validation Schema (Zod):**

```typescript
// lib/schemas/circular-upload.ts
import { z } from 'zod';

export const circularUploadSchema = z.object({
  applicableFor: z.enum(['civil_service_and_sb', 'civil_service_only']),
  circularType: z.enum(['hrl', 'hr_ops']),
  circularNumber: z.string().min(1, 'Circular number is required'),
  issueDate: z.date(),
  primaryTopic: z.enum(['deployment', 'hr_analytics']),
  secondaryTopic: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(255),
  status: z.enum(['valid', 'obsolete']),
  notifyUpdate: z.boolean().default(true),
  sbCompliance: z.enum(['for_information', 'partial_compliance', 'full_compliance']),
  mainDocument: z.custom<File>((file) => {
    if (!file) return false;
    if (!(file instanceof File)) return false;
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) return false;
    if (file.size > 10 * 1024 * 1024) return false; // 10MB
    return true;
  }),
  annexDocuments: z.array(z.custom<File>()).optional(),
  relatedCirculars: z.array(z.object({
    title: z.string(),
    url: z.string().url()
  })).optional()
});
```

**Upload Logic:**

```typescript
// app/(dashboard)/admin/circulars/upload/actions.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function uploadCircular(formData: FormData) {
  const supabase = createServerClient();
  
  // 1. Get current user and verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  // 2. Extract form data
  const circularType = formData.get('circularType') as string;
  const circularNumber = formData.get('circularNumber') as string;
  const mainDocument = formData.get('mainDocument') as File;
  const annexDocuments = formData.getAll('annexDocuments') as File[];
  
  // 3. Check circular number is unique
  const { data: existing } = await supabase
    .from('circulars')
    .select('id')
    .eq('circular_number', circularNumber)
    .single();
  
  if (existing) {
    throw new Error('Circular number already exists');
  }
  
  // 4. Upload main document
  const year = new Date().getFullYear();
  const mainDocPath = `circulars/${circularType}/${year}/${circularNumber}/${mainDocument.name}`;
  
  const { data: mainUpload, error: mainError } = await supabase.storage
    .from('circulars')
    .upload(mainDocPath, mainDocument);
  
  if (mainError) {
    throw new Error(`Failed to upload main document: ${mainError.message}`);
  }
  
  // 5. Upload annex documents
  const annexPaths: string[] = [];
  
  for (const annex of annexDocuments) {
    if (annex.size > 0) {
      const annexPath = `circulars/${circularType}/${year}/${circularNumber}/annexes/${annex.name}`;
      
      const { data: annexUpload, error: annexError } = await supabase.storage
        .from('circulars')
        .upload(annexPath, annex);
      
      if (annexError) {
        // Rollback: delete already uploaded files
        await supabase.storage.from('circulars').remove([mainDocPath, ...annexPaths]);
        throw new Error(`Failed to upload annex: ${annexError.message}`);
      }
      
      annexPaths.push(annexPath);
    }
  }
  
  // 6. Insert into database
  const { data: circular, error: dbError } = await supabase
    .from('circulars')
    .insert({
      title: formData.get('title'),
      circular_number: circularNumber,
      type: circularType,
      file_path: mainDocPath,
      file_name: mainDocument.name,
      file_size: mainDocument.size,
      annex_paths: annexPaths,
      applicable_for: formData.get('applicableFor'),
      issue_date: formData.get('issueDate'),
      primary_topic: formData.get('primaryTopic'),
      secondary_topic: formData.get('secondaryTopic'),
      status: formData.get('status'),
      notify_update: formData.get('notifyUpdate') === 'true',
      sb_compliance: formData.get('sbCompliance'),
      uploaded_by: user.id,
      // Map access level to min_role_tier and ministry_only
      // This logic depends on your access level dropdown
    })
    .select()
    .single();
  
  if (dbError) {
    // Rollback: delete uploaded files
    await supabase.storage.from('circulars').remove([mainDocPath, ...annexPaths]);
    throw new Error(`Database error: ${dbError.message}`);
  }
  
  // 7. Revalidate the circulars page
  revalidatePath('/circulars');
  
  return { success: true, circular };
}

// Helper function to get next circular number
export async function getNextCircularNumber(type: string) {
  const supabase = createServerClient();
  const year = new Date().getFullYear();
  
  const { data: latestCircular } = await supabase
    .from('circulars')
    .select('circular_number')
    .eq('type', type)
    .like('circular_number', `%/${year}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!latestCircular) {
    return `1/${year}`;
  }
  
  // Parse the number from format "15/2026" or "15a/2026"
  const match = latestCircular.circular_number.match(/^(\d+)/);
  if (match) {
    const nextNumber = parseInt(match[1]) + 1;
    return `${nextNumber}/${year}`;
  }
  
  return `1/${year}`;
}
```

**UI Component Structure:**

```tsx
// app/(dashboard)/admin/circulars/upload/page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { uploadCircular, getNextCircularNumber } from './actions';

export default function UploadCircularPage() {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedMainDoc, setSelectedMainDoc] = useState<File | null>(null);
  const [annexFiles, setAnnexFiles] = useState<File[]>([]);
  
  const form = useForm({
    resolver: zodResolver(circularUploadSchema),
    defaultValues: {
      notifyUpdate: true,
      status: 'valid'
    }
  });
  
  // Load suggested circular number on mount
  useEffect(() => {
    async function loadSuggestedNumber() {
      const circularType = form.watch('circularType');
      if (circularType) {
        const suggested = await getNextCircularNumber(circularType);
        form.setValue('circularNumber', suggested);
      }
    }
    loadSuggestedNumber();
  }, [form.watch('circularType')]);
  
  const handleMainDocumentSelect = (file: File) => {
    setSelectedMainDoc(file);
    setShowConfirmation(true);
  };
  
  const handleConfirmUpload = () => {
    setShowConfirmation(false);
    form.setValue('mainDocument', selectedMainDoc);
  };
  
  const handleSubmit = async (data: any) => {
    try {
      const formData = new FormData();
      // Append all form fields
      Object.keys(data).forEach(key => {
        if (key === 'mainDocument') {
          formData.append(key, data[key]);
        } else if (key === 'annexDocuments') {
          data[key].forEach((file: File) => {
            formData.append('annexDocuments', file);
          });
        } else {
          formData.append(key, data[key]);
        }
      });
      
      const result = await uploadCircular(formData);
      
      // Show success toast
      toast.success('Circular uploaded successfully!');
      
      // Redirect to circulars list
      router.push('/admin/circulars');
      
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Circular</h1>
      
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Applicable For */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Applicable For *
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="civil_service_and_sb"
                {...form.register('applicableFor')}
                className="mr-2"
              />
              Civil Service and Statutory Boards
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="civil_service_only"
                {...form.register('applicableFor')}
                className="mr-2"
              />
              Civil Service Only
            </label>
          </div>
        </div>
        
        {/* Circular Type */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Circular Type *
          </label>
          <select {...form.register('circularType')} className="w-full border rounded-md p-2">
            <option value="">Select type</option>
            <option value="hrl">HRL Circular</option>
            <option value="hr_ops">HR Ops Circular</option>
          </select>
        </div>
        
        {/* Circular Number with auto-suggest */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Circular Number *
          </label>
          <input
            type="text"
            {...form.register('circularNumber')}
            placeholder="e.g., 15/2026"
            className="w-full border rounded-md p-2"
          />
          <p className="text-sm text-gray-500 mt-1">
            Format: Number/Year (e.g., 15/2026)
          </p>
        </div>
        
        {/* Issue Date */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Issue Date *
          </label>
          <input
            type="date"
            {...form.register('issueDate')}
            className="w-full border rounded-md p-2"
          />
        </div>
        
        {/* Primary Topic */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Primary Topic *
          </label>
          <select {...form.register('primaryTopic')} className="w-full border rounded-md p-2">
            <option value="">Select topic</option>
            <option value="deployment">Deployment</option>
            <option value="hr_analytics">HR Analytics</option>
          </select>
        </div>
        
        {/* Secondary Topic */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Secondary Topic
          </label>
          <select {...form.register('secondaryTopic')} className="w-full border rounded-md p-2">
            <option value="">Select secondary topic (optional)</option>
            <option value="approving_authorities">Approving Authorities</option>
            <option value="awards_recognition">Awards & Recognition</option>
            {/* ... all 41 topics */}
          </select>
        </div>
        
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Circular Title *
          </label>
          <input
            type="text"
            {...form.register('title')}
            maxLength={255}
            className="w-full border rounded-md p-2"
          />
        </div>
        
        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Circular Status *
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="valid"
                {...form.register('status')}
                className="mr-2"
              />
              Valid
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="obsolete"
                {...form.register('status')}
                className="mr-2"
              />
              Obsolete
            </label>
          </div>
        </div>
        
        {/* Turn On Notification */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Turn On Notification
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="true"
                {...form.register('notifyUpdate')}
                className="mr-2"
                defaultChecked
              />
              Yes
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="false"
                {...form.register('notifyUpdate')}
                className="mr-2"
              />
              No
            </label>
          </div>
        </div>
        
        {/* SB Compliance */}
        <div>
          <label className="block text-sm font-medium mb-2">
            SB Compliance *
          </label>
          <select {...form.register('sbCompliance')} className="w-full border rounded-md p-2">
            <option value="">Select compliance</option>
            <option value="for_information">For Information</option>
            <option value="partial_compliance">Partial Compliance</option>
            <option value="full_compliance">Full Compliance</option>
          </select>
        </div>
        
        {/* Main Document Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload Circular Document *
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleMainDocumentSelect(file);
            }}
            className="w-full"
          />
          {selectedMainDoc && (
            <p className="text-sm text-gray-600 mt-2">
              Selected: {selectedMainDoc.name} ({(selectedMainDoc.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
        
        {/* Annex Documents Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload Annex Documents
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setAnnexFiles(prev => [...prev, ...files]);
              }}
              className="hidden"
              id="annex-upload"
            />
            <label htmlFor="annex-upload" className="cursor-pointer">
              <p className="text-gray-600">Drag and drop files here</p>
              <p className="text-gray-600">or click to browse</p>
              <p className="text-sm text-gray-500 mt-2">Accepted: PDF, DOC, DOCX</p>
              <p className="text-sm text-gray-500">Max size: 10MB per file</p>
            </label>
          </div>
          
          {annexFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {annexFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setAnnexFiles(prev => prev.filter((_, i) => i !== index))}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Related Circulars (Dynamic) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Related Circulars
          </label>
          {/* Implement dynamic row addition here */}
        </div>
        
        {/* Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Create
          </button>
        </div>
      </form>
      
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirm Upload</h3>
            <p className="mb-4">
              I confirm that I have indicated the classification of the circular 
              in the header and/or footer of the document.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              To note: HR Portal is classified as "Restricted/Non-sensitive"
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirmUpload}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
              >
                Yes, Proceed to Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Checklist:
- [ ] Upload form created with all required fields
- [ ] Auto-suggest circular number working
- [ ] Confirmation dialog implemented
- [ ] Main document upload working
- [ ] Annex documents upload working
- [ ] Form validation implemented
- [ ] Success/error handling working
- [ ] Files stored in correct Supabase Storage paths
- [ ] Database records created correctly
- [ ] Rollback working on errors

---

#### Phase 1.2: Resources Upload Form

**Location:** `/app/(dashboard)/admin/resources/upload/page.tsx`

**This is similar to Circular Upload but simpler. Follow the same pattern with these fields:**

1. Name (Text - Required, 255 char)
2. Title (Text - Optional, 255 char)
3. Topics (Dropdown - Required, from 41 topics list)
4. Category Type (Dropdown - Optional):
   - Advice, Agreement, Article, Calendar, Circular, FAQ, Form,
   - Guide, Internal, Legislation, Link, List, Media, Report,
   - Sharing, Slides, Speech, Template
5. Notify (Checkbox - Default: unchecked)
6. Upload Resource File (File - Required)
   - Accept: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
   - Max: 10MB

**Storage Path:** `resources/{topic}/{year}/{filename}`

#### Checklist:
- [ ] Resources upload form created
- [ ] File upload working
- [ ] Correct storage path
- [ ] Database insert working

---

#### Phase 1.3: HRL Meeting Materials Upload

**Location:** `/app/(dashboard)/admin/hrl-meetings/upload/page.tsx`

**Fields:**

1. Meeting Date (Date - Required)
2. Meeting Title (Text - Required)
3. Upload Documents (Multiple files):
   - Agenda
   - Presentation
   - Minutes
   - Other materials

**Storage Path:** `hrl-meetings/{year}/{meeting_id}/{filename}`

**Store in database as JSONB:**
```json
{
  "agenda": "path/to/agenda.pdf",
  "presentation": "path/to/presentation.pptx",
  "minutes": "path/to/minutes.docx",
  "other": ["path/to/other1.pdf", "path/to/other2.pdf"]
}
```

#### Checklist:
- [ ] HRL meeting upload form created
- [ ] Multiple document types handled
- [ ] JSONB storage working
- [ ] Files organized by meeting

---

### Phase 2: File Storage & Retrieval (Days 5-6)

**Goal:** Create utilities for file operations and signed URL generation

---

#### Phase 2.1: File Utilities

```typescript
// lib/storage/file-utils.ts

import { createServerClient } from '@/lib/supabase/server';

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
  const supabase = createServerClient();
  
  const { data, error } = await supabase.storage
    .from(options.bucket)
    .upload(options.path, options.file, {
      upsert: options.upsert || false
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
  const supabase = createServerClient();
  
  const { data, error } = await supabase.storage
    .from(options.bucket)
    .createSignedUrl(options.path, options.expiresIn || 3600);
  
  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string) {
  const supabase = createServerClient();
  
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
  const supabase = createServerClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove(paths);
  
  if (error) {
    throw new Error(`Batch file deletion failed: ${error.message}`);
  }
}

/**
 * Get file metadata (size, type, etc.)
 */
export async function getFileMetadata(bucket: string, path: string) {
  const supabase = createServerClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path.split('/').slice(0, -1).join('/'), {
      limit: 1,
      search: path.split('/').pop()
    });
  
  if (error || !data || data.length === 0) {
    throw new Error('File not found');
  }
  
  return data[0];
}
```

#### Phase 2.2: Access Control Functions

```typescript
// lib/storage/access-control.ts

import { createServerClient } from '@/lib/supabase/server';

/**
 * Check if user can access a circular
 */
export async function canAccessCircular(circularId: string) {
  const supabase = createServerClient();
  
  // This uses RLS policies, so just try to fetch
  // If user doesn't have access, it will return null
  const { data, error } = await supabase
    .from('circulars')
    .select('id, title, file_path, annex_paths')
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
  
  return await getSignedUrl({
    bucket: 'circulars',
    path: circular.file_path,
    expiresIn: 3600
  });
}

/**
 * Get signed URLs for all circular annexes
 */
export async function getCircularAnnexUrls(circularId: string) {
  const circular = await canAccessCircular(circularId);
  
  if (!circular || !circular.annex_paths) {
    return [];
  }
  
  const urls = await Promise.all(
    circular.annex_paths.map(async (path) => {
      const url = await getSignedUrl({
        bucket: 'circulars',
        path,
        expiresIn: 3600
      });
      
      return {
        path,
        url,
        filename: path.split('/').pop()
      };
    })
  );
  
  return urls;
}
```

#### Phase 2.3: Download Utilities

```typescript
// lib/storage/download-utils.ts

/**
 * Trigger browser download of a file
 */
export function downloadFile(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Create a ZIP file from multiple files
 * Requires: npm install jszip
 */
import JSZip from 'jszip';

export async function createZipFromUrls(files: Array<{ url: string; filename: string }>) {
  const zip = new JSZip();
  
  // Fetch all files and add to zip
  await Promise.all(
    files.map(async ({ url, filename }) => {
      const response = await fetch(url);
      const blob = await response.blob();
      zip.file(filename, blob);
    })
  );
  
  // Generate zip
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  return zipBlob;
}
```

#### Checklist:
- [ ] File upload utility created
- [ ] Signed URL generation working
- [ ] Access control functions implemented
- [ ] Delete file utilities working
- [ ] Download utilities created

---

### Phase 3: Frontend Display Pages (Days 7-10)

**Goal:** Build user-facing pages that match the current HR Portal screenshots

---

#### Phase 3.1: Circulars List Page

**Location:** `/app/(dashboard)/circulars/page.tsx`

**Reference:** Image 1 (your screenshot)

**Layout:**
- Left sidebar (330px fixed width) with filters
- Main content area with data table
- Top right: Print button
- Legend showing Valid/Obsolete status

**Implementation:**

```typescript
// app/(dashboard)/circulars/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CircularsPage() {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchCirculars();
  }, [selectedTopics, searchQuery]);
  
  async function fetchCirculars() {
    setLoading(true);
    const supabase = createClient();
    
    let query = supabase
      .from('circulars')
      .select('*')
      .order('issue_date', { ascending: false });
    
    // Apply topic filters
    if (selectedTopics.length > 0) {
      query = query.in('primary_topic', selectedTopics);
    }
    
    // Apply search
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,circular_number.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query;
    
    if (!error) {
      setCirculars(data || []);
    }
    
    setLoading(false);
  }
  
  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <aside className="w-[330px] bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          {/* Search Box */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search Circulars"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {/* Topics Filter */}
          <div>
            <button
              className="w-full flex items-center justify-between bg-[#17A2B8] text-white p-3 rounded-t-md"
              onClick={() => setShowTopics(!showTopics)}
            >
              <span className="font-semibold">Topics</span>
              <span>{showTopics ? '▲' : '▼'}</span>
            </button>
            
            {showTopics && (
              <div className="border border-t-0 border-gray-200 p-3 space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTopics.length === 0}
                    onChange={() => setSelectedTopics([])}
                    className="mr-2"
                  />
                  All Topics
                </label>
                
                {ALL_TOPICS.map(topic => (
                  <label key={topic.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTopics.includes(topic.value)}
                      onChange={() => {
                        setSelectedTopics(prev => 
                          prev.includes(topic.value)
                            ? prev.filter(t => t !== topic.value)
                            : [...prev, topic.value]
                        );
                      }}
                      className="mr-2"
                    />
                    {topic.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-[#17A2B8]">CIRCULARS</h1>
            
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              🖨️ Print This Page
            </button>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-end gap-4 mb-4 text-sm">
            <span className="font-medium">Key:</span>
            <span className="flex items-center gap-1">
              <span className="text-green-600">✓</span> Valid
            </span>
            <span className="flex items-center gap-1">
              <span className="text-red-600">✕</span> Obsolete
            </span>
          </div>
          
          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Year</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cir/Cir Min No.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Title</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SB Compliance</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : circulars.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No circulars found
                    </td>
                  </tr>
                ) : (
                  circulars.map((circular, index) => (
                    <tr
                      key={circular.id}
                      className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                      onClick={() => router.push(`/circulars/${circular.id}`)}
                    >
                      <td className="px-4 py-3 text-sm">
                        {new Date(circular.issue_date).getFullYear()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 rounded">
                          {circular.type === 'hrl' ? 'HRL Circular' : 
                           circular.type === 'hr_ops' ? 'HR Ops Circular' : 
                           'PSD Circular'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{circular.circular_number}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-[#17A2B8] hover:underline">
                          {circular.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">
                        {circular.sb_compliance?.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {circular.status === 'valid' ? (
                          <span className="text-green-600 text-lg">✓</span>
                        ) : (
                          <span className="text-red-600 text-lg">✕</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

const ALL_TOPICS = [
  { value: 'approving_authorities', label: 'Approving Authorities' },
  { value: 'awards_recognition', label: 'Awards & Recognition' },
  // ... all 41 topics
];
```

**Styling Requirements:**
- Primary teal: `#17A2B8`
- Striped table rows
- Hover effect on rows
- Status indicators (green ✓, red ✕)
- Clean, professional government look

#### Checklist:
- [ ] Circulars list page created
- [ ] Left sidebar with filters working
- [ ] Data table displaying circulars
- [ ] Search functionality working
- [ ] Topic filters working
- [ ] Styling matches screenshot
- [ ] RLS filtering applied
- [ ] Click to view detail working

---

#### Phase 3.2: Circular Detail Page

**Location:** `/app/(dashboard)/circulars/[id]/page.tsx`

**Reference:** Image 3 (your screenshot)

**Key Features:**
- Breadcrumb navigation
- Circular badge (colored)
- Metadata display
- Main content area
- **Yellow Annexes sidebar** (very important!)

**Implementation:**

```typescript
// app/(dashboard)/circulars/[id]/page.tsx

import { createServerClient } from '@/lib/supabase/server';
import { getCircularAnnexUrls } from '@/lib/storage/access-control';
import { notFound } from 'next/navigation';

export default async function CircularDetailPage({
  params
}: {
  params: { id: string }
}) {
  const supabase = createServerClient();
  
  // Fetch circular (RLS will filter based on user access)
  const { data: circular, error } = await supabase
    .from('circulars')
    .select('*')
    .eq('id', params.id)
    .single();
  
  if (error || !circular) {
    notFound();
  }
  
  // Get signed URLs for annexes
  const annexes = await getCircularAnnexUrls(params.id);
  
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-4">
          <a href="/" className="hover:text-[#17A2B8]">Home</a>
          <span className="mx-2">/</span>
          <a href="/circulars" className="hover:text-[#17A2B8]">Circulars</a>
          <span className="mx-2">/</span>
          <span>Circular Detail</span>
        </nav>
        
        {/* Back Link */}
        <a 
          href="/circulars" 
          className="inline-block text-[#17A2B8] hover:underline mb-6"
        >
          ← back to previous page
        </a>
        
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Circular Type Badge */}
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-[#17A2B8] text-white text-sm font-semibold rounded">
                • {circular.type === 'hrl' ? 'HRL Circular' : 
                    circular.type === 'hr_ops' ? 'HR Ops Circular' : 
                    'PSD Circular'}
              </span>
            </div>
            
            {/* Title */}
            <h1 className="text-3xl font-bold mb-4">
              {circular.title}
            </h1>
            
            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm mb-6">
              <span className="font-semibold">SB Compliance: {circular.sb_compliance?.replace('_', ' ')}</span>
              <span>|</span>
              <span className="flex items-center gap-1">
                <span className="font-semibold">Status:</span>
                {circular.status === 'valid' ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-600">✕</span>
                )}
              </span>
            </div>
            
            {/* Circular Number */}
            <p className="font-semibold mb-2">
              PMO (PSD) CIRCULAR NO. {circular.circular_number}
            </p>
            
            {/* Issue Date */}
            <p className="text-gray-700 mb-6">
              {new Date(circular.issue_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
            
            {/* Addressees */}
            <div className="mb-6">
              <p className="font-semibold mb-2">To:</p>
              <div className="ml-6">
                <p>All Permanent Secretaries</p>
                <p>Heads of Organs of State</p>
                <p>Heads of Departments and</p>
                <p>Chief Executive Officers of Statutory Boards</p>
                <p>(Distribution List D)</p>
              </div>
            </div>
            
            {/* Content Section */}
            <div className="prose max-w-none">
              <h2 className="text-xl font-bold mb-4">
                Updates on IM2R (Staff Records) Policies
              </h2>
              
              <h3 className="text-lg font-semibold mb-3">AIM</h3>
              
              <p className="mb-4">
                This circular sets out revisions to selected policies in the 
                Instruction Manual 2R on Staff Records (IM2R).
              </p>
              
              {/* Add more content sections as needed */}
              {/* You can store circular body content in the database 
                  or extract from PDF if needed */}
            </div>
          </div>
          
          {/* Annexes Sidebar - YELLOW BOX */}
          {annexes.length > 0 && (
            <aside className="w-80">
              <div className="bg-[#FFF4D4] border border-[#E5D4A0] rounded-lg p-6 sticky top-6">
                <h3 className="text-xl font-bold mb-4">Annexes</h3>
                
                <ul className="space-y-3">
                  {annexes.map((annex, index) => (
                    <li key={index}>
                      <a
                        href={annex.url}
                        download
                        className="flex items-start gap-2 text-[#17A2B8] hover:underline"
                      >
                        <span className="flex-shrink-0">•</span>
                        <span>{annex.filename}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
        
        {/* Print Button */}
        <div className="fixed top-4 right-4">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white rounded-md hover:bg-gray-50 shadow-sm"
          >
            🖨️ Print This Page
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Key Styling:**
- Yellow annexes box: `bg-[#FFF4D4]` with border `border-[#E5D4A0]`
- Teal links and badges: `#17A2B8`
- Proper typography hierarchy
- Sticky sidebar on scroll

#### Checklist:
- [ ] Circular detail page created
- [ ] Breadcrumb navigation working
- [ ] Circular badge displayed
- [ ] Metadata section styled correctly
- [ ] Main content area formatted
- [ ] Yellow annexes sidebar implemented
- [ ] Annexes links download correctly
- [ ] Print button working
- [ ] Access control enforced

---

#### Phase 3.3: HR Resources List Page

**Location:** `/app/(dashboard)/resources/page.tsx`

**Reference:** Image 2 (your screenshot)

**Similar to circulars page but with different columns:**

**Table Columns:**
- Checkbox (for bulk selection)
- Download icon
- Sort icon
- Type
- Topic
- Last Updated
- Title

**Additional Features:**
- Download button (batch download selected)
- Pagination controls
- Show XX entries dropdown

```typescript
// app/(dashboard)/resources/page.tsx

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [entriesPerPage, setEntriesPerPage] = useState(25);
  
  // Similar structure to circulars page
  
  const handleBulkDownload = async () => {
    // Create ZIP of selected resources
    const selectedResources = resources.filter(r => selectedIds.includes(r.id));
    
    const files = await Promise.all(
      selectedResources.map(async (resource) => {
        const url = await getSignedUrl({
          bucket: 'resources',
          path: resource.file_path,
          expiresIn: 3600
        });
        
        return {
          url,
          filename: resource.file_name
        };
      })
    );
    
    const zipBlob = await createZipFromUrls(files);
    
    // Trigger download
    const url = URL.createObjectURL(zipBlob);
    downloadFile(url, 'hr-resources.zip');
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="flex h-screen">
      {/* Similar sidebar and main layout */}
      
      {/* Top Download Button */}
      <button
        onClick={handleBulkDownload}
        disabled={selectedIds.length === 0}
        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
      >
        📥 Download
      </button>
      
      {/* Table with checkboxes */}
      <table className="w-full">
        <thead>
          <tr>
            <th className="w-10">
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(resources.map(r => r.id));
                  } else {
                    setSelectedIds([]);
                  }
                }}
              />
            </th>
            <th>Download</th>
            <th>Type</th>
            <th>Topic</th>
            <th>Last Updated</th>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={resource.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(resource.id)}
                  onChange={() => {
                    setSelectedIds(prev =>
                      prev.includes(resource.id)
                        ? prev.filter(id => id !== resource.id)
                        : [...prev, resource.id]
                    );
                  }}
                />
              </td>
              <td>
                <button onClick={() => downloadResource(resource.id)}>
                  📥
                </button>
              </td>
              <td>{resource.category_type}</td>
              <td>{resource.topic}</td>
              <td>{formatDate(resource.updated_at)}</td>
              <td>
                <a href={`/resources/${resource.id}`} className="text-[#17A2B8]">
                  {resource.title}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
            className="border rounded px-2 py-1"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm">entries</span>
        </div>
        
        <div className="text-sm text-gray-600">
          Showing {startIndex} to {endIndex} of {totalEntries} entries
        </div>
        
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded">Previous</button>
          <button className="px-3 py-1 bg-[#17A2B8] text-white rounded">1</button>
          <button className="px-3 py-1 border rounded">2</button>
          <button className="px-3 py-1 border rounded">3</button>
          <button className="px-3 py-1 border rounded">Next</button>
        </div>
      </div>
    </div>
  );
}
```

#### Checklist:
- [ ] Resources list page created
- [ ] Checkbox selection working
- [ ] Bulk download implemented
- [ ] Pagination working
- [ ] Show entries dropdown working
- [ ] Type and topic filters working
- [ ] Styling matches screenshot

---

### Phase 4: Styling & Polish (Days 11-12)

**Goal:** Make the UI match the professional look of the current HR Portal

---

#### Phase 4.1: Design System Constants

```typescript
// lib/design-system/colors.ts

export const colors = {
  // Primary
  primary: {
    teal: '#17A2B8',
    darkTeal: '#138496',
  },
  
  // Status
  status: {
    valid: '#28A745',
    obsolete: '#DC3545',
  },
  
  // Backgrounds
  bg: {
    annexes: '#FFF4D4',
    annexesBorder: '#E5D4A0',
    lightGray: '#F8F9FA',
    tableStripe: '#F9FAFB',
  },
  
  // Text
  text: {
    primary: '#2C3E50',
    secondary: '#6C757D',
    muted: '#ADB5BD',
  },
  
  // Borders
  border: {
    default: '#DEE2E6',
    light: '#E9ECEF',
  }
};
```

```typescript
// lib/design-system/typography.ts

export const typography = {
  headings: {
    h1: 'text-3xl font-bold text-gray-900',
    h2: 'text-2xl font-semibold text-gray-800',
    h3: 'text-xl font-semibold text-gray-800',
    h4: 'text-lg font-semibold text-gray-700',
  },
  
  body: {
    large: 'text-base text-gray-700',
    normal: 'text-sm text-gray-700',
    small: 'text-xs text-gray-600',
  },
  
  links: {
    primary: 'text-[#17A2B8] hover:underline',
    nav: 'text-gray-600 hover:text-[#17A2B8]',
  }
};
```

#### Phase 4.2: Reusable Components

**Status Badge Component:**

```typescript
// components/ui/status-badge.tsx

export function StatusBadge({ status }: { status: 'valid' | 'obsolete' }) {
  return (
    <span className={`inline-flex items-center ${
      status === 'valid' ? 'text-green-600' : 'text-red-600'
    }`}>
      {status === 'valid' ? '✓' : '✕'}
    </span>
  );
}
```

**Circular Type Badge:**

```typescript
// components/ui/circular-type-badge.tsx

export function CircularTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-block px-3 py-1 bg-[#17A2B8] text-white text-sm font-semibold rounded">
      • {type === 'hrl' ? 'HRL Circular' : 
         type === 'hr_ops' ? 'HR Ops Circular' : 
         'PSD Circular'}
    </span>
  );
}
```

**Annexes Sidebar Component:**

```typescript
// components/circulars/annexes-sidebar.tsx

export function AnnexesSidebar({ 
  annexes 
}: { 
  annexes: Array<{ url: string; filename: string }> 
}) {
  if (annexes.length === 0) return null;
  
  return (
    <aside className="w-80">
      <div className="bg-[#FFF4D4] border border-[#E5D4A0] rounded-lg p-6 sticky top-6">
        <h3 className="text-xl font-bold mb-4">Annexes</h3>
        
        <ul className="space-y-3">
          {annexes.map((annex, index) => (
            <li key={index}>
              <a
                href={annex.url}
                download
                className="flex items-start gap-2 text-[#17A2B8] hover:underline"
              >
                <span className="flex-shrink-0">•</span>
                <span>{annex.filename}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
```

#### Phase 4.3: Responsive Design

Ensure all pages work on:
- Desktop (1920x1080)
- Laptop (1440x900)
- Tablet (768x1024)
- Mobile (375x667)

**Responsive Sidebar:**

```typescript
// Make sidebar collapsible on mobile
const [sidebarOpen, setSidebarOpen] = useState(false);

// On mobile, show hamburger menu
// On desktop, show fixed sidebar
```

#### Phase 4.4: Loading States

```typescript
// components/ui/loading-spinner.tsx

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#17A2B8]"></div>
    </div>
  );
}
```

#### Phase 4.5: Error States

```typescript
// components/ui/error-message.tsx

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
      <p className="font-semibold">Error</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}
```

#### Checklist:
- [ ] Design system constants created
- [ ] Reusable components built
- [ ] Responsive design implemented
- [ ] Loading states added
- [ ] Error states handled
- [ ] Styling matches screenshots

---

### Phase 5: Testing & Refinement (Days 13-14)

**Goal:** Ensure everything works correctly across all user roles

---

#### Phase 5.1: Role-Based Testing

**Test Matrix:**

| Feature | System Admin | Portal Admin | Ministry HRL | SB HRL | HRL Rep | HR Officer |
|---------|-------------|--------------|--------------|--------|---------|------------|
| Upload HRL Circular | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Upload HR Ops | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| View HRL Circular | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| View HR Ops | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Ministry-Only | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Download Circular | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Upload Resources | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| View Resources | Role-based | Role-based | Role-based | Role-based | Role-based | Role-based |
| Upload HRL Meeting | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| View HRL Meeting | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |

**Test Steps:**

1. Create test users for each role
2. Login as each role
3. Verify they see correct content
4. Verify they can only perform allowed actions
5. Test edge cases (empty states, errors)

#### Phase 5.2: File Upload Testing

**Test Cases:**

1. **Valid Upload**
   - [ ] Upload PDF circular
   - [ ] Upload DOC circular
   - [ ] Upload DOCX circular
   - [ ] Upload with annexes
   - [ ] Verify files stored correctly
   - [ ] Verify database records created

2. **Invalid Upload**
   - [ ] Upload file too large (>10MB) → Error shown
   - [ ] Upload wrong file type → Error shown
   - [ ] Duplicate circular number → Error shown
   - [ ] Missing required field → Validation error

3. **Rollback Testing**
   - [ ] Simulate database failure after file upload
   - [ ] Verify files are deleted
   - [ ] Verify no orphaned files in storage

#### Phase 5.3: File Display Testing

**Test Cases:**

1. **List Views**
   - [ ] Circulars list displays correctly
   - [ ] Resources list displays correctly
   - [ ] Filters work correctly
   - [ ] Search works correctly
   - [ ] Pagination works

2. **Detail Views**
   - [ ] Circular detail page loads
   - [ ] Annexes sidebar displays
   - [ ] Download links work
   - [ ] Signed URLs valid for 1 hour
   - [ ] Print functionality works

3. **Access Control**
   - [ ] HR Officer cannot see HRL circulars
   - [ ] HRL can see HRL circulars
   - [ ] Ministry-only content filtered correctly
   - [ ] Unauthorized access returns 404

#### Phase 5.4: Performance Testing

**Benchmarks:**

- [ ] Page load < 2 seconds
- [ ] File upload (5MB) < 5 seconds
- [ ] List view with 100 items < 1 second
- [ ] Search response < 500ms
- [ ] Download link generation < 300ms

#### Phase 5.5: Bug Fixes

Create a list of bugs found and fix them:

1. Bug: ...
   - Fixed by: ...
2. Bug: ...
   - Fixed by: ...

#### Checklist:
- [ ] All roles tested
- [ ] File upload tested
- [ ] File display tested
- [ ] Access control verified
- [ ] Performance acceptable
- [ ] Bugs fixed

---

### Phase 6: Final Deployment & Documentation (Day 15)

**Goal:** Deploy to production and create handover documentation

---

#### Phase 6.1: Pre-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Supabase RLS policies reviewed
- [ ] Storage buckets properly configured
- [ ] Database indexes added for performance
- [ ] Error logging setup (Sentry?)
- [ ] Analytics setup (optional)

#### Phase 6.2: Deployment

```bash
# Push to main branch
git add .
git commit -m "feat: Add file upload and display functionality"
git push origin main

# Vercel will auto-deploy
# Check deployment logs
# Test production URL
```

#### Phase 6.3: Post-Deployment Testing

1. Test all features on production URL
2. Verify Supabase Storage working
3. Check that files upload/download correctly
4. Test with real user accounts
5. Monitor for errors

#### Phase 6.4: Documentation

Create documentation files:

1. **User Guide** (for Content Editors)
   - How to upload circulars
   - How to upload resources
   - How to manage files
   - Best practices

2. **Admin Guide** (for System Admins)
   - Storage bucket management
   - Database maintenance
   - Troubleshooting guide

3. **Developer Guide** (for future developers)
   - Architecture overview
   - Code structure
   - How to add new features
   - API reference

#### Checklist:
- [ ] Production deployment successful
- [ ] Post-deployment tests passing
- [ ] User guide created
- [ ] Admin guide created
- [ ] Developer guide created

---

## Reference Documentation

### Key Documents

1. **HR_Portal_Prototype_Specification.md** - Original prototype spec
2. **PSD_HR_Portal_FRS.pdf** - Functional requirements (in project knowledge)
3. **System_Administrator_User_Guide_v1_9.docx** - User guide (in project knowledge)

### Supabase Documentation

- [Storage Guide](https://supabase.com/docs/guides/storage)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Signed URLs](https://supabase.com/docs/guides/storage/signed-urls)

### Next.js Documentation

- [App Router](https://nextjs.org/docs/app)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [File Upload](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#handling-form-data)

---

## Success Criteria

### Must-Have Features ✅

- [x] Admin can upload circulars with annexes
- [x] Admin can upload resources
- [x] Admin can upload HRL meeting materials
- [x] Files stored in Supabase Storage
- [x] Files organized by type/year
- [x] Circulars list page displays correctly
- [x] Circular detail page with annexes sidebar
- [x] Resources list page displays correctly
- [x] Role-based access control working
- [x] Download functionality working
- [x] Styling matches current portal
- [x] Responsive design

### Nice-to-Have Features

- [ ] Bulk download ZIP
- [ ] File versioning
- [ ] Archive functionality
- [ ] Advanced search
- [ ] File preview modal

### Performance Targets

- Page load: < 2 seconds ✓
- File upload (5MB): < 5 seconds ✓
- Search response: < 500ms ✓
- Download link: < 300ms ✓

---

## Troubleshooting Guide

### Common Issues

**Issue: File upload fails with "Policy violation"**
- Solution: Check Supabase Storage policies
- Verify user is authenticated
- Check bucket permissions

**Issue: RLS not filtering circulars**
- Solution: Review RLS policies on `circulars` table
- Check user role_tier values
- Test with different user accounts

**Issue: Signed URLs expired**
- Solution: Increase `expiresIn` value
- Generate new URL on each page load
- Cache URLs with appropriate TTL

**Issue: Files not downloading**
- Solution: Check CORS settings in Supabase
- Verify signed URL is valid
- Check browser console for errors

**Issue: Upload rollback not working**
- Solution: Wrap upload in try-catch
- Ensure delete functions are called
- Check transaction handling

---

## Phase Completion Tracking

Use this checklist to track progress:

- [ ] **Phase 0: Preparation** (Day 1)
  - [ ] Storage buckets created
  - [ ] Policies added
  - [ ] Database updated
  - [ ] Manual test successful

- [ ] **Phase 1: Admin Upload Forms** (Days 2-4)
  - [ ] Circular upload form
  - [ ] Resources upload form
  - [ ] HRL meeting upload form
  - [ ] All validations working

- [ ] **Phase 2: File Storage** (Days 5-6)
  - [ ] Upload utilities
  - [ ] Download utilities
  - [ ] Access control functions
  - [ ] Error handling

- [ ] **Phase 3: Frontend Display** (Days 7-10)
  - [ ] Circulars list page
  - [ ] Circular detail page
  - [ ] Resources list page
  - [ ] All styling complete

- [ ] **Phase 4: Styling & Polish** (Days 11-12)
  - [ ] Design system
  - [ ] Reusable components
  - [ ] Responsive design
  - [ ] Loading/error states

- [ ] **Phase 5: Testing** (Days 13-14)
  - [ ] Role-based testing
  - [ ] File upload testing
  - [ ] Access control testing
  - [ ] Bug fixes

- [ ] **Phase 6: Deployment** (Day 15)
  - [ ] Production deployment
  - [ ] Documentation
  - [ ] Handover complete

---

## Next Steps After Implementation

1. **User Acceptance Testing**
   - Demo to DS Jamie
   - Gather feedback
   - Make adjustments

2. **Training**
   - Train content editors
   - Train portal admins
   - Create video tutorials

3. **Production Rollout**
   - Migrate from prototype to production
   - Import existing circulars
   - Set up monitoring

4. **Future Enhancements**
   - SGiD integration
   - Email notifications
   - Advanced analytics
   - Full-text search

---

## Contact & Support

For questions or issues during implementation:

1. Review this guide first
2. Check Supabase documentation
3. Review Next.js documentation
4. Check project knowledge documents

---

**Good luck with the implementation! Follow the phases step by step, and you'll have a fully functional file upload and display system that matches the professional look of the current HR Portal.**
