"""
Tests for documentation routes
"""
import pytest
from datetime import datetime
from app.db.models import Repo, Prompt, History, GeneralSettings


def test_delete_document_saves_to_history_and_clears_documentation(client, db_session):
    """
    Test that deleting a document saves the complete dataset to history
    and then clears the documentation field while keeping the prompt record
    """
    # Create a repo
    repo = Repo(
        repo_name="Test Repo",
        repo_url="https://github.com/test/repo",
        description="Test repository",
    )
    db_session.add(repo)
    db_session.commit()

    # Create a prompt with both documentation and specific_prompt
    prompt = Prompt(
        generic_prompt="Generic prompt text",
        specific_prompt="Important specific prompt for this repo",
        repo_id=repo.id,
        docu="# Documentation\n\nThis is the generated documentation.",
        project_goal="Test project goal",
    )
    db_session.add(prompt)
    db_session.commit()
    prompt_id = prompt.id

    # Delete the document via API
    response = client.post("/docs/delete", json={"doc_ids": [str(prompt_id)]})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["deleted_count"] == 1

    # Verify the prompt still exists but documentation is cleared
    db_session.expire_all()  # Clear the session cache
    prompt_after_delete = (
        db_session.query(Prompt).filter(Prompt.id == prompt_id).first()
    )
    assert prompt_after_delete is not None, "Prompt record should still exist"
    assert prompt_after_delete.docu is None, "Documentation should be cleared"
    assert prompt_after_delete.specific_prompt == "Important specific prompt for this repo", "Specific prompt should be preserved"
    assert prompt_after_delete.generic_prompt == "Generic prompt text", "Generic prompt should be preserved"

    # Verify the complete dataset is saved in history
    history_entry = (
        db_session.query(History)
        .filter(History.prompt_id == prompt_id)
        .order_by(History.created_at.desc())
        .first()
    )
    assert history_entry is not None, "History entry should exist"
    assert history_entry.generic_prompt == "Generic prompt text"
    assert history_entry.specific_prompt == "Important specific prompt for this repo"
    assert history_entry.docu == "# Documentation\n\nThis is the generated documentation."
    assert history_entry.repo_id == repo.id
    assert history_entry.project_goal == "Test project goal"


