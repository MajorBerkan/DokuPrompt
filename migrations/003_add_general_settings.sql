-- Migration: Add general_settings table
-- This table stores the general prompt and update time configuration

-- Create sequence for primary key
CREATE SEQUENCE IF NOT EXISTS general_settings_id_seq INCREMENT 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

-- Create general_settings table
CREATE TABLE IF NOT EXISTS "general_settings" (
    "settings_id" integer DEFAULT nextval('general_settings_id_seq') NOT NULL,
    "general_prompt" text NOT NULL,
    "update_time" time,
    "updates_disabled" boolean NOT NULL DEFAULT false,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "general_settings_pkey" PRIMARY KEY ("settings_id")
);

-- Insert default general prompt from routes_prompts.py
INSERT INTO "general_settings" (general_prompt, update_time, updates_disabled, updated_at)
VALUES (
    'Generate comprehensive documentation for this repository.

IMPORTANT FORMATTING REQUIREMENTS:
- Use proper Markdown heading hierarchy (# for main title, ## for sections, ### for subsections)
- Add extra blank lines before and after all headings for better spacing
- Make headings stand out with proper spacing: add 2 blank lines before each heading (except the first one) and 1 blank line after
- Use **bold** for important terms and key concepts
- Keep paragraph text consistently formatted with single spacing between lines
- Use code blocks with syntax highlighting for code examples
- Use bullet points or numbered lists for better readability where appropriate

CONTENT STRUCTURE:
- Start with an overview/introduction
- Document the main components and their purposes
- Include usage examples where relevant
- Explain configuration options if applicable
- Describe the API or main interfaces
',
    '18:00'::time,
    false,
    now()
)
ON CONFLICT DO NOTHING;
