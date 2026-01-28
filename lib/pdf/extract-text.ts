import { PDFParse } from 'pdf-parse';

export interface ExtractionResult {
  text: string;
  success: boolean;
  pageCount?: number;
  error?: string;
}

/**
 * Extracts text content from a PDF file
 * @param file - The PDF file to extract text from (File or Buffer)
 * @returns Promise<ExtractionResult> - The extracted text or error information
 */
export async function extractTextFromPDF(
  file: File | Buffer
): Promise<ExtractionResult> {
  let parser: PDFParse | null = null;

  try {
    let data: Uint8Array;

    // Convert File to Uint8Array if needed
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
    } else {
      data = new Uint8Array(file);
    }

    // Validate data is not empty
    if (data.length === 0) {
      return {
        text: '',
        success: false,
        error: 'Empty file provided',
      };
    }

    // Create parser and extract text
    parser = new PDFParse({ data });
    const textResult = await parser.getText();

    // Check if text was extracted
    if (!textResult.text || textResult.text.trim().length === 0) {
      return {
        text: '',
        success: false,
        pageCount: textResult.pages?.length,
        error: 'No text content found. The PDF may be scanned/image-based.',
      };
    }

    // Clean up the extracted text
    const cleanedText = cleanExtractedText(textResult.text);

    return {
      text: cleanedText,
      success: true,
      pageCount: textResult.pages?.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Provide more specific error messages for common issues
    let userFriendlyError = errorMessage;
    if (errorMessage.includes('Invalid PDF')) {
      userFriendlyError = 'Invalid or corrupted PDF file';
    } else if (errorMessage.includes('password')) {
      userFriendlyError = 'PDF is password protected';
    } else if (errorMessage.includes('encrypted')) {
      userFriendlyError = 'PDF is encrypted and cannot be read';
    }

    console.error('Error extracting text from PDF:', errorMessage);

    return {
      text: '',
      success: false,
      error: userFriendlyError,
    };
  } finally {
    // Clean up parser resources
    if (parser) {
      await parser.destroy().catch(() => {});
    }
  }
}

/**
 * Cleans up extracted PDF text by removing excess whitespace and artifacts
 */
function cleanExtractedText(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive whitespace while preserving paragraph breaks
    .replace(/[ \t]+/g, ' ')
    // Remove excessive newlines (more than 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Simple wrapper that returns just the text string
 * Returns empty string on failure (for backward compatibility)
 */
export async function extractText(file: File | Buffer): Promise<string> {
  const result = await extractTextFromPDF(file);
  return result.text;
}
