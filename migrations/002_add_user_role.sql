-- Migration: Add role column to users table for mock authentication
-- Date: 2025-11-17
-- Description: Adds a role field to users table to support role-based access control
--              Roles: admin, bearbeiter, viewer

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT;

-- Optional: Add comment to document the field
COMMENT ON COLUMN users.role IS 'User role for access control: admin, bearbeiter, viewer';
