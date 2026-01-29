-- Migration: Add tags column to circulars table
-- This enables AI-suggested and user-selected tags for better categorization

-- Add tags column for storing array of tag values
ALTER TABLE circulars
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN circulars.tags IS 'Array of tag values for categorization, can be AI-suggested or manually selected';

-- Create GIN index for fast array searches on tags
CREATE INDEX IF NOT EXISTS circulars_tags_idx ON circulars USING GIN (tags)
WHERE tags IS NOT NULL;
