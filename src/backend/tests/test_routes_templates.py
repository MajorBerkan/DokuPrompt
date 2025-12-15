"""
Tests for template management routes
"""
import pytest
from app.db.models import Template


def test_create_template(client, db_session):
    """Test creating a new template"""
    response = client.post(
        "/prompt-templates",
        json={
            "name": "Test Template",
            "description": "A test template",
            "content": "This is test content"
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Template"
    assert data["description"] == "A test template"
    assert data["content"] == "This is test content"
    assert "id" in data

    # Verify in database
    template = db_session.query(Template).filter(Template.name == "Test Template").first()
    assert template is not None
    assert template.prompt_text == "This is test content"


def test_create_duplicate_template(client, db_session):
    """Test creating a template with duplicate name fails"""
    # Create first template
    client.post(
        "/prompt-templates",
        json={
            "name": "Duplicate",
            "content": "Content 1"
        }
    )

    # Try to create duplicate
    response = client.post(
        "/prompt-templates",
        json={
            "name": "Duplicate",
            "content": "Content 2"
        }
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_list_templates(client, db_session):
    """Test listing all templates"""
    # Create some templates
    template1 = Template(
        name="Template 1",
        prompt_text="Content 1",
        description="Description 1"
    )
    template2 = Template(
        name="Template 2",
        prompt_text="Content 2"
    )
    db_session.add(template1)
    db_session.add(template2)
    db_session.commit()

    response = client.get("/prompt-templates")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Template 1"
    assert data[0]["content"] == "Content 1"
    assert data[0]["description"] == "Description 1"
    assert data[1]["name"] == "Template 2"
    assert data[1]["content"] == "Content 2"


def test_get_template(client, db_session):
    """Test getting a specific template"""
    template = Template(
        name="Get Test",
        prompt_text="Get content",
        description="Get description"
    )
    db_session.add(template)
    db_session.commit()

    response = client.get(f"/prompt-templates/{template.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == template.id
    assert data["name"] == "Get Test"
    assert data["content"] == "Get content"
    assert data["description"] == "Get description"


def test_get_nonexistent_template(client, db_session):
    """Test getting a template that doesn't exist"""
    response = client.get("/prompt-templates/9999")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_update_template(client, db_session):
    """Test updating a template"""
    template = Template(
        name="Update Test",
        prompt_text="Original content",
        description="Original description"
    )
    db_session.add(template)
    db_session.commit()

    response = client.put(
        f"/prompt-templates/{template.id}",
        json={
            "name": "Updated Test",
            "content": "Updated content",
            "description": "Updated description"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Test"
    assert data["content"] == "Updated content"
    assert data["description"] == "Updated description"

    # Verify in database
    db_session.refresh(template)
    assert template.name == "Updated Test"
    assert template.prompt_text == "Updated content"


def test_update_template_partial(client, db_session):
    """Test partially updating a template"""
    template = Template(
        name="Partial Update",
        prompt_text="Original content",
        description="Original description"
    )
    db_session.add(template)
    db_session.commit()

    # Only update content
    response = client.put(
        f"/prompt-templates/{template.id}",
        json={"content": "New content"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Partial Update"  # unchanged
    assert data["content"] == "New content"  # changed
    assert data["description"] == "Original description"  # unchanged


def test_update_template_duplicate_name(client, db_session):
    """Test updating template to duplicate name fails"""
    template1 = Template(name="Template 1", prompt_text="Content 1")
    template2 = Template(name="Template 2", prompt_text="Content 2")
    db_session.add(template1)
    db_session.add(template2)
    db_session.commit()

    # Try to rename template2 to template1's name
    response = client.put(
        f"/prompt-templates/{template2.id}",
        json={"name": "Template 1"}
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_update_nonexistent_template(client, db_session):
    """Test updating a template that doesn't exist"""
    response = client.put(
        "/prompt-templates/9999",
        json={"name": "New Name"}
    )

    assert response.status_code == 404


def test_delete_template(client, db_session):
    """Test deleting a template"""
    template = Template(
        name="Delete Test",
        prompt_text="To be deleted"
    )
    db_session.add(template)
    db_session.commit()
    template_id = template.id

    response = client.delete(f"/prompt-templates/{template_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Delete Test" in data["message"]

    # Verify deleted from database
    deleted = db_session.query(Template).filter(Template.id == template_id).first()
    assert deleted is None


def test_delete_nonexistent_template(client, db_session):
    """Test deleting a template that doesn't exist"""
    response = client.delete("/prompt-templates/9999")

    assert response.status_code == 404
