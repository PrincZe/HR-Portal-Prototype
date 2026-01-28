import Anthropic from '@anthropic-ai/sdk';

const MAX_INPUT_CHARS = 15000;

const SUMMARY_PROMPT = `You are an expert HR policy analyst for the Singapore Public Service.
Analyze the following government circular/document and provide a concise summary (approximately 200 words).

Focus on:
1. Main policy changes or announcements
2. Key procedures and requirements
3. Important searchable terms and concepts
4. Who this applies to (which officers, grades, or agencies)
5. Effective dates or implementation timelines

Format the summary as clear, scannable prose. Include relevant acronyms and policy terms that would help with search discovery.

Document content:
`;

export interface SummaryResult {
  summary: string;
  success: boolean;
  error?: string;
}

/**
 * Generates an AI summary of PDF text content using Claude 3.5 Sonnet
 * @param pdfText - The extracted text from a PDF document
 * @returns Promise<SummaryResult> - The generated summary or error information
 */
export async function generateAISummary(pdfText: string): Promise<SummaryResult> {
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is not set');
    return {
      summary: '',
      success: false,
      error: 'API key not configured',
    };
  }

  // Handle empty input
  if (!pdfText || pdfText.trim().length === 0) {
    return {
      summary: '',
      success: false,
      error: 'No text content provided',
    };
  }

  // Truncate input if needed to stay within token limits
  const truncatedText = pdfText.length > MAX_INPUT_CHARS
    ? pdfText.slice(0, MAX_INPUT_CHARS) + '\n\n[Content truncated...]'
    : pdfText;

  try {
    const client = new Anthropic({
      apiKey,
    });

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: SUMMARY_PROMPT + truncatedText,
        },
      ],
    });

    // Extract text from the response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return {
        summary: '',
        success: false,
        error: 'No text content in AI response',
      };
    }

    return {
      summary: textContent.text.trim(),
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error generating AI summary:', errorMessage);

    return {
      summary: '',
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Simple wrapper that returns just the summary string
 * Returns empty string on failure (for backward compatibility)
 */
export async function generateSummary(pdfText: string): Promise<string> {
  const result = await generateAISummary(pdfText);
  return result.summary;
}
