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
  type: 'hrl' | 'hrops' | 'psd' | 'psd_minute';
  status?: 'valid' | 'obsolete' | null;
  primary_topic?: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  description: string | null;
  min_role_tier: number | null;
  ministry_only: boolean;
  uploaded_at: string;
  annex_paths?: string[] | null;
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
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCirculars();
  }, []);

  useEffect(() => {
    filterCirculars();
  }, [circulars, searchQuery, selectedTypes, selectedYear, selectedTopic]);

  const fetchCirculars = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch circulars - RLS will filter based on user's role
      // Only show valid circulars in the listing
      const { data, error } = await supabase
        .from('circulars')
        .select('*')
        .eq('status', 'valid')
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

    // Filter by topic
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(c => c.primary_topic === selectedTopic);
    }

    // Filter by year (extract from circular number e.g., "15/2026")
    if (selectedYear !== 'all') {
      filtered = filtered.filter(c => {
        const match = c.circular_number.match(/\/(\d{4})/);
        const year = match ? match[1] : new Date(c.uploaded_at).getFullYear().toString();
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
    // Navigate to detail page where user can see the circular and all attachments
    window.location.href = `/circulars/${circular.id}`;
  };

  // Get available years from circulars (extract from circular number e.g., "15/2026")
  const availableYears = Array.from(
    new Set(circulars.map(c => {
      const match = c.circular_number.match(/\/(\d{4})/);
      return match ? match[1] : new Date(c.uploaded_at).getFullYear().toString();
    }))
  ).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Filters Sidebar */}
      <aside className={`lg:w-[280px] flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
        <Card className="p-4 sticky top-4">
          <CircularFilters
            selectedTypes={selectedTypes}
            onTypesChange={setSelectedTypes}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            selectedTopic={selectedTopic}
            onTopicChange={setSelectedTopic}
            availableYears={availableYears}
          />
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-4 min-w-0">
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
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
