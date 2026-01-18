'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FAQ, User } from '@/lib/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AddFAQDialog } from './add-faq-dialog';
import { EditFAQDialog } from './edit-faq-dialog';

interface FAQsAdminClientProps {
  initialFaqs: FAQ[];
  user: User;
}

export function FAQsAdminClient({ initialFaqs, user }: FAQsAdminClientProps) {
  const [faqs, setFaqs] = useState<FAQ[]>(initialFaqs);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get unique categories from existing FAQs
  const existingCategories = [...new Set(
    faqs
      .map((faq) => faq.category)
      .filter((category): category is string => category !== null)
  )];

  const refreshFaqs = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('faqs')
      .select('*')
      .order('category', { ascending: true })
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (data) {
      setFaqs(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) {
      return;
    }

    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('faqs').delete().eq('id', id);

      if (error) throw error;

      toast.success('FAQ deleted successfully');
      await refreshFaqs();
    } catch (error: any) {
      console.error('Error deleting FAQ:', error);
      toast.error(error.message || 'Failed to delete FAQ');
    } finally {
      setDeletingId(null);
    }
  };

  const togglePublished = async (faq: FAQ) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('faqs')
        .update({ is_published: !faq.is_published })
        .eq('id', faq.id);

      if (error) throw error;

      toast.success(
        faq.is_published ? 'FAQ unpublished' : 'FAQ published'
      );
      await refreshFaqs();
    } catch (error: any) {
      console.error('Error toggling FAQ:', error);
      toast.error(error.message || 'Failed to update FAQ');
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {faqs.length} FAQ(s) total
        </p>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      {faqs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No FAQs yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first FAQ to help users find answers
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Order</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faqs.map((faq) => (
                  <TableRow key={faq.id}>
                    <TableCell>
                      <p className="font-medium line-clamp-2">{faq.question}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {faq.answer.substring(0, 100)}
                        {faq.answer.length > 100 ? '...' : ''}
                      </p>
                    </TableCell>
                    <TableCell>
                      {faq.category ? (
                        <Badge variant="outline">{faq.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {faq.display_order ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublished(faq)}
                        className="p-0 h-auto"
                      >
                        {faq.is_published ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unpublished</Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingFaq(faq)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(faq.id)}
                          disabled={deletingId === faq.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {showAddDialog && (
        <AddFAQDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            refreshFaqs();
            setShowAddDialog(false);
          }}
          userId={user.id}
          existingCategories={existingCategories}
        />
      )}

      {editingFaq && (
        <EditFAQDialog
          open={!!editingFaq}
          faq={editingFaq}
          onClose={() => setEditingFaq(null)}
          onSuccess={() => {
            refreshFaqs();
            setEditingFaq(null);
          }}
          existingCategories={existingCategories}
        />
      )}
    </>
  );
}
