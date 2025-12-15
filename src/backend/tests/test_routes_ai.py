"""
Tests for AI routes
"""
import pytest
from unittest.mock import patch, MagicMock
from app.db.models import Repo


def test_enqueue_generate_no_repos(client, db_session):
    """Test documentation generation with empty repo list"""
    response = client.post("/ai/generate", json={"repo_ids": []})
    
    assert response.status_code == 200
    data = response.json()
    assert data["successful_count"] == 0
    assert "status" in data


def test_enqueue_generate_nonexistent_repo(client, db_session):
    """Test documentation generation with nonexistent repository"""
    response = client.post("/ai/generate", json={"repo_ids": [99999]})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["successful_count"] == 0
    assert any("not found" in error.lower() for error in data["errors"])


@patch("app.api.routes_ai.generate_docu")
def test_enqueue_generate_single_repo_success(mock_generate_docu, client, db_session):
    """Test successful documentation generation for single repository"""
    # Create a test repository
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/user/test-repo.git"
    )
    db_session.add(repo)
    db_session.commit()
    
    # Mock successful generation
    mock_generate_docu.return_value = {
        "status": "documented",
        "message": "Documentation generated successfully"
    }
    
    response = client.post("/ai/generate", json={"repo_ids": [repo.id]})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["successful_count"] == 1
    assert len(data["results"]) == 1
    assert "errors" not in data or len(data.get("errors", [])) == 0
    
    # Verify generate_docu was called
    mock_generate_docu.assert_called_once()


@patch("app.api.routes_ai.generate_docu")
def test_enqueue_generate_single_repo_failure(mock_generate_docu, client, db_session):
    """Test failed documentation generation for single repository"""
    # Create a test repository
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/user/test-repo.git"
    )
    db_session.add(repo)
    db_session.commit()
    
    # Mock failed generation
    mock_generate_docu.return_value = {
        "status": "error",
        "message": "Failed to generate documentation"
    }
    
    response = client.post("/ai/generate", json={"repo_ids": [repo.id]})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["successful_count"] == 0
    assert len(data["errors"]) > 0


@patch("app.api.routes_ai.generate_docu")
def test_enqueue_generate_multiple_repos_all_success(mock_generate_docu, client, db_session):
    """Test successful documentation generation for multiple repositories"""
    # Create test repositories
    repos = []
    for i in range(3):
        repo = Repo(
            repo_name=f"test-repo-{i}",
            repo_url=f"https://github.com/user/test-repo-{i}.git"
        )
        db_session.add(repo)
        repos.append(repo)
    db_session.commit()
    
    # Mock successful generation
    mock_generate_docu.return_value = {
        "status": "documented",
        "message": "Documentation generated successfully"
    }
    
    repo_ids = [repo.id for repo in repos]
    response = client.post("/ai/generate", json={"repo_ids": repo_ids})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["successful_count"] == 3
    assert len(data["results"]) == 3


@patch("app.api.routes_ai.generate_docu")
def test_enqueue_generate_multiple_repos_partial_success(mock_generate_docu, client, db_session):
    """Test partial success when some repositories fail"""
    # Create test repositories
    repos = []
    for i in range(3):
        repo = Repo(
            repo_name=f"test-repo-{i}",
            repo_url=f"https://github.com/user/test-repo-{i}.git"
        )
        db_session.add(repo)
        repos.append(repo)
    db_session.commit()
    
    # Mock mixed results: first succeeds, second fails, third succeeds
    mock_generate_docu.side_effect = [
        {"status": "documented", "message": "Success"},
        {"status": "error", "message": "Failed"},
        {"status": "documented", "message": "Success"}
    ]
    
    repo_ids = [repo.id for repo in repos]
    response = client.post("/ai/generate", json={"repo_ids": repo_ids})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "partial_success"
    assert data["successful_count"] == 2
    assert len(data["results"]) == 3
    assert len(data["errors"]) > 0


@patch("app.api.routes_ai.generate_docu")
def test_enqueue_generate_exception_handling(mock_generate_docu, client, db_session):
    """Test that exceptions during generation are handled gracefully"""
    # Create a test repository
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/user/test-repo.git"
    )
    db_session.add(repo)
    db_session.commit()
    
    # Mock an exception
    mock_generate_docu.side_effect = Exception("Unexpected error")
    
    response = client.post("/ai/generate", json={"repo_ids": [repo.id]})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["successful_count"] == 0
    assert len(data["errors"]) > 0


@patch("app.api.routes_ai.generate_docu")
def test_enqueue_generate_mixed_valid_and_invalid_repos(mock_generate_docu, client, db_session):
    """Test generation with mix of valid and invalid repo IDs"""
    # Create one valid repository
    repo = Repo(
        repo_name="test-repo",
        repo_url="https://github.com/user/test-repo.git"
    )
    db_session.add(repo)
    db_session.commit()
    
    # Mock successful generation
    mock_generate_docu.return_value = {
        "status": "documented",
        "message": "Success"
    }
    
    # Request with valid and invalid repo IDs
    response = client.post("/ai/generate", json={"repo_ids": [99999, repo.id, 88888]})
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "partial_success"
    assert data["successful_count"] == 1
    assert len(data["errors"]) == 2  # Two repos not found
    assert len(data["results"]) == 1  # One successful


def test_enqueue_generate_invalid_request_body(client):
    """Test with invalid request body"""
    response = client.post("/ai/generate", json={"invalid_field": [1, 2, 3]})
    
    # FastAPI should return 422 for validation error
    assert response.status_code == 422

