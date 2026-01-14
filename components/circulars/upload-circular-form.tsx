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
import { toast } from 'sonner';
import { Upload, Loader2, FileText } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['application/pdf'];

const uploadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  circular_number: z.string().min(1, 'Circular number is required'),
  type: z.enum(['hrl', 'hrops', 'psd'], {
    message: 'Please select a circular type',
  }),
  description: z.string().optional(),
  file: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, 'Please select a file')
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, 'Max file size is 10MB')
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      'Only PDF files are accepted'
    ),
  min_role_tier: z.string().optional(),
  ministry_only: z.boolean().default(false),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface UploadCircularFormProps {
  user: User;
}

export function UploadCircularForm({ user }: UploadCircularFormProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      circular_number: '',
      description: '',
      ministry_only: false,
    },
  });

  const onSubmit = async (values: UploadFormValues) => {
    setIsUploading(true);
    try {
      const supabase = createClient();
      const file = values.file[0];

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${values.circular_number.replace(/\//g, '-')}.${fileExt}`;
      const filePath = `${values.type}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('circulars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert circular record
      const { error: insertError } = await supabase.from('circulars').insert({
        title: values.title,
        circular_number: values.circular_number,
        type: values.type,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        description: values.description || null,
        min_role_tier: values.min_role_tier ? parseInt(values.min_role_tier) : null,
        ministry_only: values.ministry_only,
        uploaded_by: user.id,
      });

      if (insertError) {
        // If insert fails, delete the uploaded file
        await supabase.storage.from('circulars').remove([filePath]);
        throw insertError;
      }

      // Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'upload_circular',
        resource_type: 'circular',
        metadata: {
          circular_number: values.circular_number,
          type: values.type,
        },
      });

      toast.success('Circular uploaded successfully');
      router.push('/circulars');
      router.refresh();
    } catch (error: any) {
      console.error('Error uploading circular:', error);
      toast.error(error.message || 'Failed to upload circular');
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
        <CardTitle>Circular Details</CardTitle>
        <CardDescription>Fill in the details and upload the PDF file</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Annual Leave Policy Update" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="circular_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circular Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., HRL/2024/001" {...field} />
                  </FormControl>
                  <FormDescription>
                    Format: TYPE/YEAR/NUMBER (e.g., HRL/2024/001)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select circular type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hrl">HRL Circular</SelectItem>
                      <SelectItem value="hrops">HR OPS Circular</SelectItem>
                      <SelectItem value="psd">PSD Circular</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the circular..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>PDF File</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          onChange(e.target.files);
                          setSelectedFile(e.target.files?.[0] || null);
                        }}
                        {...field}
                      />
                      {selectedFile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>Max file size: 10MB. PDF only.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-4">Access Control</h3>

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
                    <FormDescription>
                      Only users with this role tier or higher can access this circular
                    </FormDescription>
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
                        Only users from ministries can access this circular
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Circular
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
