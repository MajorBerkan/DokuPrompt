from sqlalchemy import text, create_engine
from sqlalchemy.exc import OperationalError
from app.db.session import engine, SessionLocal
from app.db.base import Base
from app.db import models  # noqa: F401  (registriert Models)
from app.db.migrations import run_migrations
from app.core.config import settings
import os
import re


def ensure_database_role():
    """
    Ensures that the database role specified in DATABASE_URL exists.
    If it doesn't exist, connects as postgres superuser to create it.
    """
    try:
        # Try to connect with the configured user
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return  # Connection successful, role exists
    except OperationalError as e:
        error_msg = str(e)
        if "role" in error_msg.lower() and "does not exist" in error_msg.lower():
            print(f"Database role does not exist, attempting to create it...")

            # Extract database connection details from DATABASE_URL
            # Format: postgresql+psycopg://user:password@host:port/database
            db_url = settings.DATABASE_URL

            # Parse the connection string
            match = re.match(r'postgresql\+psycopg://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', db_url)
            if match:
                username, password, host, port, database = match.groups()

                # Validate username and database name to prevent SQL injection
                # PostgreSQL identifiers can contain letters, digits, underscores, but must start with letter or underscore
                if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', username):
                    raise ValueError(f"Invalid username format: {username}")
                if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', database):
                    raise ValueError(f"Invalid database name format: {database}")

                # Get postgres superuser password from environment
                # In the docker setup, POSTGRES_PASSWORD is the password for the default postgres user
                postgres_password = os.getenv('POSTGRES_PASSWORD', 'password')

                # Create admin connection URL using postgres superuser
                admin_url = f"postgresql+psycopg://postgres:{postgres_password}@{host}:{port}/postgres"

                try:
                    # Connect as postgres superuser
                    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
                    with admin_engine.connect() as conn:
                        # Create the role if it doesn't exist
                        # Note: We use string formatting for identifiers (username) because PostgreSQL
                        # doesn't support parameters for identifiers in DDL statements.
                        # The username and database have been validated above to prevent SQL injection.
                        # For the password, we use parameter binding for security.

                        # First check if role exists and create/update it
                        result = conn.execute(
                            text("SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :username"),
                            {"username": username}
                        )

                        if not result.fetchone():
                            # Create new role - use format for identifier, parameter for password
                            conn.execute(
                                text(f"CREATE ROLE {username} WITH LOGIN PASSWORD :password SUPERUSER"),
                                {"password": password}
                            )
                            print(f"Role {username} created successfully")
                        else:
                            # Update existing role password
                            conn.execute(
                                text(f"ALTER ROLE {username} WITH PASSWORD :password SUPERUSER"),
                                {"password": password}
                            )
                            print(f"Role {username} already exists, password updated")

                        # Create database if it doesn't exist
                        result = conn.execute(
                            text("SELECT 1 FROM pg_database WHERE datname = :database"),
                            {"database": database}
                        )
                        if not result.fetchone():
                            # Database name must be unquoted identifier in CREATE DATABASE
                            conn.execute(text(f'CREATE DATABASE {database}'))
                            print(f"Database {database} created")

                        # Grant privileges
                        conn.execute(text(f'GRANT ALL PRIVILEGES ON DATABASE {database} TO {username}'))

                    admin_engine.dispose()
                    print(f"Database role '{username}' is now ready")

                except Exception as admin_error:
                    print(f"Failed to create database role: {admin_error}")
                    print(f"This may happen if the postgres user doesn't exist or has a different password.")
                    print(f"Please ensure POSTGRES_PASSWORD environment variable is set correctly.")
                    raise
            else:
                print(f"Could not parse DATABASE_URL: {db_url}")
                raise
        else:
            # Different error, re-raise
            raise


def init_extensions():
    # sorgt dafür, dass benötigte Extensions existieren
    import os
    import logging
    logger = logging.getLogger(__name__)

    # Skip extension creation in test mode (SQLite doesn't support extensions)
    if os.getenv("TESTING") == "true":
        return

    # Try to create extensions, but don't fail if they already exist or can't be created
    # This is important for external databases where we might not have SUPERUSER privileges
    try:
        with engine.connect() as conn:
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
                logger.info("Extension 'pgcrypto' ensured")
            except Exception as e:
                logger.warning(f"Could not create extension 'pgcrypto': {e}. Continuing anyway.")

            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
                logger.info("Extension 'citext' ensured")
            except Exception as e:
                logger.warning(f"Could not create extension 'citext': {e}. Continuing anyway.")

            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                logger.info("Extension 'vector' ensured")
            except Exception as e:
                logger.warning(f"Could not create extension 'vector': {e}. Continuing anyway.")

            conn.commit()
    except Exception as e:
        logger.warning(f"Could not initialize extensions: {e}. Continuing with database initialization.")


def init_schema():
    Base.metadata.create_all(bind=engine)


def init_db():
    # First ensure the database role exists
    ensure_database_role()

    init_extensions()
    init_schema()

    # Run migrations for schema changes
    with SessionLocal() as session:
        run_migrations(session)
