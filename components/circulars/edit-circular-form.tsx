'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { SECONDARY_TOPICS } from '@/lib/constants/topics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, Save, X } from 'lucide-react';
import Link from 'next/link';

const editCircularSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must not exceed 255 characters'),
  circular_number: z.string().min(1, 'Circular number is required')
    .regex(/^\d+[a-z]?\/\d{4}$/, 'Format must be: NUMBER/YEAR (e.g., 15/2026)'),
  issue_date: z.string().min(1, 'Issue date is required'),
  primary_topic: z.string().min(1, 'Primary topic is required'),
  status: z.enum(['valid', 'obsolete'], {
    message: 'Please select a status',
  }),
  description: z.string().optional(),
  applicable_for: z.enum(['civil_service_and_sb', 'civil_service_only'], {
    message: 'Please select who this circular applies to',
  }),
  sb_compliance: z.enum(['for_information', 'partial_compliance', 'full_compliance'], {
    message: 'Please select SB compliance level',
  }),
});

type EditCircularFormValues = z.infer<typeof editCircularSchema>;

interface EditCircularFormProps {
  user: User;
  circular: any;
}

export function EditCircularForm({ user, circular }: EditCircularFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<EditCircularFormValues>({
    resolver: zodResolver(editCircularSchema),
    defaultValues: {
      title: circular.title || '',
      circular_number: circular.circular_number || '',
      issue_date: circular.issue_date || '',
      primary_topic: circular.primary_topic || '',
      status: circular.status || 'valid',
      description: circular.description || '',
      applicable_for: circular.applicable_for || undefined,
      sb_compliance: circular.sb_compliance || undefined,
    },
  });

  const onSubmit = async (values: EditCircularFormValues) => {
    setIsSaving(true);
    try {
      const supabase = createClient();

      // Update circular record
      const { error: updateError } = await supabase
        .from('circulars')
        .update({
          title: values.title,
          circular_number: values.circular_number,
          issue_date: values.issue_date,
          primary_topic: values.primary_topic,
          secondary_topic: null,
          status: values.status,
          description: values.description || null,
          applicable_for: values.applicable_for,
          sb_compliance: values.sb_compliance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', circular.id);

      if (updateError) throw updateError;

      // Log the edit action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'edit_circular',
        resource_type: 'circular',
        resource_id: circular.id,
        metadata: {
          circular_number: values.circular_number,
          changes: {
            status: values.status !== circular.status ? { from: circular.status, to: values.status } : undefined,
          },
        },
      });

      toast.success('Circular updated successfully');
      router.push(`/circulars/${circular.id}`);
      router.refresh();
    } catch (error: any) {
      console.error('Error updating circular:', error);
      toast.error(error.message || 'Failed to update circular');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Edit Circular Details</CardTitle>
        <CardDescription className="text-sm">
          Update circular information. You can change the status to mark as obsolete.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Circular Number + Issue Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Title */}
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

            {/* Primary Topic */}
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

            {/* Status (KEY FEATURE!) */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circular Status *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4 mt-2"
                    >
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

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the circular..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            {/* SB Compliance */}
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

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isSaving} className="flex-1">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
                disabled={isSaving}
              >
                <Link href={`/circulars/${circular.id}`}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
