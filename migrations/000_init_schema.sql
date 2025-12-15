-- Initial database schema for CaffeineCode
-- This script initializes the database with pgvector extension and required tables
-- Based on the external database schema

-- Note: pgvector extension will be created by init_db.py
-- This file contains only the table definitions

-- Create sequences for primary keys
CREATE SEQUENCE IF NOT EXISTS users_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS repo_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS prompt_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS template_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" integer DEFAULT nextval('users_id_seq') NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" character varying(100),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users USING btree (email);

-- Repo table
CREATE TABLE IF NOT EXISTS "repo" (
    "id" integer DEFAULT nextval('repo_id_seq') NOT NULL,
    "repo_name" character varying(255) NOT NULL,
    "repo_url" text NOT NULL,
    "description" text,
    "date_of_version" timestamp DEFAULT now(),
    CONSTRAINT "repo_pkey" PRIMARY KEY ("id")
);

-- Prompt table
CREATE TABLE IF NOT EXISTS "prompt" (
    "id" integer DEFAULT nextval('prompt_id_seq') NOT NULL,
    "generic_prompt" text NOT NULL,
    "specific_prompt" text,
    "created_at" timestamp DEFAULT now(),
    "repo_id" integer,
    "docu" text,
    CONSTRAINT "prompt_pkey" PRIMARY KEY ("id")
);

-- Template table
CREATE TABLE IF NOT EXISTS "template" (
    "id" integer DEFAULT nextval('template_id_seq') NOT NULL,
    "name" character varying(255) NOT NULL,
    "prompt_text" text NOT NULL,
    "beschreibung" text,
    CONSTRAINT "template_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "prompt" DROP CONSTRAINT IF EXISTS "prompt_repo_id_fkey";
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_repo_id_fkey" FOREIGN KEY (repo_id) REFERENCES repo(id) ON DELETE CASCADE;

-- Insert initial users
INSERT INTO "users" (name, email, role) VALUES
    ('Adam Admin', 'adamadmin@codedoc.com', 'admin'),
    ('Bernd Bearbeiter', 'berndbearbeiter@codedoc.com', 'editor'),
    ('Lars Leser', 'larsleser@codedoc.com', 'reader')
ON CONFLICT (email) DO NOTHING;
