'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { circularUploadSchema, CircularUploadFormValues } from '@/lib/schemas/circular-upload';
import { PRIMARY_TOPICS, SECONDARY_TOPICS } from '@/lib/constants/topics';
import { deleteFiles } from '@/lib/storage/file-utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, X, Plus } from 'lucide-react';

interface EnhancedUploadCircularFormProps {
  user: User;
}

export function EnhancedUploadCircularForm({ user }: EnhancedUploadCircularFormProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedMainDoc, setSelectedMainDoc] = useState<File | null>(null);
  const [pendingMainDocFiles, setPendingMainDocFiles] = useState<FileList | null>(null);
  const [annexFiles, setAnnexFiles] = useState<File[]>([]);

  const form = useForm<CircularUploadFormValues>({
    resolver: zodResolver(circularUploadSchema),
    defaultValues: {
      notify_update: true,
      status: 'valid',
      ministry_only: false,
      related_circulars: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'related_circulars',
  });

  // Auto-suggest next circular number when type changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'type' && value.type) {
        fetchNextCircularNumber(value.type);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  async function fetchNextCircularNumber(type: string) {
    try {
      const supabase = createClient();
      const year = new Date().getFullYear();
      
      const { data } = await supabase
        .from('circulars')
        .select('circular_number')
        .eq('type', type)
        .like('circular_number', `%/${year}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        const match = data.circular_number.match(/^(\d+)/);
        if (match) {
          const nextNumber = parseInt(match[1]) + 1;
          form.setValue('circular_number', `${nextNumber}/${year}`);
          return;
        }
      }
      
      // No existing circulars, start with 1
      form.setValue('circular_number', `1/${year}`);
    } catch (error) {
      // If no circulars exist, start with 1
      const year = new Date().getFullYear();
      form.setValue('circular_number', `1/${year}`);
    }
  }

  const handleMainDocumentSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      setPendingMainDocFiles(files);
      setSelectedMainDoc(files[0]);
      setShowConfirmation(true);
    }
  };

  const handleConfirmUpload = () => {
    if (pendingMainDocFiles) {
      form.setValue('main_document', pendingMainDocFiles);
      setPendingMainDocFiles(null);
    }
  };

  const handleAnnexFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAnnexFiles((prev) => [...prev, ...files]);
    // Reset the input so user can select more files
    e.target.value = '';
  };

  const removeAnnexFile = (index: number) => {
    setAnnexFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: CircularUploadFormValues) => {
    setIsUploading(true);
    const uploadedPaths: string[] = [];

    try {
      const supabase = createClient();
      const mainFile = values.main_document[0];
      const year = new Date().getFullYear();

      // Check if circular number already exists
      const { data: existing } = await supabase
        .from('circulars')
        .select('id')
        .eq('circular_number', values.circular_number)
        .single();

      if (existing) {
        throw new Error(`Circular number ${values.circular_number} already exists`);
      }

      // Generate file path for main document
      const mainFileExt = mainFile.name.split('.').pop();
      const mainFileName = `${values.circular_number.replace(/\//g, '-')}.${mainFileExt}`;
      const mainFilePath = `${values.type}/${year}/${values.circular_number}/${mainFileName}`;

      // Upload main document
      const { error: mainUploadError } = await supabase.storage
        .from('circulars')
        .upload(mainFilePath, mainFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (mainUploadError) throw mainUploadError;
      uploadedPaths.push(mainFilePath);

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
          await deleteFiles('circulars', uploadedPaths);
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
        file_path: mainFilePath,
        file_name: mainFile.name,
        file_size: mainFile.size,
        annex_paths: annexPaths,
        applicable_for: values.applicable_for,
        issue_date: values.issue_date,
        primary_topic: values.primary_topic,
        secondary_topic: values.secondary_topic || null,
        status: values.status,
        notify_update: values.notify_update,
        sb_compliance: values.sb_compliance,
        related_circulars: values.related_circulars || [],
        description: values.description || null,
        min_role_tier: values.min_role_tier ? parseInt(values.min_role_tier) : null,
        ministry_only: values.ministry_only,
        uploaded_by: user.id,
      });

      if (insertError) {
        // Rollback: delete uploaded files
        await deleteFiles('circulars', uploadedPaths);
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
          has_annexes: annexPaths.length > 0,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Circular</CardTitle>
        <CardDescription>
          Fill in all required fields and upload the circular document with any annexes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* 1. Applicable For */}
            <FormField
              control={form.control}
              name="applicable_for"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Applicable For *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="civil_service_and_sb" id="cs_and_sb" />
                        <label htmlFor="cs_and_sb" className="text-sm font-normal cursor-pointer">
                          Civil Service and Statutory Boards
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="civil_service_only" id="cs_only" />
                        <label htmlFor="cs_only" className="text-sm font-normal cursor-pointer">
                          Civil Service Only
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 2. Circular Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circular Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select circular type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hrl">HRL Circular</SelectItem>
                      <SelectItem value="hrops">HR Ops Circular</SelectItem>
                      <SelectItem value="psd">PSD Circular</SelectItem>
                      <SelectItem value="psd_minute">PSD Circular Minute</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 3. Circular Number */}
            <FormField
              control={form.control}
              name="circular_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circular Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 15/2026" {...field} />
                  </FormControl>
                  <FormDescription>
                    Format: NUMBER/YEAR (e.g., 15/2026). Auto-suggested based on type.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 4. Issue Date */}
            <FormField
              control={form.control}
              name="issue_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>The date this circular was issued</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 5. Primary Topic */}
            <FormField
              control={form.control}
              name="primary_topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Topic *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRIMARY_TOPICS.map((topic) => (
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

            {/* 6. Secondary Topic */}
            <FormField
              control={form.control}
              name="secondary_topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secondary Topic</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select secondary topic (optional)" />
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

            {/* 7. Circular Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circular Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter circular title" {...field} maxLength={255} />
                  </FormControl>
                  <FormDescription>Maximum 255 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 8. Circular Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Circular Status *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="valid" id="status_valid" />
                        <label htmlFor="status_valid" className="text-sm font-normal cursor-pointer">
                          Valid
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="obsolete" id="status_obsolete" />
                        <label htmlFor="status_obsolete" className="text-sm font-normal cursor-pointer">
                          Obsolete
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 9. Turn On Notification */}
            <FormField
              control={form.control}
              name="notify_update"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Turn On Notification</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => field.onChange(value === 'true')}
                      value={field.value ? 'true' : 'false'}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="notify_yes" />
                        <label htmlFor="notify_yes" className="text-sm font-normal cursor-pointer">
                          Yes
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="notify_no" />
                        <label htmlFor="notify_no" className="text-sm font-normal cursor-pointer">
                          No
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Notify users when this circular is uploaded
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 10. SB Compliance */}
            <FormField
              control={form.control}
              name="sb_compliance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SB Compliance *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select SB compliance level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="for_information">For Information</SelectItem>
                      <SelectItem value="partial_compliance">Partial Compliance</SelectItem>
                      <SelectItem value="full_compliance">Full Compliance</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 11. Upload Main Circular Document */}
            <FormField
              control={form.control}
              name="main_document"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Upload Circular Document *</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleMainDocumentSelect(e.target.files)}
                        {...field}
                      />
                      {selectedMainDoc && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                          <FileText className="h-4 w-4 text-[#17A2B8]" />
                          <span className="flex-1">{selectedMainDoc.name}</span>
                          <span>{(selectedMainDoc.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Max file size: 10MB. Accepted formats: PDF, DOC, DOCX
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 12. Upload Annex Documents */}
            <div>
              <FormLabel>Upload Annex Documents (Optional)</FormLabel>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-[#17A2B8] transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={handleAnnexFilesChange}
                  className="hidden"
                  id="annex-upload"
                />
                <label htmlFor="annex-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Drag and drop files here</p>
                  <p className="text-sm text-gray-500">or click to browse</p>
                  <p className="text-xs text-gray-400 mt-2">Accepted: PDF, DOC, DOCX • Max: 10MB per file</p>
                </label>
              </div>

              {annexFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">{annexFiles.length} annex file(s) selected:</p>
                  {annexFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#17A2B8]" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAnnexFile(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 13 & 14. Related Circulars */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Related Circulars (Optional)</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ title: '', url: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Related Circular
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Related circular title"
                      {...form.register(`related_circulars.${index}.title`)}
                    />
                    <Input
                      placeholder="Related circular URL"
                      type="url"
                      {...form.register(`related_circulars.${index}.url`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Optional Description */}
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
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
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
                        Only users from ministries can access this circular
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
                    Create Circular
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

        {/* Classification Confirmation Dialog */}
        <ConfirmationDialog
          open={showConfirmation}
          onOpenChange={setShowConfirmation}
          onConfirm={handleConfirmUpload}
        />
      </CardContent>
    </Card>
  );
}
