-- Migration: Add project_goal column to prompt table
-- Date: 2025-12-14
-- Purpose: Store project goal in prompt table for documentation

-- Add project_goal column to prompt table (nullable to support existing prompts)
ALTER TABLE prompt ADD COLUMN IF NOT EXISTS project_goal TEXT;

-- Optional: Add a comment to document the column
COMMENT ON COLUMN prompt.project_goal IS 'Project goal description for the repository documentation';
