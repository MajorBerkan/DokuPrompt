"""
Tests for database models - Updated for new schema
"""
from datetime import datetime
from app.db.models import User, Repo, Prompt, Template, History


def test_user_model(db_session):
    """Test User model creation"""
    user = User(
        name="Test User",
        email="test@example.com",
        role="admin"
    )
    db_session.add(user)
    db_session.commit()

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.name == "Test User"


def test_repo_model(db_session):
    """Test Repo model creation"""
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/test/repo",
        description="Test repository"
    )
    db_session.add(repo)
    db_session.commit()

    assert repo.id is not None
    assert repo.repo_name == "test-repo"
    assert repo.repo_url == "https://github.com/test/repo"


def test_prompt_model(db_session):
    """Test Prompt model creation"""
    # Create a repo first for the foreign key
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/test/repo"
    )
    db_session.add(repo)
    db_session.commit()

    prompt = Prompt(
        generic_prompt="This is a generic prompt",
        specific_prompt="This is specific",
        repo_id=repo.id
    )
    db_session.add(prompt)
    db_session.commit()

    assert prompt.id is not None
    assert prompt.generic_prompt == "This is a generic prompt"
    assert prompt.repo_id == repo.id


def test_template_model(db_session):
    """Test Template model creation"""
    template = Template(
        name="test-template",
        prompt_text="This is a template prompt",
        description="Test template description"
    )
    db_session.add(template)
    db_session.commit()

    assert template.id is not None
    assert template.name == "test-template"
    assert template.prompt_text == "This is a template prompt"


def test_history_model(db_session):
    """Test History model creation"""
    # Create a repo first for the foreign key
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/test/repo"
    )
    db_session.add(repo)
    db_session.commit()

    history = History(
        prompt_id=1,
        generic_prompt="Historical prompt",
        repo_id=repo.id
    )
    db_session.add(history)
    db_session.commit()

    assert history.id is not None
    assert history.generic_prompt == "Historical prompt"
    assert history.repo_id == repo.id
