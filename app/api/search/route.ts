import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim();
  const type = searchParams.get('type'); // 'circulars' | 'resources' | 'faqs' | null (all)
  const topic = searchParams.get('topic');
  const year = searchParams.get('year');

  if (!query) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    // Build search query for PostgreSQL full-text search
    // Convert search terms to tsquery format (e.g., "leave policy" -> "leave:* & policy:*")
    // Using :* for prefix matching to handle partial words
    const searchTerms = query
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => term.replace(/[^\w]/g, ''))
      .filter(term => term.length > 0)
      .map(term => `${term}:*`)
      .join(' & ');

    // Also prepare a LIKE pattern for fallback search
    const likePattern = `%${query}%`;

    const results: {
      circulars: any[];
      resources: any[];
      faqs: any[];
    } = {
      circulars: [],
      resources: [],
      faqs: [],
    };

    // Search circulars using full-text search with ranking
    if (!type || type === 'circulars') {
      // Use RPC to call a custom function, or use raw SQL via textSearch
      // Since Supabase JS doesn't directly support ts_rank, we use a hybrid approach:
      // 1. Use textSearch for FTS filtering
      // 2. Also include ILIKE fallback for better coverage
      // 3. Order by relevance using the search_vector match

      let circularsQuery = supabase
        .from('circulars')
        .select('*')
        .eq('status', 'valid');

      // Try FTS first, fallback to ILIKE if no search_vector results
      // Using textSearch on the search_vector column
      if (searchTerms) {
        circularsQuery = circularsQuery.textSearch('search_vector', searchTerms, {
          type: 'websearch',
          config: 'english',
        });
      }

      // Apply topic filter
      if (topic && topic !== 'all') {
        circularsQuery = circularsQuery.eq('primary_topic', topic);
      }

      // Apply year filter
      if (year && year !== 'all') {
        circularsQuery = circularsQuery.ilike('circular_number', `%/${year}`);
      }

      circularsQuery = circularsQuery
        .order('uploaded_at', { ascending: false })
        .limit(50);

      let { data: circulars, error: circularsError } = await circularsQuery;

      // If FTS returns no results, fallback to ILIKE search
      if ((!circulars || circulars.length === 0) && !circularsError) {
        let fallbackQuery = supabase
          .from('circulars')
          .select('*')
          .eq('status', 'valid')
          .or(`title.ilike.${likePattern},circular_number.ilike.${likePattern},description.ilike.${likePattern},ai_summary.ilike.${likePattern}`)
          .order('uploaded_at', { ascending: false })
          .limit(50);

        if (topic && topic !== 'all') {
          fallbackQuery = fallbackQuery.eq('primary_topic', topic);
        }

        if (year && year !== 'all') {
          fallbackQuery = fallbackQuery.ilike('circular_number', `%/${year}`);
        }

        const fallbackResult = await fallbackQuery;
        circulars = fallbackResult.data;
        circularsError = fallbackResult.error;
      }

      if (circularsError) {
        console.error('Error searching circulars:', circularsError);
      } else {
        // Sort results to prioritize matches in title/circular_number, then ai_summary
        const sortedCirculars = (circulars || []).sort((a, b) => {
          const queryLower = query.toLowerCase();

          // Score based on where the match is found (higher = better)
          const scoreA = getMatchScore(a, queryLower);
          const scoreB = getMatchScore(b, queryLower);

          if (scoreA !== scoreB) return scoreB - scoreA;

          // If same score, sort by date
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        });

        results.circulars = sortedCirculars;
      }
    }

    // Search resources
    if (!type || type === 'resources') {
      let resourcesQuery = supabase
        .from('resources')
        .select('*')
        .or(`title.ilike.${likePattern},description.ilike.${likePattern},topic.ilike.${likePattern}`)
        .order('uploaded_at', { ascending: false })
        .limit(50);

      // Apply topic filter
      if (topic && topic !== 'all') {
        resourcesQuery = resourcesQuery.eq('topic', topic);
      }

      const { data: resources, error: resourcesError } = await resourcesQuery;

      if (resourcesError) {
        console.error('Error searching resources:', resourcesError);
      } else {
        results.resources = resources || [];
      }
    }

    // Search FAQs
    if (!type || type === 'faqs') {
      const { data: faqs, error: faqsError } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_published', true)
        .or(`question.ilike.${likePattern},answer.ilike.${likePattern},category.ilike.${likePattern}`)
        .order('display_order', { ascending: true })
        .limit(20);

      if (faqsError) {
        console.error('Error searching FAQs:', faqsError);
      } else {
        results.faqs = faqs || [];
      }
    }

    return NextResponse.json({
      query,
      results,
      counts: {
        circulars: results.circulars.length,
        resources: results.resources.length,
        faqs: results.faqs.length,
        total: results.circulars.length + results.resources.length + results.faqs.length,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'An error occurred while searching' },
      { status: 500 }
    );
  }
}

// Helper function to score search results based on where the match is found
function getMatchScore(circular: any, queryLower: string): number {
  let score = 0;

  // Title match (highest priority) - Weight A
  if (circular.title?.toLowerCase().includes(queryLower)) {
    score += 100;
  }

  // Circular number match (highest priority) - Weight A
  if (circular.circular_number?.toLowerCase().includes(queryLower)) {
    score += 100;
  }

  // AI summary match (high priority) - Weight B
  if (circular.ai_summary?.toLowerCase().includes(queryLower)) {
    score += 50;
  }

  // Description match (medium priority) - Weight C
  if (circular.description?.toLowerCase().includes(queryLower)) {
    score += 25;
  }

  return score;
}
