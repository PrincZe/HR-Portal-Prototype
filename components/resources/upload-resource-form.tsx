'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { resourceUploadSchema, ResourceUploadFormValues } from '@/lib/schemas/resource-upload';
import { SECONDARY_TOPICS, RESOURCE_CATEGORY_TYPES } from '@/lib/constants/topics';
import { deleteFiles } from '@/lib/storage/file-utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, Loader2, FileText } from 'lucide-react';

interface UploadResourceFormProps {
  user: User;
}

export function UploadResourceForm({ user }: UploadResourceFormProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<ResourceUploadFormValues>({
    resolver: zodResolver(resourceUploadSchema),
    defaultValues: {
      notify: false,
      ministry_only: false,
    },
  });

  const onSubmit = async (values: ResourceUploadFormValues) => {
    setIsUploading(true);
    const uploadedPaths: string[] = [];

    try {
      const supabase = createClient();
      const file = values.file[0];
      const year = new Date().getFullYear();

      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${values.topic}/${year}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedPaths.push(filePath);

      // Insert resource record
      const { error: insertError } = await supabase.from('resources').insert({
        name: values.name,
        title: values.title || null,
        topic: values.topic,
        category_type: values.category_type || null,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        description: values.description || null,
        min_role_tier: values.min_role_tier ? parseInt(values.min_role_tier) : null,
        ministry_only: values.ministry_only,
        uploaded_by: user.id,
      });

      if (insertError) {
        // Rollback: delete uploaded file
        await deleteFiles('resources', uploadedPaths);
        throw insertError;
      }

      // Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'upload_resource',
        resource_type: 'resource',
        metadata: {
          name: values.name,
          topic: values.topic,
        },
      });

      toast.success('Resource uploaded successfully');
      router.push('/resources');
      router.refresh();
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      toast.error(error.message || 'Failed to upload resource');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Resource</CardTitle>
        <CardDescription>
          Upload a new HR resource file
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name (Required) */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter resource name" {...field} maxLength={255} />
                  </FormControl>
                  <FormDescription>Maximum 255 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title (Optional) */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter title (optional)" {...field} maxLength={255} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Topic (Required) */}
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SECONDARY_TOPICS.map((topic) => (
                        <SelectItem key={topic.value} value={topic.value}>
                          {topic.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Type (Optional) */}
            <FormField
              control={form.control}
              name="category_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RESOURCE_CATEGORY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload (Required) */}
            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Upload Resource File *</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                        onChange={(e) => {
                          onChange(e.target.files);
                          setSelectedFile(e.target.files?.[0] || null);
                        }}
                        {...field}
                      />
                      {selectedFile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                          <FileText className="h-4 w-4 text-[#17A2B8]" />
                          <span className="flex-1">{selectedFile.name}</span>
                          <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Max file size: 10MB. Accepted: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description (Optional) */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the resource..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notify (Checkbox) */}
            <FormField
              control={form.control}
              name="notify"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Notify Users</FormLabel>
                    <FormDescription>
                      Send notification when this resource is uploaded
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Access Control */}
            <div className="border-t pt-6 space-y-6">
              <h3 className="text-sm font-medium">Access Control</h3>

              <FormField
                control={form.control}
                name="min_role_tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Role Tier (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All users can access" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">System Admin</SelectItem>
                        <SelectItem value="2">Portal Admin</SelectItem>
                        <SelectItem value="3">HRL Ministry</SelectItem>
                        <SelectItem value="4">HRL Stat Board</SelectItem>
                        <SelectItem value="5">HRL Rep Ministry</SelectItem>
                        <SelectItem value="6">HRL Rep</SelectItem>
                        <SelectItem value="7">All Users</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Only users with this role tier or higher can access
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ministry_only"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Ministry Only</FormLabel>
                      <FormDescription>
                        Only users from ministries can access this resource
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={isUploading}
                className="bg-[#17A2B8] hover:bg-[#138496]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Resource
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
