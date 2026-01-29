import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf/extract-text';
import { generateAISummaryWithTags } from '@/lib/ai/generate-summary';

export const maxDuration = 60; // Allow up to 60 seconds for large PDFs

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported for text extraction' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Convert File to Buffer for server-side processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF
    const extractionResult = await extractTextFromPDF(buffer);

    if (!extractionResult.success || !extractionResult.text) {
      return NextResponse.json({
        success: false,
        error: extractionResult.error || 'Failed to extract text from PDF',
        extractedText: '',
        summary: '',
        suggestedTags: [],
      });
    }

    // Generate AI summary and tags
    const aiResult = await generateAISummaryWithTags(extractionResult.text);

    return NextResponse.json({
      success: true,
      extractedText: extractionResult.text,
      summary: aiResult.summary,
      suggestedTags: aiResult.suggestedTags,
      pageCount: extractionResult.pageCount,
      aiSuccess: aiResult.success,
      aiError: aiResult.error,
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: `Failed to process PDF: ${errorMessage}`,
        extractedText: '',
        summary: '',
        suggestedTags: [],
      },
      { status: 500 }
    );
  }
}
