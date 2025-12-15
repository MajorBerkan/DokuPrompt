-- Migration to change prompt foreign key constraint to CASCADE delete
-- When a repository is deleted, all associated prompts should also be deleted

-- Drop the existing foreign key constraint
ALTER TABLE "prompt" DROP CONSTRAINT IF EXISTS "prompt_repo_id_fkey";

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_repo_id_fkey" 
    FOREIGN KEY (repo_id) REFERENCES repo(id) ON DELETE CASCADE;
