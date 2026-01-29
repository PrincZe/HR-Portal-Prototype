import { extractText as unpdfExtractText, getDocumentProxy } from 'unpdf';

export interface ExtractionResult {
  text: string;
  success: boolean;
  pageCount?: number;
  error?: string;
}

/**
 * Extracts text content from a PDF file using unpdf (serverless-compatible)
 * @param file - The PDF file to extract text from (File, Buffer, or ArrayBuffer)
 * @returns Promise<ExtractionResult> - The extracted text or error information
 */
export async function extractTextFromPDF(
  file: File | Buffer | ArrayBuffer
): Promise<ExtractionResult> {
  try {
    let data: ArrayBuffer;

    // Convert input to ArrayBuffer
    if (file instanceof File) {
      data = await file.arrayBuffer();
    } else if (Buffer.isBuffer(file)) {
      // Create a new ArrayBuffer from Buffer
      const uint8Array = new Uint8Array(file);
      data = uint8Array.buffer as ArrayBuffer;
    } else {
      data = file;
    }

    // Validate data is not empty
    if (data.byteLength === 0) {
      return {
        text: '',
        success: false,
        error: 'Empty file provided',
      };
    }

    // Use unpdf to extract text
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const pageCount = pdf.numPages;

    // Extract text from all pages
    const { text } = await unpdfExtractText(pdf, { mergePages: true });

    // Check if text was extracted
    if (!text || text.trim().length === 0) {
      return {
        text: '',
        success: false,
        pageCount,
        error: 'No text content found. The PDF may be scanned/image-based.',
      };
    }

    // Clean up the extracted text
    const cleanedText = cleanExtractedText(text);

    return {
      text: cleanedText,
      success: true,
      pageCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Provide more specific error messages for common issues
    let userFriendlyError = errorMessage;
    if (errorMessage.includes('Invalid PDF') || errorMessage.includes('invalid')) {
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
export async function extractText(file: File | Buffer | ArrayBuffer): Promise<string> {
  const result = await extractTextFromPDF(file);
  return result.text;
}
