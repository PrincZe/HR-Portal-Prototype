'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter } from 'lucide-react';
import { CircularCard } from './circular-card';
import { CircularFilters } from './circular-filters';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Circular {
  id: string;
  title: string;
  circular_number: string;
  type: 'hrl' | 'hrops' | 'psd';
  file_path: string;
  file_name: string;
  file_size: number | null;
  description: string | null;
  min_role_tier: number | null;
  ministry_only: boolean;
  uploaded_at: string;
}

interface CircularsClientProps {
  user: User;
}

export function CircularsClient({ user }: CircularsClientProps) {
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [filteredCirculars, setFilteredCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCirculars();
  }, []);

  useEffect(() => {
    filterCirculars();
  }, [circulars, searchQuery, selectedTypes, selectedYear]);

  const fetchCirculars = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch circulars - RLS will filter based on user's role
      const { data, error } = await supabase
        .from('circulars')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setCirculars(data || []);
    } catch (error: any) {
      console.error('Error fetching circulars:', error);
      toast.error('Failed to load circulars');
    } finally {
      setLoading(false);
    }
  };

  const filterCirculars = () => {
    let filtered = [...circulars];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.title.toLowerCase().includes(query) ||
          c.circular_number.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(c => selectedTypes.includes(c.type));
    }

    // Filter by year
    if (selectedYear !== 'all') {
      filtered = filtered.filter(c => {
        const year = new Date(c.uploaded_at).getFullYear().toString();
        return year === selectedYear;
      });
    }

    setFilteredCirculars(filtered);
  };

  const handleDownload = async (circular: Circular) => {
    try {
      const supabase = createClient();
      
      // Get signed URL
      const { data, error } = await supabase.storage
        .from('circulars')
        .createSignedUrl(circular.file_path, 60);

      if (error) throw error;

      // Download file
      window.open(data.signedUrl, '_blank');

      // Log download action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'download_circular',
        resource_type: 'circular',
        resource_id: circular.id,
        metadata: { circular_number: circular.circular_number },
      });

      toast.success('Downloading circular...');
    } catch (error: any) {
      console.error('Error downloading circular:', error);
      toast.error('Failed to download circular');
    }
  };

  const handleView = async (circular: Circular) => {
    try {
      const supabase = createClient();
      
      // Get signed URL
      const { data, error } = await supabase.storage
        .from('circulars')
        .createSignedUrl(circular.file_path, 60);

      if (error) throw error;

      // Open in new tab
      window.open(data.signedUrl, '_blank');

      // Log view action
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'view_circular',
        resource_type: 'circular',
        resource_id: circular.id,
        metadata: { circular_number: circular.circular_number },
      });
    } catch (error: any) {
      console.error('Error viewing circular:', error);
      toast.error('Failed to view circular');
    }
  };

  // Get available years from circulars
  const availableYears = Array.from(
    new Set(circulars.map(c => new Date(c.uploaded_at).getFullYear().toString()))
  ).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      {/* Filters Sidebar */}
      <div className={`space-y-4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <Card className="p-4">
          <CircularFilters
            selectedTypes={selectedTypes}
            onTypesChange={setSelectedTypes}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            availableYears={availableYears}
          />
        </Card>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search circulars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredCirculars.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery || selectedTypes.length > 0 || selectedYear !== 'all'
                ? 'No circulars found matching your filters'
                : 'No circulars available yet'}
            </p>
          </Card>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Showing {filteredCirculars.length} of {circulars.length} circulars
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCirculars.map((circular) => (
                <CircularCard
                  key={circular.id}
                  circular={circular}
                  onView={() => handleView(circular)}
                  onDownload={() => handleDownload(circular)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
