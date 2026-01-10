'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Grid3x3, List } from 'lucide-react';
import { ResourceCard } from './resource-card';
import { ResourceFilters } from './resource-filters';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Resource {
  id: string;
  title: string;
  category: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  description: string | null;
  min_role_tier: number | null;
  ministry_only: boolean;
  uploaded_at: string;
  uploaded_by: string;
}

interface ResourcesClientProps {
  user: User;
}

export function ResourcesClient({ user }: ResourcesClientProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, searchQuery, selectedCategories, selectedFileTypes]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch resources - RLS will filter based on user's role
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const filterResources = () => {
    let filtered = [...resources];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.title.toLowerCase().includes(query) ||
          r.category.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.file_name.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(r => selectedCategories.includes(r.category));
    }

    // Filter by file type
    if (selectedFileTypes.length > 0) {
      filtered = filtered.filter(r => selectedFileTypes.includes(r.file_type));
    }

    setFilteredResources(filtered);
  };

  const handleDownload = async (resource: Resource) => {
    try {
      const supabase = createClient();
      
      // Get signed URL
      const { data, error } = await supabase.storage
        .from('resources')
        .createSignedUrl(resource.file_path, 60);

      if (error) throw error;

      // Download file
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = resource.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Log download action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'download_resource',
        resource_type: 'resource',
        resource_id: resource.id,
        metadata: { file_name: resource.file_name, category: resource.category },
      });

      toast.success('Downloading resource...');
    } catch (error: any) {
      console.error('Error downloading resource:', error);
      toast.error('Failed to download resource');
    }
  };

  const handleView = async (resource: Resource) => {
    try {
      const supabase = createClient();
      
      // Get signed URL
      const { data, error } = await supabase.storage
        .from('resources')
        .createSignedUrl(resource.file_path, 60);

      if (error) throw error;

      // Open in new tab
      window.open(data.signedUrl, '_blank');

      // Log view action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'view_resource',
        resource_type: 'resource',
        resource_id: resource.id,
        metadata: { file_name: resource.file_name, category: resource.category },
      });
    } catch (error: any) {
      console.error('Error viewing resource:', error);
      toast.error('Failed to view resource');
    }
  };

  const handleDelete = async (resource: Resource) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const supabase = createClient();

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('resources')
        .remove([resource.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('resources')
        .delete()
        .eq('id', resource.id);

      if (dbError) throw dbError;

      // Log delete action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'delete_resource',
        resource_type: 'resource',
        resource_id: resource.id,
        metadata: { file_name: resource.file_name, category: resource.category },
      });

      toast.success('Resource deleted successfully');
      fetchResources(); // Refresh list
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  // Get available categories and file types
  const availableCategories = Array.from(new Set(resources.map(r => r.category))).sort();
  const availableFileTypes = Array.from(new Set(resources.map(r => r.file_type))).sort();

  const isAdmin = user.roles.name === 'system_admin' || user.roles.name === 'portal_admin';

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      {/* Filters Sidebar */}
      <div className={`space-y-4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <Card className="p-4">
          <ResourceFilters
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            selectedFileTypes={selectedFileTypes}
            onFileTypesChange={setSelectedFileTypes}
            availableCategories={availableCategories}
            availableFileTypes={availableFileTypes}
          />
        </Card>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Search Bar and View Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-8 w-8"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Results */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery || selectedCategories.length > 0 || selectedFileTypes.length > 0
                ? 'No resources found matching your filters'
                : 'No resources available yet'}
            </p>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Showing {filteredResources.length} of {resources.length} resources
            </p>
            <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  viewMode={viewMode}
                  onView={() => handleView(resource)}
                  onDownload={() => handleDownload(resource)}
                  onDelete={isAdmin ? () => handleDelete(resource) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
