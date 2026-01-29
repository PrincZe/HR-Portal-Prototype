import Anthropic from '@anthropic-ai/sdk';
import { SECONDARY_TOPICS } from '@/lib/constants/topics';

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

// Available tags for the AI to choose from
const AVAILABLE_TAGS = SECONDARY_TOPICS.map(t => ({ value: t.value, label: t.label }));

const TAGS_PROMPT = `You are an expert HR policy analyst for the Singapore Public Service.
Analyze the following government circular/document and suggest the most relevant tags from the provided list.

Available tags (select 2-5 that best match the document content):
${AVAILABLE_TAGS.map(t => `- ${t.value}: ${t.label}`).join('\n')}

Rules:
1. Only select tags from the list above
2. Select 2-5 tags that are most relevant to the document
3. Return ONLY the tag values (not labels), separated by commas
4. Do not include any explanation, just the comma-separated tag values

Example response format: compensation,leave_benefits,medical_dental_benefits

Document content:
`;

export interface SummaryResult {
  summary: string;
  success: boolean;
  error?: string;
}

export interface SummaryWithTagsResult {
  summary: string;
  suggestedTags: string[];
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
      model: 'claude-haiku-4-5-20251001',
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

/**
 * Generates suggested tags for PDF text content using Claude 3.5 Sonnet
 * @param pdfText - The extracted text from a PDF document
 * @returns Promise<string[]> - Array of suggested tag values
 */
export async function generateAISuggestedTags(pdfText: string): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is not set');
    return [];
  }

  if (!pdfText || pdfText.trim().length === 0) {
    return [];
  }

  const truncatedText = pdfText.length > MAX_INPUT_CHARS
    ? pdfText.slice(0, MAX_INPUT_CHARS) + '\n\n[Content truncated...]'
    : pdfText;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: TAGS_PROMPT + truncatedText,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }

    // Parse the comma-separated tags and validate against available tags
    const validTagValues: string[] = AVAILABLE_TAGS.map(t => t.value);
    const suggestedTags = textContent.text
      .trim()
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => validTagValues.includes(tag));

    return suggestedTags.slice(0, 5); // Limit to 5 tags max
  } catch (error) {
    console.error('Error generating AI tags:', error);
    return [];
  }
}

/**
 * Generates both AI summary and suggested tags in a single function
 * Makes parallel API calls for efficiency
 * @param pdfText - The extracted text from a PDF document
 * @returns Promise<SummaryWithTagsResult> - Summary and suggested tags
 */
export async function generateAISummaryWithTags(pdfText: string): Promise<SummaryWithTagsResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      summary: '',
      suggestedTags: [],
      success: false,
      error: 'API key not configured',
    };
  }

  if (!pdfText || pdfText.trim().length === 0) {
    return {
      summary: '',
      suggestedTags: [],
      success: false,
      error: 'No text content provided',
    };
  }

  const truncatedText = pdfText.length > MAX_INPUT_CHARS
    ? pdfText.slice(0, MAX_INPUT_CHARS) + '\n\n[Content truncated...]'
    : pdfText;

  try {
    const client = new Anthropic({ apiKey });

    // Run both API calls in parallel for efficiency
    const [summaryResponse, tagsResponse] = await Promise.all([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: SUMMARY_PROMPT + truncatedText }],
      }),
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: TAGS_PROMPT + truncatedText }],
      }),
    ]);

    // Extract summary
    const summaryContent = summaryResponse.content.find((block) => block.type === 'text');
    const summary = summaryContent?.type === 'text' ? summaryContent.text.trim() : '';

    // Extract and validate tags
    const tagsContent = tagsResponse.content.find((block) => block.type === 'text');
    const validTagValues: string[] = AVAILABLE_TAGS.map(t => t.value);
    const suggestedTags = tagsContent?.type === 'text'
      ? tagsContent.text
          .trim()
          .split(',')
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => validTagValues.includes(tag))
          .slice(0, 5)
      : [];

    return {
      summary,
      suggestedTags,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error generating AI summary with tags:', errorMessage);

    return {
      summary: '',
      suggestedTags: [],
      success: false,
      error: errorMessage,
    };
  }
}
