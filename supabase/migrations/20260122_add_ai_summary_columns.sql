-- Migration: Add AI summary columns to circulars table
-- This enables AI-powered PDF summarization for enhanced search

-- Add ai_summary column for storing AI-generated summaries
ALTER TABLE circulars
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Add extracted_content column for storing raw PDF text (backup/reference)
ALTER TABLE circulars
ADD COLUMN IF NOT EXISTS extracted_content TEXT;

-- Add comment for documentation
COMMENT ON COLUMN circulars.ai_summary IS 'AI-generated summary of the circular PDF content for enhanced search';
COMMENT ON COLUMN circulars.extracted_content IS 'Raw extracted text from PDF for backup and reference';

-- Drop existing search_vector trigger if it exists
DROP TRIGGER IF EXISTS circulars_search_vector_update ON circulars;

-- Drop existing search_vector column and recreate with updated definition
-- This ensures the search_vector includes ai_summary with high weight
ALTER TABLE circulars DROP COLUMN IF EXISTS search_vector;

-- Add search_vector column for full-text search
ALTER TABLE circulars
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(circular_number, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(ai_summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C')
) STORED;

-- Create GIN index for fast full-text search
DROP INDEX IF EXISTS circulars_search_idx;
CREATE INDEX circulars_search_idx ON circulars USING GIN (search_vector);

-- Create index on ai_summary for filtering
CREATE INDEX IF NOT EXISTS circulars_ai_summary_idx ON circulars (ai_summary)
WHERE ai_summary IS NOT NULL;
