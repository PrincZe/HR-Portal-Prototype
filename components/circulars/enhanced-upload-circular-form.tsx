'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { User, PrimaryTopic } from '@/lib/types/database';
import { circularUploadSchema, CircularUploadFormValues } from '@/lib/schemas/circular-upload';
import { PRIMARY_TOPICS } from '@/lib/constants/topics';
import { deleteFiles } from '@/lib/storage/file-utils';
import { getAvailableTopicsForUser, canUploadCircularWithTopic } from '@/lib/access-control';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, RefreshCw, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import { Upload, Loader2, FileText, X, Plus } from 'lucide-react';
import { SECONDARY_TOPICS } from '@/lib/constants/topics';
import { TagInput } from '@/components/ui/tag-input';

interface EnhancedUploadCircularFormProps {
  user: User;
}

// File size limits
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const LARGE_FILE_WARNING_MB = 5;
const LARGE_FILE_WARNING_BYTES = LARGE_FILE_WARNING_MB * 1024 * 1024;

// Upload progress states
type UploadProgressState = 'idle' | 'validating' | 'uploading-document' | 'uploading-annexes' | 'saving' | 'complete';

export function EnhancedUploadCircularForm({ user }: EnhancedUploadCircularFormProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState>('idle');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedMainDoc, setSelectedMainDoc] = useState<File | null>(null);
  const [pendingMainDocFiles, setPendingMainDocFiles] = useState<FileList | null>(null);
  const [annexFiles, setAnnexFiles] = useState<File[]>([]);

  // AI Summary state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'extracting' | 'generating' | 'success' | 'error'>('idle');
  const [extractedText, setExtractedText] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // AI Tags state
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInputValue, setTagInputValue] = useState<string>('');

  // Determine if user is a Content Editor with topic restrictions
  const isContentEditor = user.roles?.name === 'content_editor';
  const assignedTopics = user.assigned_topics || [];

  // Get available topics for this user (Content Editors only see their assigned topics)
  const availableTopics = useMemo(() => {
    return getAvailableTopicsForUser(user, [...PRIMARY_TOPICS]);
  }, [user]);

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

  const handleConfirmUpload = async () => {
    if (pendingMainDocFiles) {
      form.setValue('main_document', pendingMainDocFiles);
      setPendingMainDocFiles(null);

      // Trigger AI summary generation for PDF files
      const file = pendingMainDocFiles[0];
      if (file && file.type === 'application/pdf') {
        await generateSummaryFromFile(file);
      }
    }
  };

  const generateSummaryFromFile = async (file: File) => {
    setIsGeneratingSummary(true);
    setSummaryStatus('extracting');
    setSummaryError(null);

    try {
      // File size validation
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setSummaryError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${MAX_FILE_SIZE_MB} MB. Text extraction skipped.`);
        setSummaryStatus('error');
        toast.warning(`File exceeds ${MAX_FILE_SIZE_MB} MB limit. You can add a summary manually.`);
        return;
      }

      // Large file warning
      if (file.size > LARGE_FILE_WARNING_BYTES) {
        toast.info(`Processing large file (${(file.size / 1024 / 1024).toFixed(1)} MB). This may take a moment...`);
      }

      // Send file to API for server-side processing
      const formData = new FormData();
      formData.append('file', file);

      setSummaryStatus('generating');
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        // Provide more specific error messages
        const errorMessage = result.error || '';
        let userMessage: string;

        if (errorMessage.toLowerCase().includes('encrypted') || errorMessage.toLowerCase().includes('password')) {
          userMessage = 'This PDF is password-protected. Please upload an unprotected version or add a summary manually.';
        } else if (errorMessage.toLowerCase().includes('corrupt') || errorMessage.toLowerCase().includes('invalid')) {
          userMessage = 'This PDF appears to be corrupted or invalid. Please try re-saving it or upload a different file.';
        } else if (errorMessage.toLowerCase().includes('scanned') || errorMessage.toLowerCase().includes('image')) {
          userMessage = 'Could not extract text from PDF. It may be scanned/image-based. Consider using OCR software first, or add a summary manually.';
        } else if (errorMessage.toLowerCase().includes('api key') || errorMessage.toLowerCase().includes('not configured')) {
          userMessage = 'AI service is not configured. Please contact support or add a summary manually.';
        } else {
          userMessage = result.error || 'Could not process PDF. You can add a summary manually.';
        }

        setSummaryError(userMessage);
        setSummaryStatus('error');
        toast.warning(userMessage);
        return;
      }

      // Store extracted text for potential regeneration
      if (result.extractedText) {
        setExtractedText(result.extractedText);
      }

      // Set AI summary
      if (result.summary) {
        setAiSummary(result.summary);
      }

      // Set suggested tags and auto-select them
      if (result.suggestedTags && result.suggestedTags.length > 0) {
        setSuggestedTags(result.suggestedTags);
        setSelectedTags(result.suggestedTags);
      }

      setSummaryStatus('success');
      toast.success('AI summary and tags generated successfully!');
    } catch (error) {
      console.error('Error generating summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific error types
      if (errorMessage.toLowerCase().includes('memory') || errorMessage.toLowerCase().includes('heap')) {
        setSummaryError('PDF is too complex to process. Please try a smaller file or add a summary manually.');
      } else {
        setSummaryError('An unexpected error occurred while generating the summary. Please try again or add one manually.');
      }

      setSummaryStatus('error');
      toast.error('Failed to generate AI summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!extractedText) {
      toast.error('No extracted text available. Please re-upload the PDF.');
      return;
    }

    setIsGeneratingSummary(true);
    setSummaryStatus('generating');
    setSummaryError(null);

    try {
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText }),
      });

      const result = await response.json();

      if (!result.success || !result.summary) {
        setSummaryError(result.error || 'Could not regenerate AI summary.');
        setSummaryStatus('error');
        toast.error('Failed to regenerate summary');
        return;
      }

      setAiSummary(result.summary);
      // Update suggested tags and merge with existing selections
      if (result.suggestedTags && result.suggestedTags.length > 0) {
        setSuggestedTags(result.suggestedTags);
        // Keep any manually added tags that are not in the new suggestions
        setSelectedTags(prev => {
          const manualTags = prev.filter(tag => !suggestedTags.includes(tag));
          return [...new Set([...result.suggestedTags, ...manualTags])];
        });
      }
      setSummaryStatus('success');
      toast.success('AI summary and tags regenerated!');
    } catch (error) {
      console.error('Error regenerating summary:', error);
      setSummaryError('An unexpected error occurred.');
      setSummaryStatus('error');
      toast.error('Failed to regenerate AI summary');
    } finally {
      setIsGeneratingSummary(false);
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
    // Validate topic access for Content Editors
    if (isContentEditor && values.primary_topic) {
      if (!canUploadCircularWithTopic(values.primary_topic, user)) {
        toast.error('You are not authorized to upload circulars for this topic');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress('validating');
    const uploadedPaths: string[] = [];

    try {
      const supabase = createClient();
      const mainFile = values.main_document[0];
      const year = new Date().getFullYear();

      // Validate file size
      if (mainFile.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File is too large (${(mainFile.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      }

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
      setUploadProgress('uploading-document');
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
      if (annexFiles.length > 0) {
        setUploadProgress('uploading-annexes');
      }
      const annexPaths: string[] = [];
      for (const annexFile of annexFiles) {
        // Validate annex file size
        if (annexFile.size > MAX_FILE_SIZE_BYTES) {
          await deleteFiles('circulars', uploadedPaths);
          throw new Error(`Attachment "${annexFile.name}" is too large (${(annexFile.size / 1024 / 1024).toFixed(1)} MB). Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
        }

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

      // Save circular record
      setUploadProgress('saving');

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
        secondary_topic: null,
        tags: selectedTags.length > 0 ? selectedTags : null,
        status: values.status,
        notify_update: values.notify_update,
        sb_compliance: values.sb_compliance,
        related_circulars: values.related_circulars || [],
        description: values.description || null,
        min_role_tier: values.min_role_tier ? parseInt(values.min_role_tier) : null,
        ministry_only: values.ministry_only,
        uploaded_by: user.id,
        ai_summary: aiSummary || null,
        extracted_content: extractedText || null,
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

      setUploadProgress('complete');

      // Show warning if no AI summary was generated
      if (!aiSummary || aiSummary.trim().length === 0) {
        toast.warning('Circular uploaded without AI summary. Search functionality may be limited for this circular.', {
          duration: 5000,
        });
      } else {
        toast.success('Circular uploaded successfully!');
      }

      router.push('/circulars');
      router.refresh();
    } catch (error: any) {
      console.error('Error uploading circular:', error);

      // Provide more specific error messages
      let errorMessage = error.message || 'Failed to upload circular';
      if (error.message?.includes('storage')) {
        errorMessage = 'Failed to upload file to storage. Please check your connection and try again.';
      } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
        errorMessage = 'You do not have permission to upload this circular.';
      } else if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress('idle');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Upload Circular</CardTitle>
        <CardDescription className="text-sm">
          Fill in all required fields and upload the circular document with any annexes
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* 1. Applicable For */}
            <FormField
              control={form.control}
              name="applicable_for"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applicable For *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cs_and_sb" id="cs_and_sb" />
                        <label htmlFor="cs_and_sb" className="text-sm font-normal cursor-pointer">
                          Civil Service and Statutory Boards
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cs_only" id="cs_only" />
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
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hrl" id="type_hrl" />
                        <label htmlFor="type_hrl" className="text-sm font-normal cursor-pointer">
                          HRL Circular
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hrops" id="type_hrops" />
                        <label htmlFor="type_hrops" className="text-sm font-normal cursor-pointer">
                          HR Ops Circular
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
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
                  {isContentEditor && (
                    <Alert className="mb-2 py-2">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        You can only upload circulars for your assigned topics: {assignedTopics.length > 0
                          ? availableTopics.map(t => t.label).join(', ')
                          : 'None assigned'}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select primary topic" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTopics.map((topic) => (
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

            {/* 6. Circular Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circular Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter circular title" {...field} maxLength={255} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 7. SB Compliance */}
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
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleMainDocumentSelect(e.target.files)}
                        {...field}
                      />
                      {selectedMainDoc && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 p-2 rounded-md">
                          <FileText className="h-4 w-4 text-[#17A2B8]" />
                          <span className="flex-1">{selectedMainDoc.name}</span>
                          <span>{(selectedMainDoc.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 12. Upload Annex Documents */}
            <div>
              <FormLabel>Attachments (Optional) {annexFiles.length > 0 && <span className="text-[#17A2B8]">- {annexFiles.length} file(s)</span>}</FormLabel>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-md p-3 text-center hover:border-[#17A2B8] transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx"
                  onChange={handleAnnexFilesChange}
                  className="hidden"
                  id="annex-upload"
                />
                <label htmlFor="annex-upload" className="cursor-pointer block">
                  <Upload className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-600 font-medium">
                    Click to add attachment files
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOC, DOCX • Max 10MB • Click multiple times to add more
                  </p>
                  {annexFiles.length > 0 && (
                    <p className="text-xs text-[#17A2B8] font-medium mt-1">
                      ✓ Click again to add more
                    </p>
                  )}
                </label>
              </div>

              {annexFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {annexFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#17A2B8]" />
                        <span className="text-sm truncate max-w-[300px]">{file.name}</span>
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
            <div className="space-y-3">
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

            {/* AI-Generated Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#17A2B8]" />
                    AI-Generated Summary
                  </FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Auto-generated from PDF content, editable
                  </p>
                </div>
                {extractedText && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateSummary}
                    disabled={isGeneratingSummary}
                    className="text-xs"
                  >
                    {isGeneratingSummary ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Regenerate
                  </Button>
                )}
              </div>

              {/* Status indicators */}
              {summaryStatus === 'extracting' && (
                <Alert className="py-2 bg-blue-50 border-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <AlertDescription className="text-sm text-blue-700">
                    Extracting text from PDF...
                  </AlertDescription>
                </Alert>
              )}

              {summaryStatus === 'generating' && (
                <Alert className="py-2 bg-blue-50 border-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <AlertDescription className="text-sm text-blue-700">
                    Generating AI summary...
                  </AlertDescription>
                </Alert>
              )}

              {summaryStatus === 'success' && !isGeneratingSummary && (
                <Alert className="py-2 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-700">
                    AI summary generated successfully!
                  </AlertDescription>
                </Alert>
              )}

              {summaryStatus === 'error' && summaryError && (
                <Alert className="py-2 bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-700">
                    {summaryError} You can add a summary manually below.
                  </AlertDescription>
                </Alert>
              )}

              <Textarea
                placeholder={
                  isGeneratingSummary
                    ? 'Generating summary...'
                    : 'AI summary will appear here after uploading a PDF. You can also write one manually.'
                }
                className="resize-none"
                rows={6}
                value={aiSummary}
                onChange={(e) => setAiSummary(e.target.value)}
                disabled={isGeneratingSummary}
              />
              <p className="text-xs text-muted-foreground">
                This summary helps users find this circular in search. It was auto-generated from the PDF content.
              </p>
            </div>

            {/* AI-Suggested Tags */}
            <div className="space-y-2">
              <div>
                <FormLabel className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#17A2B8]" />
                  Tags
                  {suggestedTags.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground">(AI-suggested)</span>
                  )}
                </FormLabel>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tags help categorize and search for this circular. AI suggests tags based on content.
                </p>
              </div>

              {/* Tag Input - AI suggested tags auto-added, type to add more */}
              <TagInput
                value={selectedTags}
                onChange={setSelectedTags}
                placeholder="Type a tag and press Enter..."
                disabled={isGeneratingSummary}
              />
            </div>

            {/* Warning if no AI summary */}
            {selectedMainDoc && !aiSummary && summaryStatus !== 'extracting' && summaryStatus !== 'generating' && (
              <Alert className="py-3 bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-700">
                  <strong>No AI summary available.</strong> This circular will have limited search visibility.
                  {summaryStatus === 'error' ? (
                    <> The AI summary generation failed. You can add a summary manually above.</>
                  ) : selectedMainDoc.type !== 'application/pdf' ? (
                    <> AI summaries are only auto-generated for PDF files. You can add one manually above.</>
                  ) : (
                    <> Click "Regenerate" above or add a summary manually to improve searchability.</>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={isUploading || isGeneratingSummary}
                className="bg-[#17A2B8] hover:bg-[#138496]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress === 'validating' && 'Validating...'}
                    {uploadProgress === 'uploading-document' && 'Uploading document...'}
                    {uploadProgress === 'uploading-annexes' && 'Uploading attachments...'}
                    {uploadProgress === 'saving' && 'Saving circular...'}
                    {uploadProgress === 'complete' && 'Complete!'}
                    {uploadProgress === 'idle' && 'Uploading...'}
                  </>
                ) : isGeneratingSummary ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {summaryStatus === 'extracting' && 'Extracting text...'}
                    {summaryStatus === 'generating' && 'Generating summary...'}
                    {summaryStatus !== 'extracting' && summaryStatus !== 'generating' && 'Processing...'}
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
                disabled={isUploading || isGeneratingSummary}
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
