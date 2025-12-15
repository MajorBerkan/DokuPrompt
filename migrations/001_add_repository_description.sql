-- Migration: Add description column to repo table
-- Date: 2025-11-10
-- Purpose: Store repository descriptions that persist across page refreshes

-- Add description column to repo table (nullable to support existing repos)
-- Note: This migration is already handled by 000_init_schema.sql
-- Keeping this file for historical reference but making it idempotent
ALTER TABLE repo ADD COLUMN IF NOT EXISTS description TEXT;

-- Optional: Add a comment to document the column
COMMENT ON COLUMN repo.description IS 'User-provided description of the repository';
