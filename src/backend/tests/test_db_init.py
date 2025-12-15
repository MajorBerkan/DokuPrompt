"""
Tests for database initialization
"""
import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from app.db.init_db import init_extensions, init_schema, init_db
from app.db.migrations import run_migrations


def test_init_extensions_in_test_mode():
    """Test that init_extensions is skipped in test mode"""
    with patch.dict(os.environ, {"TESTING": "true"}):
        # Should not raise any errors
        init_extensions()


def test_init_extensions_not_in_test_mode():
    """Test init_extensions when not in test mode"""
    with patch.dict(os.environ, {"TESTING": ""}, clear=True):
        with patch('app.db.init_db.engine') as mock_engine:
            mock_conn = Mock()
            mock_engine.connect.return_value.__enter__.return_value = mock_conn

            init_extensions()

            # Verify extensions were created
            assert mock_conn.execute.call_count == 3


def test_init_schema():
    """Test database schema initialization"""
    with patch('app.db.init_db.Base') as mock_base:
        with patch('app.db.init_db.engine') as mock_engine:
            init_schema()
            mock_base.metadata.create_all.assert_called_once_with(bind=mock_engine)


def test_init_db():
    """Test full database initialization"""
    with patch('app.db.init_db.init_extensions') as mock_extensions:
        with patch('app.db.init_db.init_schema') as mock_schema:
            with patch('app.db.init_db.run_migrations') as mock_migrations:
                with patch('app.db.init_db.SessionLocal') as mock_session_local:
                    mock_session = Mock()
                    mock_session_local.return_value.__enter__.return_value = mock_session

                    init_db()

                    mock_extensions.assert_called_once()
                    mock_schema.assert_called_once()
                    mock_migrations.assert_called_once_with(mock_session)


def test_run_migrations_empty_db(db_session):
    """Test running migrations on empty database"""
    # Should not raise errors
    run_migrations(db_session)


def test_run_migrations_with_existing_data(db_session):
    """Test running migrations with existing data"""
    from app.db.models import Repo

    # Create a repository
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/test/repo"
    )
    db_session.add(repo)
    db_session.commit()

    # Run migrations - should not fail
    run_migrations(db_session)

    # Verify repository still exists
    repos = db_session.query(Repo).all()
    assert len(repos) >= 1
