'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, X } from 'lucide-react';
import { SECONDARY_TOPICS, RESOURCE_CATEGORY_TYPES } from '@/lib/constants/topics';
import { TagInput } from '@/components/ui/tag-input';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/zip',
  'application/x-zip-compressed',
];

const uploadSchema = z.object({
  applicable_for: z.enum(['civil_service_and_sb', 'civil_service_only'], {
    message: 'Please select who this resource applies to',
  }),
  circular_type: z.enum(['hrl', 'hrops'], {
    message: 'Please select a circular type',
  }),
  topic: z.string().min(1, 'Topic is required'),
  category_type: z.string().optional(),
  tags: z.array(z.string()).default([]),
  files: z
    .custom<FileList>()
    .refine((files) => files?.length > 0, 'Please select at least one file')
    .refine(
      (files) => Array.from(files).every(file => file.size <= MAX_FILE_SIZE),
      'Max file size is 50MB per file'
    )
    .refine(
      (files) => Array.from(files).every(file => ACCEPTED_FILE_TYPES.includes(file.type)),
      'Invalid file type. Accepted: PDF, Word, Excel, PowerPoint, CSV, Images, ZIP'
    ),
  min_role_tier: z.string().optional(),
  ministry_only: z.boolean().default(false),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface UploadResourcesFormProps {
  user: User;
}

interface FileUpload {
  file: File;
  title: string;
  description: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function UploadResourcesForm({ user }: UploadResourcesFormProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileUpload[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      topic: '',
      category_type: '',
      tags: [],
      ministry_only: false,
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles: FileUpload[] = Array.from(files).map(file => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      description: '',
      status: 'pending',
      progress: 0,
    }));

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileDetails = (index: number, field: 'title' | 'description', value: string) => {
    setSelectedFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, [field]: value } : file
    ));
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || 'file';
  };

  const onSubmit = async (values: UploadFormValues) => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setIsUploading(true);
    const supabase = createClient();
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const fileUpload = selectedFiles[i];
        
        // Update status to uploading
        setSelectedFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading' as const } : f
        ));

        try {
          const file = fileUpload.file;
          const fileExt = getFileExtension(file.name);
          const year = new Date().getFullYear();
          const fileName = `${Date.now()}_${fileUpload.title.replace(/[^a-z0-9]/gi, '_')}.${fileExt}`;
          const filePath = `${values.topic}/${year}/${fileName}`;

          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('resources')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) throw uploadError;

          // Insert resource record
          const { error: insertError } = await supabase.from('resources').insert({
            title: fileUpload.title,
            applicable_for: values.applicable_for,
            circular_type: values.circular_type,
            topic: values.topic,
            category_type: values.category_type || null,
            tags: values.tags,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            description: fileUpload.description || null,
            min_role_tier: values.min_role_tier ? parseInt(values.min_role_tier) : null,
            ministry_only: values.ministry_only,
            uploaded_by: user.id,
          });

          if (insertError) {
            // If insert fails, delete the uploaded file
            await supabase.storage.from('resources').remove([filePath]);
            throw insertError;
          }

          // Update status to success
          setSelectedFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'success' as const, progress: 100 } : f
          ));
          successCount++;

        } catch (error: any) {
          console.error(`Error uploading ${fileUpload.file.name}:`, error);
          setSelectedFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, status: 'error' as const, error: error.message } : f
          ));
          errorCount++;
        }

        // Update overall progress
        setOverallProgress(((i + 1) / selectedFiles.length) * 100);
      }

      // Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'upload_resources',
        resource_type: 'resource',
        metadata: {
          applicable_for: values.applicable_for,
          circular_type: values.circular_type,
          topic: values.topic,
          category_type: values.category_type,
          tags: values.tags,
          total_files: selectedFiles.length,
          success_count: successCount,
          error_count: errorCount,
        },
      });

      if (errorCount === 0) {
        toast.success(`Successfully uploaded ${successCount} resource(s)`);
        setTimeout(() => {
          router.push('/resources');
          router.refresh();
        }, 1500);
      } else if (successCount > 0) {
        toast.warning(`Uploaded ${successCount} resource(s), ${errorCount} failed`);
      } else {
        toast.error('Failed to upload resources');
      }

    } catch (error: any) {
      console.error('Error uploading resources:', error);
      toast.error(error.message || 'Failed to upload resources');
    } finally {
      setIsUploading(false);
    }
  };

  const roleTiers = [
    { value: '1', label: 'System Admin' },
    { value: '2', label: 'Portal Admin' },
    { value: '3', label: 'HRL Ministry' },
    { value: '4', label: 'HRL Stat Board' },
    { value: '5', label: 'HRL Rep Ministry' },
    { value: '6', label: 'HRL Rep' },
    { value: '7', label: 'All Users' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Upload</CardTitle>
        <CardDescription>Upload multiple files at once with shared settings</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Applicable For */}
            <FormField
              control={form.control}
              name="applicable_for"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applicable For *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="civil_service_and_sb" id="res_cs_and_sb" />
                        <label htmlFor="res_cs_and_sb" className="text-sm font-normal cursor-pointer">
                          Civil Service and Statutory Boards
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="civil_service_only" id="res_cs_only" />
                        <label htmlFor="res_cs_only" className="text-sm font-normal cursor-pointer">
                          Civil Service Only
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Circular Type */}
            <FormField
              control={form.control}
              name="circular_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circular Type *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hrl" id="res_type_hrl" />
                        <label htmlFor="res_type_hrl" className="text-sm font-normal cursor-pointer">
                          HRL Circular
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hrops" id="res_type_hrops" />
                        <label htmlFor="res_type_hrops" className="text-sm font-normal cursor-pointer">
                          HR Ops Circular
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Topic Selection */}
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {SECONDARY_TOPICS.map((topic) => (
                        <SelectItem key={topic.value} value={topic.value}>
                          {topic.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    All uploaded files will be organized under this topic
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Type Selection (Optional) */}
            <FormField
              control={form.control}
              name="category_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Type (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {RESOURCE_CATEGORY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Additional categorization for resources (e.g., Form, Guide, Template)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Add tags..."
                      disabled={isUploading}
                    />
                  </FormControl>
                  <FormDescription>
                    Add keywords to help users find this resource
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Selection */}
            <FormField
              control={form.control}
              name="files"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Files</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.jpg,.jpeg,.png,.gif,.zip"
                      onChange={(e) => {
                        onChange(e.target.files);
                        handleFileSelect(e.target.files);
                      }}
                      disabled={isUploading}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Max 50MB per file. Accepted: PDF, Word, Excel, PowerPoint, CSV, Images, ZIP
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Selected Files ({selectedFiles.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedFiles.map((fileUpload, index) => (
                    <Card key={index} className={`p-4 ${
                      fileUpload.status === 'success' ? 'border-green-500' :
                      fileUpload.status === 'error' ? 'border-red-500' :
                      fileUpload.status === 'uploading' ? 'border-blue-500' : ''
                    }`}>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <Input
                              placeholder="Title"
                              value={fileUpload.title}
                              onChange={(e) => updateFileDetails(index, 'title', e.target.value)}
                              disabled={isUploading}
                              className="font-medium"
                            />
                            <Input
                              placeholder="Description (optional)"
                              value={fileUpload.description}
                              onChange={(e) => updateFileDetails(index, 'description', e.target.value)}
                              disabled={isUploading}
                            />
                            <p className="text-xs text-muted-foreground">
                              {fileUpload.file.name} • {(fileUpload.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            {fileUpload.status === 'uploading' && (
                              <Progress value={fileUpload.progress} className="h-2" />
                            )}
                            {fileUpload.status === 'error' && (
                              <p className="text-xs text-red-600">{fileUpload.error}</p>
                            )}
                            {fileUpload.status === 'success' && (
                              <p className="text-xs text-green-600">✓ Uploaded successfully</p>
                            )}
                          </div>
                          {!isUploading && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Access Control */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-4">Access Control (applies to all files)</h3>

              <FormField
                control={form.control}
                name="min_role_tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Role Tier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select minimum role (leave empty for all users)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleTiers.map((tier) => (
                          <SelectItem key={tier.value} value={tier.value}>
                            {tier.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ministry_only"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Ministry Only</FormLabel>
                      <FormDescription>
                        Only users from ministries can access these resources
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Overall Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isUploading || selectedFiles.length === 0}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading {selectedFiles.filter(f => f.status === 'uploading' || f.status === 'pending').length} file(s)...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {selectedFiles.length} Resource(s)
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