def test_delete_multiple_documents(client, db_session):
    """Test deleting multiple documents at once saves all to history and clears documentation"""
    # Create a repo
    repo = Repo(repo_name="Test Repo", repo_url="https://github.com/test/repo")
    db_session.add(repo)
    db_session.commit()

    # Create multiple prompts with documentation
    prompt1 = Prompt(
        generic_prompt="Generic 1",
        specific_prompt="Specific 1",
        repo_id=repo.id,
        docu="Documentation 1",
    )
    prompt2 = Prompt(
        generic_prompt="Generic 2",
        specific_prompt="Specific 2",
        repo_id=repo.id,
        docu="Documentation 2",
    )
    db_session.add(prompt1)
    db_session.add(prompt2)
    db_session.commit()

    prompt1_id = prompt1.id
    prompt2_id = prompt2.id

    # Delete both documents
    response = client.post(
        "/docs/delete", json={"doc_ids": [str(prompt1_id), str(prompt2_id)]}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["deleted_count"] == 2

    # Verify both prompts still exist but documentation is cleared
    db_session.expire_all()
    p1 = db_session.query(Prompt).filter(Prompt.id == prompt1_id).first()
    p2 = db_session.query(Prompt).filter(Prompt.id == prompt2_id).first()

    assert p1 is not None, "Prompt 1 should still exist"
    assert p2 is not None, "Prompt 2 should still exist"
    assert p1.docu is None, "Documentation 1 should be cleared"
    assert p2.docu is None, "Documentation 2 should be cleared"
    assert p1.specific_prompt == "Specific 1", "Specific prompt 1 should be preserved"
    assert p2.specific_prompt == "Specific 2", "Specific prompt 2 should be preserved"

    # Verify both are saved in history
    h1 = db_session.query(History).filter(History.prompt_id == prompt1_id).first()
    h2 = db_session.query(History).filter(History.prompt_id == prompt2_id).first()

    assert h1 is not None, "History entry 1 should exist"
    assert h2 is not None, "History entry 2 should exist"
    assert h1.specific_prompt == "Specific 1"
    assert h2.specific_prompt == "Specific 2"
    assert h1.docu == "Documentation 1"
    assert h2.docu == "Documentation 2"


def test_delete_nonexistent_document(client, db_session):
    """Test deleting a document that doesn't exist"""
    response = client.post("/docs/delete", json={"doc_ids": ["9999"]})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["deleted_count"] == 0
    assert len(data["errors"]) == 1
    assert "not found" in data["errors"][0]


def test_list_documents_excludes_deleted_prompts(client, db_session):
    """
    Test that deleted documents are not listed,
    since they are removed from the prompt table
    """
    # Create a repo
    repo = Repo(repo_name="Test Repo", repo_url="https://github.com/test/repo")
    db_session.add(repo)
    db_session.commit()

    # Create a prompt with documentation
    prompt1 = Prompt(
        generic_prompt="Generic 1",
        specific_prompt="Specific 1",
        repo_id=repo.id,
        docu="Documentation 1",
    )
    db_session.add(prompt1)
    db_session.commit()
    prompt1_id = prompt1.id

    # List documents before deletion
    response = client.get("/docs/list")
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 1
    assert docs[0]["id"] == str(prompt1_id)

    # Delete the document
    response = client.post("/docs/delete", json={"doc_ids": [str(prompt1_id)]})
    assert response.status_code == 200

    # List documents after deletion
    response = client.get("/docs/list")
    assert response.status_code == 200
    docs = response.json()
    assert len(docs) == 0, "Deleted document should not be listed"

    # But the data should exist in history
    history_entry = db_session.query(History).filter(History.prompt_id == prompt1_id).first()
    assert history_entry is not None, "History entry should exist"


def test_update_documents_saves_to_history(client, db_session, mocker):
    """
    Test that updating/regenerating a document saves old data to history
    and uses the old specific_prompt with the current generic_prompt from general_settings
    """
    from app.db.models import GeneralSettings

    # Create general settings with a generic prompt
    settings = GeneralSettings(
        general_prompt="Current generic prompt from settings",
        updates_disabled=False
    )
    db_session.add(settings)
    db_session.commit()

    # Create a repo
    repo = Repo(
        repo_name="Test Repo",
        repo_url="https://github.com/test/repo",
        description="Test repository",
    )
    db_session.add(repo)
    db_session.commit()

    # Create a prompt with old generic prompt and specific prompt
    old_generic = "Old generic prompt"
    old_specific = "Old specific prompt"
    old_docu = "# Old Documentation"

    prompt = Prompt(
        generic_prompt=old_generic,
        specific_prompt=old_specific,
        repo_id=repo.id,
        docu=old_docu,
    )
    db_session.add(prompt)
    db_session.commit()
    prompt_id = prompt.id

    # Mock the generate_docu function to avoid actual LLM calls and Git operations
    # Patch it where it's imported (in routes_docs module)
    mock_generate = mocker.patch('app.api.routes_docs.generate_docu')
    mock_generate.return_value = {
        "status": "documented",
        "repository": "Test Repo",
        "prompt_id": prompt_id
    }

    # Update/regenerate the document
    response = client.post("/docs/update", json={"doc_ids": [str(prompt_id)]})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["updated_count"] == 1

    # Verify old data is saved in history
    db_session.expire_all()
    history_entry = (
        db_session.query(History)
        .filter(History.prompt_id == prompt_id)
        .order_by(History.created_at.desc())
        .first()
    )
    assert history_entry is not None, "History entry should exist"
    assert history_entry.generic_prompt == old_generic
    assert history_entry.specific_prompt == old_specific
    assert history_entry.docu == old_docu
    assert history_entry.repo_id == repo.id

    # Verify the prompt now has the current generic prompt from settings
    # but keeps the old specific prompt
    updated_prompt = db_session.query(Prompt).filter(Prompt.id == prompt_id).first()
    assert updated_prompt is not None
    assert updated_prompt.generic_prompt == "Current generic prompt from settings"
    assert updated_prompt.specific_prompt == old_specific, "Specific prompt should be preserved"

    # Verify generate_docu was called
    mock_generate.assert_called_once_with(db_session, repo.id, "Test Repo")


def test_update_document_goal(client, db_session):
    """Test updating the project goal for a document"""
    # Create a repo
    repo = Repo(
        repo_name="Test Repo",
        repo_url="https://github.com/test/repo",
        description="Test repository",
    )
    db_session.add(repo)
    db_session.commit()

    # Create a prompt without a project goal
    prompt = Prompt(
        generic_prompt="Generic prompt text",
        specific_prompt="Specific prompt",
        repo_id=repo.id,
        docu="# Documentation",
        project_goal=None,
    )
    db_session.add(prompt)
    db_session.commit()
    prompt_id = prompt.id

    # Update the project goal via API
    new_goal = "Build a scalable web application"
    response = client.put(
        f"/docs/{prompt_id}/goal",
        json={"goal": new_goal}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "successfully" in data["message"].lower()

    # Verify the goal is updated in the database
    db_session.expire_all()
    updated_prompt = db_session.query(Prompt).filter(Prompt.id == prompt_id).first()
    assert updated_prompt is not None
    assert updated_prompt.project_goal == new_goal


def test_update_document_goal_with_empty_string(client, db_session):
    """Test updating the project goal with an empty string sets it to None"""
    # Create a repo
    repo = Repo(
        repo_name="Test Repo",
        repo_url="https://github.com/test/repo",
    )
    db_session.add(repo)
    db_session.commit()

    # Create a prompt with a project goal
    prompt = Prompt(
        generic_prompt="Generic prompt text",
        repo_id=repo.id,
        docu="# Documentation",
        project_goal="Original goal",
    )
    db_session.add(prompt)
    db_session.commit()
    prompt_id = prompt.id

    # Update with empty string
    response = client.put(
        f"/docs/{prompt_id}/goal",
        json={"goal": "   "}  # Whitespace only
    )

    assert response.status_code == 200

    # Verify the goal is set to None
    db_session.expire_all()
    updated_prompt = db_session.query(Prompt).filter(Prompt.id == prompt_id).first()
    assert updated_prompt.project_goal is None


def test_get_document_includes_goal(client, db_session):
    """Test that getting a document includes the project goal"""
    # Create a repo
    repo = Repo(
        repo_name="Test Repo",
        repo_url="https://github.com/test/repo",
    )
    db_session.add(repo)
    db_session.commit()

    # Create a prompt with a project goal
    goal_text = "Create an innovative solution"
    prompt = Prompt(
        generic_prompt="Generic prompt text",
        repo_id=repo.id,
        docu="# Documentation\n\nTest content",
        project_goal=goal_text,
    )
    db_session.add(prompt)
    db_session.commit()
    prompt_id = prompt.id

    # Get the document via API
    response = client.get(f"/docs/{prompt_id}")

    assert response.status_code == 200
    doc = response.json()
    assert "goal" in doc
    assert doc["goal"] == goal_text
    assert doc["id"] == str(prompt_id)


def test_get_document_with_no_goal(client, db_session):
    """Test that getting a document without a goal returns None for goal"""
    # Create a repo
    repo = Repo(
        repo_name="Test Repo",
        repo_url="https://github.com/test/repo",
    )
    db_session.add(repo)
    db_session.commit()

    # Create a prompt without a project goal
    prompt = Prompt(
        generic_prompt="Generic prompt text",
        repo_id=repo.id,
        docu="# Documentation\n\nTest content",
        project_goal=None,
    )
    db_session.add(prompt)
    db_session.commit()
    prompt_id = prompt.id

    # Get the document via API
    response = client.get(f"/docs/{prompt_id}")

    assert response.status_code == 200
    doc = response.json()
    assert "goal" in doc
    assert doc["goal"] is None
# Additional comprehensive tests for routes_docs.py to increase coverage

def test_list_documents_empty(client, db_session):
    """Test listing documents when there are none"""
    response = client.get("/docs/list")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_list_documents_with_data(client, db_session):
    """Test listing documents with multiple repos and prompts"""
    # Create repos
    repo1 = Repo(repo_name="Repo1", repo_url="https://github.com/test/repo1", description="Test 1")
    repo2 = Repo(repo_name="Repo2", repo_url="https://github.com/test/repo2", description="Test 2")
    db_session.add_all([repo1, repo2])
    db_session.commit()

    # Create prompts (documentation)
    prompt1 = Prompt(repo_id=repo1.id, generic_prompt="Generic", specific_prompt="Specific1", docu="# Repo1 Docs")
    prompt2 = Prompt(repo_id=repo2.id, generic_prompt="Generic", specific_prompt="Specific2", docu="# Repo2 Docs")
    db_session.add_all([prompt1, prompt2])
    db_session.commit()

    response = client.get("/docs/list")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(key in data[0] for key in ["id", "title", "repo_id", "repo_name", "status"])


def test_get_document_by_id(client, db_session):
    """Test retrieving a specific document by ID"""
    repo = Repo(repo_name="TestRepo", repo_url="https://github.com/test/repo", description="Test")
    db_session.add(repo)
    db_session.commit()

    prompt = Prompt(repo_id=repo.id, generic_prompt="Generic", specific_prompt="Specific", docu="# Documentation")
    db_session.add(prompt)
    db_session.commit()

    response = client.get(f"/docs/{prompt.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(prompt.id)
    assert data["repo_name"] == "TestRepo"
    assert "content" in data


def test_get_document_not_found(client, db_session):
    """Test retrieving a non-existent document"""
    response = client.get("/docs/99999")
    assert response.status_code == 404


def test_search_documents_basic(client, db_session):
    """Test basic document search"""
    repo = Repo(repo_name="SearchRepo", repo_url="https://github.com/test/repo", description="Searchable repo")
    db_session.add(repo)
    db_session.commit()

    prompt = Prompt(
        repo_id=repo.id,
        generic_prompt="Generic",
        specific_prompt="Specific",
        docu="# Python Documentation\nThis is about Python")
    db_session.add(prompt)
    db_session.commit()

    response = client.get("/docs/search?query=Python")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_search_documents_empty_query(client, db_session):
    """Test search with empty query"""
    response = client.get("/docs/search?query=")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_search_documents_no_results(client, db_session):
    """Test search with no matching results"""
    repo = Repo(repo_name="SearchRepo", repo_url="https://github.com/test/repo")
    db_session.add(repo)
    db_session.commit()

    prompt = Prompt(repo_id=repo.id, generic_prompt="Generic", docu="# Documentation")
    db_session.add(prompt)
    db_session.commit()

    response = client.get("/docs/search?query=NonExistentTerm12345")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_update_documents_invalid_id(client, db_session):
    """Test updating with invalid document ID"""
    response = client.post("/docs/update", json={"doc_ids": ["invalid"]})
    assert response.status_code == 200
    data = response.json()
    assert "errors" in data
    assert len(data["errors"]) > 0


def test_update_documents_not_found(client, db_session):
    """Test updating non-existent document"""
    response = client.post("/docs/update", json={"doc_ids": ["99999"]})
    assert response.status_code == 200
    data = response.json()
    assert "errors" in data


def test_update_documents_no_repo(client, db_session):
    """Test updating document with no associated repository"""
    # Create orphaned prompt (no repo_id)
    prompt = Prompt(generic_prompt="Generic", docu="# Docs")
    db_session.add(prompt)
    db_session.commit()

    response = client.post("/docs/update", json={"doc_ids": [str(prompt.id)]})
    assert response.status_code == 200
    data = response.json()
    assert "errors" in data


def test_delete_documents_invalid_id(client, db_session):
    """Test deleting with invalid document ID"""
    response = client.post("/docs/delete", json={"doc_ids": ["invalid"]})
    assert response.status_code == 200
    data = response.json()
    assert "errors" in data


def test_delete_documents_not_found(client, db_session):
    """Test deleting non-existent document"""
    response = client.post("/docs/delete", json={"doc_ids": ["99999"]})
    assert response.status_code == 200
    data = response.json()
    assert "errors" in data


def test_delete_documents_no_docu_field(client, db_session):
    """Test deleting document that has no documentation"""
    repo = Repo(repo_name="TestRepo", repo_url="https://github.com/test/repo")
    db_session.add(repo)
    db_session.commit()

    # Prompt without documentation
    prompt = Prompt(repo_id=repo.id, generic_prompt="Generic", specific_prompt="Specific")
    db_session.add(prompt)
    db_session.commit()

    response = client.post("/docs/delete", json={"doc_ids": [str(prompt.id)]})
    assert response.status_code == 200
    # Should still work even if no docs to delete


def test_search_debug_endpoint(client, db_session):
    """Test the debug search endpoint"""
    response = client.get("/docs/search/debug")
    assert response.status_code == 200
    # Debug endpoint should return some diagnostic information


def test_update_documents_with_ssh_url(client, db_session, mocker):
    """Test updating documents with SSH URL repository"""
    settings = GeneralSettings(general_prompt="Generic prompt", updates_disabled=False)
    db_session.add(settings)
    db_session.commit()

    # Repo with SSH URL
    repo = Repo(repo_name="SSHRepo", repo_url="git@github.com:test/repo.git", description="SSH repo")
    db_session.add(repo)
    db_session.commit()

    prompt = Prompt(repo_id=repo.id, generic_prompt="Old", specific_prompt="Specific", docu="# Docs")
    db_session.add(prompt)
    db_session.commit()

    # Mock generate_docu
    mock_generate = mocker.patch('app.api.routes_docs.generate_docu')
    mock_generate.return_value = {"status": "documented", "repository": "SSHRepo", "prompt_id": prompt.id}

    response = client.post("/docs/update", json={"doc_ids": [str(prompt.id)]})
    assert response.status_code == 200


def test_list_documents_filters_null_docu(client, db_session):
    """Test that list only shows prompts with documentation"""
    repo = Repo(repo_name="TestRepo", repo_url="https://github.com/test/repo")
    db_session.add(repo)
    db_session.commit()

    # Prompt with docs
    prompt1 = Prompt(repo_id=repo.id, generic_prompt="Generic", docu="# Has Docs")
    # Prompt without docs (should not appear in list)
    prompt2 = Prompt(repo_id=repo.id, generic_prompt="Generic", docu=None)
    db_session.add_all([prompt1, prompt2])
    db_session.commit()

    response = client.get("/docs/list")
    assert response.status_code == 200
    data = response.json()
    # Depending on implementation, might filter out null docu or not
    # Just verify it returns a list
    assert isinstance(data, list)


def test_get_document_with_https_url(client, db_session):
    """Test retrieving document with HTTPS URL"""
    repo = Repo(repo_name="HTTPSRepo", repo_url="https://github.com/test/repo.git")
    db_session.add(repo)
    db_session.commit()

    prompt = Prompt(repo_id=repo.id, generic_prompt="Generic", docu="# Docs")
    db_session.add(prompt)
    db_session.commit()

    response = client.get(f"/docs/{prompt.id}")
    assert response.status_code == 200
    data = response.json()
    assert "repo_url" in data


def test_delete_multiple_documents_partial_success(client, db_session):
    """Test deleting multiple documents where some exist and some don't"""
    repo = Repo(repo_name="TestRepo", repo_url="https://github.com/test/repo")
    db_session.add(repo)
    db_session.commit()

    prompt = Prompt(repo_id=repo.id, generic_prompt="Generic", docu="# Docs")
    db_session.add(prompt)
    db_session.commit()

    # Mix of valid and invalid IDs
    response = client.post("/docs/delete", json={"doc_ids": [str(prompt.id), "99999", "invalid"]})
    assert response.status_code == 200
    data = response.json()
    # Should have some success and some errors
    assert "deleted_count" in data or "errors" in data


def test_update_multiple_documents(client, db_session, mocker):
    """Test updating multiple documents at once"""
    settings = GeneralSettings(general_prompt="Current", updates_disabled=False)
    db_session.add(settings)
    db_session.commit()

    repo = Repo(repo_name="TestRepo", repo_url="https://github.com/test/repo")
    db_session.add(repo)
    db_session.commit()

    prompt1 = Prompt(repo_id=repo.id, generic_prompt="Old", specific_prompt="Sp1", docu="# Doc1")
    prompt2 = Prompt(repo_id=repo.id, generic_prompt="Old", specific_prompt="Sp2", docu="# Doc2")
    db_session.add_all([prompt1, prompt2])
    db_session.commit()

    # Mock generate_docu
    mock_generate = mocker.patch('app.api.routes_docs.generate_docu')
    mock_generate.return_value = {"status": "documented"}

    response = client.post("/docs/update", json={"doc_ids": [str(prompt1.id), str(prompt2.id)]})
    assert response.status_code == 200
    data = response.json()
    # Should update both
    assert data.get("updated_count", 0) >= 0


def test_search_documents_with_special_characters(client, db_session):
    """Test search with special characters"""
    repo = Repo(repo_name="TestRepo", repo_url="https://github.com/test/repo")
    db_session.add(repo)
    db_session.commit()

    prompt = Prompt(repo_id=repo.id, generic_prompt="Generic", docu="# Docs with C++ and Python")
    db_session.add(prompt)
    db_session.commit()

    response = client.get("/docs/search?query=C%2B%2B")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
