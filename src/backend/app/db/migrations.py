"""
Database migrations for CaffeineCode.

This module handles database schema migrations that need to be applied
to existing databases when the schema changes.
"""
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


def table_exists(session: Session, table_name: str) -> bool:
    """Check if a table exists in the database."""
    inspector = inspect(session.bind)
    return table_name in inspector.get_table_names()


def drop_old_tables(session: Session):
    """Drop old tables from previous schema."""
    try:
        old_tables = ['repo_clones', 'user_repo_roles', 'document_files', 'documents',
                      'prompt_runs', 'prompts', 'repositories']

        for table in old_tables:
            if table_exists(session, table):
                logger.info(f"Dropping old table '{table}'...")
                session.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))

        session.commit()
        logger.info("Successfully dropped old tables.")
    except Exception as e:
        logger.error(f"Error dropping old tables: {e}")
        session.rollback()
        raise


def apply_cascade_delete_migration(session: Session):
    """Apply migration to change foreign key constraint to CASCADE delete."""
    try:
        logger.info("Applying cascade delete migration for prompt table...")

        # Drop the existing foreign key constraint
        session.execute(text("ALTER TABLE prompt DROP CONSTRAINT IF EXISTS prompt_repo_id_fkey;"))

        # Add the foreign key constraint with CASCADE delete
        session.execute(text("""
            ALTER TABLE prompt ADD CONSTRAINT prompt_repo_id_fkey
            FOREIGN KEY (repo_id) REFERENCES repo(id) ON DELETE CASCADE;
        """))

        session.commit()
        logger.info("Successfully applied cascade delete migration.")
    except Exception as e:
        logger.error(f"Error applying cascade delete migration: {e}")
        session.rollback()
        # Don't raise - migration might already be applied
        logger.warning("Continuing despite migration error (may already be applied)")


def apply_prompt_columns_migration(session: Session):
    """Add generic_prompt and specific_prompt columns and migrate data from text column."""
    try:
        logger.info("Applying prompt columns migration...")

        # Check if columns already exist
        inspector = inspect(session.bind)
        columns = [col['name'] for col in inspector.get_columns('prompt')]

        if 'generic_prompt' not in columns:
            logger.info("Adding generic_prompt column...")
            session.execute(text("ALTER TABLE prompt ADD COLUMN generic_prompt TEXT;"))

        if 'specific_prompt' not in columns:
            logger.info("Adding specific_prompt column...")
            session.execute(text("ALTER TABLE prompt ADD COLUMN specific_prompt TEXT;"))

        # Migrate existing data from text column
        # For repo-specific prompts (repo_id IS NOT NULL), extract specific part
        logger.info("Migrating existing prompt data...")

        # Extract specific prompts from combined text using the marker
        session.execute(text("""
            UPDATE prompt
            SET specific_prompt = TRIM(SPLIT_PART(text, 'REPOSITORY-SPECIFIC INSTRUCTIONS:', 2)),
                generic_prompt = TRIM(SPLIT_PART(text, 'REPOSITORY-SPECIFIC INSTRUCTIONS:', 1))
            WHERE repo_id IS NOT NULL
              AND text LIKE '%REPOSITORY-SPECIFIC INSTRUCTIONS:%'
              AND specific_prompt IS NULL;
        """))

        # For prompts without the marker but with repo_id, keep text as generic
        session.execute(text("""
            UPDATE prompt
            SET generic_prompt = text
            WHERE repo_id IS NOT NULL
              AND text NOT LIKE '%REPOSITORY-SPECIFIC INSTRUCTIONS:%'
              AND generic_prompt IS NULL;
        """))

        # Make text column nullable
        logger.info("Making text column nullable...")
        session.execute(text("ALTER TABLE prompt ALTER COLUMN text DROP NOT NULL;"))

        session.commit()
        logger.info("Successfully applied prompt columns migration.")
    except Exception as e:
        logger.error(f"Error applying prompt columns migration: {e}")
        session.rollback()
        # Don't raise - migration might already be applied
        logger.warning("Continuing despite migration error (may already be applied)")


def apply_project_goal_columns_migration(session: Session):
    """Add project_goal column to prompt and history tables using raw connection."""
    logger.info("=" * 80)
    logger.info("STARTING project_goal columns migration")
    logger.info("=" * 80)
    
    # Use raw connection to bypass any SQLAlchemy session issues
    connection = session.connection()
    
    try:
        # Allowed table names - security safeguard
        allowed_tables = {'prompt', 'history'}
        
        for table_name in ['prompt', 'history']:
            logger.info(f"Processing table: {table_name}")
            
            # Validate table name for security
            if table_name not in allowed_tables:
                logger.warning(f"Skipping invalid table name: {table_name}")
                continue
            
            # Use DO block to check and add column in a single atomic operation
            # This is more reliable than separate check and alter statements
            sql = f"""
            DO $$
            BEGIN
                -- Check if column exists
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_schema = 'public'
                    AND table_name = '{table_name}'
                    AND column_name = 'project_goal'
                ) THEN
                    -- Add the column if it doesn't exist
                    ALTER TABLE {table_name} ADD COLUMN project_goal TEXT;
                    RAISE NOTICE 'Added project_goal column to % table', '{table_name}';
                ELSE
                    RAISE NOTICE 'Column project_goal already exists in % table', '{table_name}';
                END IF;
            END $$;
            """
            
            logger.info(f"Executing DO block for {table_name} table...")
            connection.execute(text(sql))
            connection.commit()  # Commit immediately after each table
            logger.info(f"✓ Completed processing {table_name} table")

        logger.info("=" * 80)
        logger.info("✓ Successfully applied project_goal columns migration")
        logger.info("=" * 80)
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"✗ Error applying project_goal columns migration: {e}", exc_info=True)
        logger.error("=" * 80)
        connection.rollback()
        # Re-raise to make the error visible
        raise


def run_migrations(session: Session):
    """Run all pending migrations."""
    logger.info("Running database migrations...")

    # Drop old tables if they exist (moving to new schema)
    drop_old_tables(session)

    # Apply cascade delete migration
    apply_cascade_delete_migration(session)

    # Apply prompt columns migration
    apply_prompt_columns_migration(session)

    # Apply project_goal columns migration
    apply_project_goal_columns_migration(session)

    logger.info("Database migrations completed.")
