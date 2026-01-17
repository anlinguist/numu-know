import { NextRequest, NextResponse } from 'next/server';
import algoliasearch from 'algoliasearch';
import { MAX_SEARCH_QUERY_LENGTH, MAX_SEARCH_RESULTS } from '@/lib/constants';
import { rateLimitSearch } from '@/lib/rate-limit';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Apply rate limiting
  const rateLimitResponse = rateLimitSearch(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { q_type, q_word } = body;

    // Validate search query
    if (!q_word || typeof q_word !== 'string') {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    if (q_word.length > MAX_SEARCH_QUERY_LENGTH) {
      return NextResponse.json({
        error: `Search query too long. Maximum ${MAX_SEARCH_QUERY_LENGTH} characters allowed.`
      }, { status: 400 });
    }

    const trimmedQuery = q_word.trim();
    if (trimmedQuery.length === 0) {
      return NextResponse.json({ error: 'Search query cannot be empty' }, { status: 400 });
    }

    const client = algoliasearch(
      process.env.ALGOLIA_APP_ID || '',
      process.env.ALGOLIA_API_KEY || ''
    );
    const sentencesIndex = client.initIndex('numu-know-sentences');

    if (q_type === 'simple') {
      const { hits } = await sentencesIndex.search(trimmedQuery, {
        attributesToHighlight: ['*'],
        highlightPreTag: '<em>',
        highlightPostTag: '</em>',
        hitsPerPage: MAX_SEARCH_RESULTS
      });
      return NextResponse.json(hits);
    } else {
      return NextResponse.json([]);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to query' }, { status: 500 });
  }
}
