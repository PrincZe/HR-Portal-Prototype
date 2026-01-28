'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, X, FileText, FolderOpen, HelpCircle, Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PRIMARY_TOPICS } from '@/lib/constants/topics';

interface SearchResult {
  circulars: Circular[];
  resources: Resource[];
  faqs: FAQ[];
}

interface Circular {
  id: string;
  title: string;
  circular_number: string;
  type: 'hrl' | 'hrops' | 'psd' | 'psd_minute';
  description: string | null;
  ai_summary: string | null;
  primary_topic: string | null;
  uploaded_at: string;
}

interface Resource {
  id: string;
  title: string;
  topic: string;
  description: string | null;
  uploaded_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

interface SearchResponse {
  query: string;
  results: SearchResult;
  counts: {
    circulars: number;
    resources: number;
    faqs: number;
    total: number;
  };
}

const typeFilters = [
  { value: 'all', label: 'All' },
  { value: 'circulars', label: 'Circulars' },
  { value: 'resources', label: 'Resources' },
  { value: 'faqs', label: 'FAQs' },
];

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialType = searchParams.get('type') || 'all';
  const initialTopic = searchParams.get('topic') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState(initialType);
  const [activeTopic, setActiveTopic] = useState(initialTopic);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (searchQuery: string, type: string, topic: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (type !== 'all') params.set('type', type);
      if (topic !== 'all') params.set('topic', topic);

      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');

      const data: SearchResponse = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Search on initial load and when URL params change
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, initialType, initialTopic);
    }
  }, [initialQuery, initialType, initialTopic, performSearch]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      const params = new URLSearchParams({ q: query });
      if (activeType !== 'all') params.set('type', activeType);
      if (activeTopic !== 'all') params.set('topic', activeTopic);
      router.push(`/search?${params.toString()}`);
      performSearch(query, activeType, activeTopic);
    }
  };

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    if (query.trim()) {
      const params = new URLSearchParams({ q: query });
      if (type !== 'all') params.set('type', type);
      if (activeTopic !== 'all') params.set('topic', activeTopic);
      router.push(`/search?${params.toString()}`);
      performSearch(query, type, activeTopic);
    }
  };

  const handleTopicChange = (topic: string) => {
    setActiveTopic(topic);
    if (query.trim()) {
      const params = new URLSearchParams({ q: query });
      if (activeType !== 'all') params.set('type', activeType);
      if (topic !== 'all') params.set('topic', topic);
      router.push(`/search?${params.toString()}`);
      performSearch(query, activeType, topic);
    }
  };

  const clearFilters = () => {
    setActiveType('all');
    setActiveTopic('all');
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      performSearch(query, 'all', 'all');
    }
  };

  const getTypeBadgeConfig = (type: string) => {
    const config: Record<string, { label: string; className: string }> = {
      hrl: { label: 'HRL', className: 'bg-blue-100 text-blue-800' },
      hrops: { label: 'HR OPS', className: 'bg-green-100 text-green-800' },
      psd: { label: 'PSD', className: 'bg-purple-100 text-purple-800' },
      psd_minute: { label: 'PSD Minute', className: 'bg-purple-100 text-purple-800' },
    };
    return config[type] || { label: type.toUpperCase(), className: 'bg-gray-100 text-gray-800' };
  };

  const getTopicLabel = (topicValue: string | null) => {
    if (!topicValue) return null;
    const topic = PRIMARY_TOPICS.find(t => t.value === topicValue);
    return topic?.label || topicValue;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const hasActiveFilters = activeType !== 'all' || activeTopic !== 'all';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Search Header */}
      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <form onSubmit={handleSearch} className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold text-[#17A2B8] hover:opacity-80 transition-opacity">
              HR Portal
            </Link>
            <div className="relative flex-1 max-w-2xl">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search circulars, resources, and more..."
                className="w-full px-4 py-2 pl-10 text-base rounded-full border border-gray-200
                           focus:border-[#17A2B8] focus:ring-2 focus:ring-[#17A2B8]/20
                           outline-none transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1
                           text-sm font-medium text-white bg-[#17A2B8] rounded-full
                           hover:bg-[#138496] transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            {typeFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleTypeChange(filter.value)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors
                  ${activeType === filter.value
                    ? 'bg-[#17A2B8] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {filter.label}
                {results && filter.value !== 'all' && (
                  <span className="ml-1 opacity-75">
                    ({filter.value === 'circulars' ? results.counts.circulars
                      : filter.value === 'resources' ? results.counts.resources
                      : results.counts.faqs})
                  </span>
                )}
              </button>
            ))}

            {/* Topic Filter */}
            <select
              value={activeTopic}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-full border border-gray-200 bg-white
                         focus:border-[#17A2B8] focus:ring-1 focus:ring-[#17A2B8]/20 outline-none"
            >
              <option value="all">All Topics</option>
              {PRIMARY_TOPICS.map((topic) => (
                <option key={topic.value} value={topic.value}>
                  {topic.label}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Results Section */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-2/3" />
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="p-8 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => performSearch(query, activeType, activeTopic)}
              className="mt-4 px-4 py-2 text-sm font-medium text-[#17A2B8] hover:underline"
            >
              Try again
            </button>
          </Card>
        )}

        {/* Empty State - No Query */}
        {!loading && !error && !results && !initialQuery && (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Start searching</h2>
            <p className="text-gray-500">Enter a search term to find circulars, resources, and FAQs</p>
          </Card>
        )}

        {/* Empty State - No Results */}
        {!loading && !error && results && results.counts.total === 0 && (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No results found for &quot;{results.query}&quot;
            </h2>
            <p className="text-gray-500 mb-4">Try different keywords or remove filters</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-sm text-gray-400">Suggestions:</span>
              {['leave', 'compensation', 'flexible work', 'medical'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setQuery(suggestion);
                    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
                    performSearch(suggestion, activeType, activeTopic);
                  }}
                  className="text-sm text-[#17A2B8] hover:underline"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Results */}
        {!loading && !error && results && results.counts.total > 0 && (
          <div className="space-y-6">
            {/* Results Count */}
            <p className="text-sm text-gray-600">
              Found <span className="font-semibold">{results.counts.total}</span> results for &quot;{results.query}&quot;
            </p>

            {/* Circulars Section */}
            {results.results.circulars.length > 0 && (activeType === 'all' || activeType === 'circulars') && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                  <FileText className="h-5 w-5 text-[#17A2B8]" />
                  Circulars
                  <span className="text-sm font-normal text-gray-500">
                    ({results.results.circulars.length} results)
                  </span>
                </h2>
                <div className="space-y-3">
                  {results.results.circulars.map((circular) => (
                    <Link key={circular.id} href={`/circulars/${circular.id}`}>
                      <Card className="p-4 hover:shadow-md hover:border-[#17A2B8]/30 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className={getTypeBadgeConfig(circular.type).className}>
                                {getTypeBadgeConfig(circular.type).label}
                              </Badge>
                              <span className="text-xs text-gray-500">{circular.circular_number}</span>
                            </div>
                            <h3 className="font-medium text-[#17A2B8] hover:underline line-clamp-1">
                              {circular.title}
                            </h3>
                            {(circular.ai_summary || circular.description) && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                                {circular.ai_summary || circular.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              {circular.primary_topic && (
                                <Badge variant="outline" className="text-xs">
                                  {getTopicLabel(circular.primary_topic)}
                                </Badge>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(circular.uploaded_at)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Resources Section */}
            {results.results.resources.length > 0 && (activeType === 'all' || activeType === 'resources') && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                  <FolderOpen className="h-5 w-5 text-[#17A2B8]" />
                  Resources
                  <span className="text-sm font-normal text-gray-500">
                    ({results.results.resources.length} results)
                  </span>
                </h2>
                <div className="space-y-3">
                  {results.results.resources.map((resource) => (
                    <Link key={resource.id} href={`/resources/${resource.id}`}>
                      <Card className="p-4 hover:shadow-md hover:border-[#17A2B8]/30 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-amber-100 text-amber-800">Resource</Badge>
                            </div>
                            <h3 className="font-medium text-[#17A2B8] hover:underline line-clamp-1">
                              {resource.title}
                            </h3>
                            {resource.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {resource.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              {resource.topic && (
                                <Badge variant="outline" className="text-xs">
                                  {getTopicLabel(resource.topic)}
                                </Badge>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(resource.uploaded_at)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* FAQs Section */}
            {results.results.faqs.length > 0 && (activeType === 'all' || activeType === 'faqs') && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-3">
                  <HelpCircle className="h-5 w-5 text-[#17A2B8]" />
                  FAQs
                  <span className="text-sm font-normal text-gray-500">
                    ({results.results.faqs.length} results)
                  </span>
                </h2>
                <div className="space-y-3">
                  {results.results.faqs.map((faq) => (
                    <Link key={faq.id} href={`/faqs#faq-${faq.id}`}>
                      <Card className="p-4 hover:shadow-md hover:border-[#17A2B8]/30 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-teal-100 text-teal-800">FAQ</Badge>
                              {faq.category && (
                                <span className="text-xs text-gray-500">{faq.category}</span>
                              )}
                            </div>
                            <h3 className="font-medium text-[#17A2B8] hover:underline line-clamp-2">
                              {faq.question}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {faq.answer}
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
