'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { hrlMeetingUploadSchema, HRLMeetingUploadFormValues } from '@/lib/schemas/hrl-meeting-upload';
import { deleteFiles } from '@/lib/storage/file-utils';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, X } from 'lucide-react';

interface UploadMeetingFormProps {
  user: User;
}

export function UploadMeetingForm({ user }: UploadMeetingFormProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{
    agenda?: File;
    presentation?: File;
    minutes?: File;
    other?: File[];
  }>({});

  const form = useForm<HRLMeetingUploadFormValues>({
    resolver: zodResolver(hrlMeetingUploadSchema),
    defaultValues: {},
  });

  const handleFileChange = (type: 'agenda' | 'presentation' | 'minutes', files: FileList | null) => {
    if (files && files.length > 0) {
      setSelectedFiles(prev => ({ ...prev, [type]: files[0] }));
    }
  };

  const handleOtherFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => ({
      ...prev,
      other: [...(prev.other || []), ...files],
    }));
  };

  const removeOtherFile = (index: number) => {
    setSelectedFiles(prev => ({
      ...prev,
      other: prev.other?.filter((_, i) => i !== index) || [],
    }));
  };

  const onSubmit = async (values: HRLMeetingUploadFormValues) => {
    setIsUploading(true);
    const uploadedPaths: string[] = [];

    try {
      const supabase = createClient();
      const year = new Date(values.meeting_date).getFullYear();
      const meetingId = `${Date.now()}`;
      
      // Store document paths as JSONB
      const documentPaths: Record<string, string | string[]> = {};

      // Upload agenda
      if (values.agenda && values.agenda.length > 0) {
        const file = values.agenda[0];
        const filePath = `${year}/${meetingId}/agenda_${file.name}`;
        
        const { error } = await supabase.storage
          .from('hrl-meetings')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;
        uploadedPaths.push(filePath);
        documentPaths.agenda = filePath;
      }

      // Upload presentation
      if (values.presentation && values.presentation.length > 0) {
        const file = values.presentation[0];
        const filePath = `${year}/${meetingId}/presentation_${file.name}`;
        
        const { error } = await supabase.storage
          .from('hrl-meetings')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          await deleteFiles('hrl-meetings', uploadedPaths);
          throw error;
        }
        uploadedPaths.push(filePath);
        documentPaths.presentation = filePath;
      }

      // Upload minutes
      if (values.minutes && values.minutes.length > 0) {
        const file = values.minutes[0];
        const filePath = `${year}/${meetingId}/minutes_${file.name}`;
        
        const { error } = await supabase.storage
          .from('hrl-meetings')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          await deleteFiles('hrl-meetings', uploadedPaths);
          throw error;
        }
        uploadedPaths.push(filePath);
        documentPaths.minutes = filePath;
      }

      // Upload other documents
      if (values.other_documents && values.other_documents.length > 0) {
        const otherPaths: string[] = [];
        
        for (let i = 0; i < values.other_documents.length; i++) {
          const file = values.other_documents[i];
          const filePath = `${year}/${meetingId}/other_${file.name}`;
          
          const { error } = await supabase.storage
            .from('hrl-meetings')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (error) {
            await deleteFiles('hrl-meetings', uploadedPaths);
            throw error;
          }
          uploadedPaths.push(filePath);
          otherPaths.push(filePath);
        }

        if (otherPaths.length > 0) {
          documentPaths.other = otherPaths;
        }
      }

      // Insert meeting record
      const { error: insertError } = await supabase.from('hrl_meetings').insert({
        meeting_date: values.meeting_date,
        title: values.title,
        description: values.description || null,
        document_paths: documentPaths,
        // Store first file path as file_path for compatibility
        file_path: documentPaths.agenda || documentPaths.presentation || documentPaths.minutes || Object.values(documentPaths)[0] as string || '',
        file_name: values.title,
        file_size: null,
        uploaded_by: user.id,
      });

      if (insertError) {
        // Rollback: delete uploaded files
        await deleteFiles('hrl-meetings', uploadedPaths);
        throw insertError;
      }

      // Log action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'upload_hrl_meeting',
        resource_type: 'hrl_meeting',
        metadata: {
          meeting_date: values.meeting_date,
          title: values.title,
          document_count: uploadedPaths.length,
        },
      });

      toast.success('HRL meeting uploaded successfully');
      router.push('/hrl-meetings');
      router.refresh();
    } catch (error: any) {
      console.error('Error uploading HRL meeting:', error);
      toast.error(error.message || 'Failed to upload HRL meeting');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload HRL Meeting Materials</CardTitle>
        <CardDescription>
          Upload meeting agenda, presentation, minutes, and other documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Meeting Date (Required) */}
            <FormField
              control={form.control}
              name="meeting_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>The date of the HRL meeting</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meeting Title (Required) */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., HRL Meeting Q1 2026" {...field} maxLength={255} />
                  </FormControl>
                  <FormDescription>Maximum 255 characters</FormDescription>
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
                      placeholder="Brief description of the meeting..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-6 space-y-6">
              <h3 className="text-sm font-medium">Upload Documents</h3>
              <p className="text-sm text-gray-600">
                Upload meeting documents below. All files are optional.
              </p>

              {/* Agenda */}
              <FormField
                control={form.control}
                name="agenda"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Agenda</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange('agenda', e.target.files);
                          }}
                          {...field}
                        />
                        {selectedFiles.agenda && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                            <FileText className="h-4 w-4 text-[#17A2B8]" />
                            <span className="flex-1">{selectedFiles.agenda.name}</span>
                            <span className="text-xs">
                              {(selectedFiles.agenda.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Presentation */}
              <FormField
                control={form.control}
                name="presentation"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Presentation</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".pdf,.ppt,.pptx"
                          onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange('presentation', e.target.files);
                          }}
                          {...field}
                        />
                        {selectedFiles.presentation && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                            <FileText className="h-4 w-4 text-[#17A2B8]" />
                            <span className="flex-1">{selectedFiles.presentation.name}</span>
                            <span className="text-xs">
                              {(selectedFiles.presentation.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Minutes */}
              <FormField
                control={form.control}
                name="minutes"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Minutes</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange('minutes', e.target.files);
                          }}
                          {...field}
                        />
                        {selectedFiles.minutes && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                            <FileText className="h-4 w-4 text-[#17A2B8]" />
                            <span className="flex-1">{selectedFiles.minutes.name}</span>
                            <span className="text-xs">
                              {(selectedFiles.minutes.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Other Documents */}
              <div>
                <FormLabel>Other Documents</FormLabel>
                <div className="mt-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={handleOtherFilesChange}
                    className="hidden"
                    id="other-docs"
                  />
                  <label
                    htmlFor="other-docs"
                    className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 cursor-pointer hover:border-[#17A2B8] transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to upload additional documents</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, PPT, PPTX</p>
                    </div>
                  </label>
                </div>

                {selectedFiles.other && selectedFiles.other.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">{selectedFiles.other.length} file(s) selected:</p>
                    {selectedFiles.other.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
                      >
                        <div className="flex items-center gap-2 flex-1">
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
                          onClick={() => removeOtherFile(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                    Upload Meeting
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
