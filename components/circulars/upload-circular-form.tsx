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
  year: z.string().min(4, 'Year is required').max(4, 'Year must be 4 digits'),
  type: z.enum(['hrl', 'hrops', 'psd', 'psd_minute'], {
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
  const [annexFiles, setAnnexFiles] = useState<File[]>([]);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      circular_number: '',
      year: new Date().getFullYear().toString(),
      description: '',
      ministry_only: false,
    },
  });

  const handleAnnexFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAnnexFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAnnexFile = (index: number) => {
    setAnnexFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: UploadFormValues) => {
    setIsUploading(true);
    const uploadedPaths: string[] = [];
    
    try {
      const supabase = createClient();
      const file = values.file[0];
      const year = values.year;

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${values.circular_number.replace(/\//g, '-')}.${fileExt}`;
      const filePath = `${values.type}/${year}/${values.circular_number}/${fileName}`;

      // Upload main file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('circulars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedPaths.push(filePath);

      // Upload annex documents
      const annexPaths: string[] = [];
      for (const annexFile of annexFiles) {
        const annexExt = annexFile.name.split('.').pop();
        const annexFileName = `${Date.now()}_${annexFile.name}`;
        const annexPath = `${values.type}/${year}/${values.circular_number}/annexes/${annexFileName}`;

        const { error: annexError } = await supabase.storage
          .from('circulars')
          .upload(annexPath, annexFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (annexError) {
          // Rollback: delete uploaded files
          await supabase.storage.from('circulars').remove(uploadedPaths);
          throw annexError;
        }

        annexPaths.push(annexPath);
        uploadedPaths.push(annexPath);
      }

      // Insert circular record
      const { error: insertError } = await supabase.from('circulars').insert({
        title: values.title,
        circular_number: values.circular_number,
        type: values.type,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        annex_paths: annexPaths,
        description: values.description || null,
        min_role_tier: values.min_role_tier ? parseInt(values.min_role_tier) : null,
        ministry_only: values.ministry_only,
        uploaded_by: user.id,
      });

      if (insertError) {
        // If insert fails, delete the uploaded files
        await supabase.storage.from('circulars').remove(uploadedPaths);
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
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="e.g., 2024" 
                      maxLength={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    The year this circular was issued (4 digits)
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
                      <SelectItem value="psd_minute">PSD Circular Minute</SelectItem>
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
                  <FormLabel>Main PDF Document</FormLabel>
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

            {/* Annex Documents Section */}
            <div className="space-y-4">
              <div>
                <FormLabel>Attachment Files (Optional) {annexFiles.length > 0 && `- ${annexFiles.length} file(s) added`}</FormLabel>
                <FormDescription>
                  Click to add attachment files. You can click multiple times to add more files.
                </FormDescription>
              </div>
              
              <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors">
                <label className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {annexFiles.length === 0 ? 'Click to add attachment files' : '✓ Click again to add more attachments'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, Word, Excel, or other document types
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="sr-only"
                    onChange={handleAnnexFilesChange}
                  />
                </label>
              </div>

              {annexFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Attachments:</p>
                  {annexFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAnnexFile(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
