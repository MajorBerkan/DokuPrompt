"""
Tests for repository management routes
"""
import pytest
from app.db.models import Repo, Prompt


def test_list_repos_empty(client, db_session):
    """Test listing repositories when database is empty"""
    # Clear any existing data
    db_session.query(Prompt).delete()
    db_session.query(Repo).delete()
    db_session.commit()

    response = client.get("/repos/list")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_list_repos_with_data(client, db_session):
    """Test listing repositories with data"""
    # Clear any existing data
    db_session.query(Prompt).delete()
    db_session.query(Repo).delete()
    db_session.commit()

    # Create test repos
    repo1 = Repo(
        repo_name="test-repo-1",
        repo_url="https://github.com/test/repo1",
        description="Test repository 1"
    )
    repo2 = Repo(
        repo_name="test-repo-2",
        repo_url="https://github.com/test/repo2",
        description="Test repository 2"
    )
    db_session.add(repo1)
    db_session.add(repo2)
    db_session.commit()

    response = client.get("/repos/list")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2

    # Verify repo names are in response (using 'name' key not 'repo_name')
    repo_names = [repo["name"] for repo in data]
    assert "test-repo-1" in repo_names
    assert "test-repo-2" in repo_names


def test_list_repos_includes_prompt_count(client, db_session):
    """Test that repository list includes specific_prompt field"""
    # Clear any existing data
    db_session.query(Prompt).delete()
    db_session.query(Repo).delete()
    db_session.commit()

    # Create a repo with prompts
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/test/repo",
        description="Test repository"
    )
    db_session.add(repo)
    db_session.commit()

    # Add a prompt for this repo
    prompt = Prompt(
        repo_id=repo.id,
        generic_prompt="Generic prompt",
        specific_prompt="Specific prompt for this repo",
        docu="Documentation"
    )
    db_session.add(prompt)
    db_session.commit()

    response = client.get("/repos/list")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "test-repo"
    assert data[0]["specific_prompt"] == "Specific prompt for this repo"


def test_delete_repo_not_found(client, db_session):
    """Test deleting a non-existent repository"""
    response = client.post("/repos/delete", json={"repo_id": 99999})
    assert response.status_code == 404  # Changed from 200 to 404


def test_delete_repo_success(client, db_session):
    """Test successfully deleting a repository"""
    # Create a test repo
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/test/repo",
        description="Test repository"
    )
    db_session.add(repo)
    db_session.commit()
    repo_id = repo.id

    # Delete the repo
    response = client.post("/repos/delete", json={"repo_id": repo_id})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"  # Changed from "success" to "ok"

    # Verify repo is deleted
    db_session.expire_all()
    deleted_repo = db_session.query(Repo).filter(Repo.id == repo_id).first()
    assert deleted_repo is None


def test_delete_repo_with_prompts(client, db_session):
    """Test deleting a repository that has associated prompts"""
    # Create a repo with prompts
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/test/repo",
        description="Test repository"
    )
    db_session.add(repo)
    db_session.commit()

    prompt = Prompt(
        repo_id=repo.id,
        generic_prompt="Generic prompt",
        specific_prompt="Specific prompt",
        docu="Documentation"
    )
    db_session.add(prompt)
    db_session.commit()

    repo_id = repo.id
    prompt_id = prompt.id

    # Delete the repo
    response = client.post("/repos/delete", json={"repo_id": repo_id})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"  # Changed from "success" to "ok"

    # Verify repo and its prompts are deleted (cascade delete)
    db_session.expire_all()
    deleted_repo = db_session.query(Repo).filter(Repo.id == repo_id).first()
    assert deleted_repo is None

    deleted_prompt = db_session.query(Prompt).filter(Prompt.id == prompt_id).first()
    assert deleted_prompt is None


def test_clone_request_validation_empty_url():
    """Test that CloneRequest validates empty URLs"""
    from app.api.routes_repo import CloneRequest

    with pytest.raises(ValueError, match="Repository URL cannot be empty"):
        CloneRequest(repo_url="")


def test_clone_request_validation_whitespace_url():
    """Test that CloneRequest validates whitespace-only URLs"""
    from app.api.routes_repo import CloneRequest

    with pytest.raises(ValueError, match="Repository URL cannot be empty"):
        CloneRequest(repo_url="   ")


def test_clone_request_validation_invalid_url():
    """Test that CloneRequest rejects invalid URLs"""
    from app.api.routes_repo import CloneRequest

    with pytest.raises(ValueError, match="Invalid git repository URL"):
        CloneRequest(repo_url="not-a-valid-url")


def test_clone_request_validation_https_url():
    """Test that CloneRequest accepts HTTPS URLs"""
    from app.api.routes_repo import CloneRequest

    req = CloneRequest(repo_url="https://github.com/user/repo.git")
    assert req.repo_url == "https://github.com/user/repo.git"


def test_clone_request_validation_http_url():
    """Test that CloneRequest accepts HTTP URLs"""
    from app.api.routes_repo import CloneRequest

    req = CloneRequest(repo_url="http://github.com/user/repo.git")
    assert req.repo_url == "http://github.com/user/repo.git"


def test_clone_request_validation_ssh_url():
    """Test that CloneRequest accepts SSH URLs"""
    from app.api.routes_repo import CloneRequest

    req = CloneRequest(repo_url="git@github.com:user/repo.git")
    assert req.repo_url == "git@github.com:user/repo.git"


def test_clone_request_validation_ssh_protocol_url():
    """Test that CloneRequest accepts ssh:// URLs"""
    from app.api.routes_repo import CloneRequest

    req = CloneRequest(repo_url="ssh://git@github.com/user/repo.git")
    assert req.repo_url == "ssh://git@github.com/user/repo.git"
