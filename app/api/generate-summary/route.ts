import { NextRequest, NextResponse } from 'next/server';
import { generateAISummaryWithTags } from '@/lib/ai/generate-summary';

export const maxDuration = 30; // Allow up to 30 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    // Validate text length
    if (text.trim().length < 100) {
      return NextResponse.json(
        { error: 'Text is too short to generate a meaningful summary' },
        { status: 400 }
      );
    }

    // Generate AI summary and tags
    const result = await generateAISummaryWithTags(text);

    return NextResponse.json({
      success: result.success,
      summary: result.summary,
      suggestedTags: result.suggestedTags,
      error: result.error,
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate summary: ${errorMessage}`,
        summary: '',
        suggestedTags: [],
      },
      { status: 500 }
    );
  }
}
