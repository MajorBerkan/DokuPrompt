-- Migration: Add project_goal column to history table
-- Date: 2025-12-14
-- Purpose: Store project goal in history table for documentation versioning

-- Add project_goal column to history table (nullable to support existing history entries)
ALTER TABLE history ADD COLUMN IF NOT EXISTS project_goal TEXT;

-- Optional: Add a comment to document the column
COMMENT ON COLUMN history.project_goal IS 'Project goal description stored with historical documentation';
