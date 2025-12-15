"""
Tests for prompt management routes including general prompt versioning and history tracking.
"""
import pytest
from app.db.models import GeneralSettings


def test_get_general_prompt_default(client, db_session):
    """Test getting default general prompt when none exists"""
    response = client.get("/prompts/general")
    assert response.status_code == 200
    data = response.json()
    # Should return the default prompt
    assert "Generate comprehensive documentation" in data["prompt"]


def test_save_general_prompt_first_time(client, db_session):
    """Test saving general prompt for the first time"""
    payload = {"prompt": "First general prompt"}
    response = client.post("/prompts/general", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

    # Verify it was saved
    settings = db_session.query(GeneralSettings).first()
    assert settings is not None
    assert settings.general_prompt == "First general prompt"


def test_save_general_prompt_creates_new_record_on_change(client, db_session):
    """Test that changing the general prompt creates a new record"""
    # Create initial prompt
    initial = GeneralSettings(general_prompt="Initial prompt")
    db_session.add(initial)
    db_session.commit()
    initial_id = initial.id

    # Save a different prompt
    payload = {"prompt": "Updated prompt"}
    response = client.post("/prompts/general", json=payload)
    assert response.status_code == 200

    # Verify two records exist now
    count = db_session.query(GeneralSettings).count()
    assert count == 2

    # Verify the latest is the new one
    latest = db_session.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()
    assert latest.id != initial_id
    assert latest.general_prompt == "Updated prompt"


def test_save_general_prompt_copies_other_settings(client, db_session):
    """Test that changing prompt copies other settings from previous record"""
    from datetime import timedelta

    # Note: update_time is a timedelta/interval representing the update frequency,
    # not a point in time. For example, timedelta(hours=15, minutes=30) means
    # "update every 15.5 hours"

    # Create initial settings with other fields set
    initial = GeneralSettings(
        general_prompt="Initial prompt",
        update_time=timedelta(hours=15, minutes=30),
        updates_disabled=True
    )
    db_session.add(initial)
    db_session.commit()

    # Update the prompt
    payload = {"prompt": "New prompt"}
    response = client.post("/prompts/general", json=payload)
    assert response.status_code == 200

    # Verify the new record copied other settings
    latest = db_session.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()
    assert latest.general_prompt == "New prompt"
    assert latest.update_time == timedelta(hours=15, minutes=30)  # Copied
    assert latest.updates_disabled is True  # Copied


def test_get_general_prompt_returns_latest(client, db_session):
    """Test that GET returns the most recent general prompt"""
    # Create multiple records
    old = GeneralSettings(general_prompt="Old prompt")
    db_session.add(old)
    db_session.commit()

    new = GeneralSettings(general_prompt="New prompt")
    db_session.add(new)
    db_session.commit()

    # Get should return the latest
    response = client.get("/prompts/general")
    assert response.status_code == 200
    data = response.json()
    assert data["prompt"] == "New prompt"


def test_general_prompt_history_multiple_changes(client, db_session):
    """Test creating multiple prompt history entries"""
    prompts = ["Prompt v1", "Prompt v2", "Prompt v3"]

    for i, prompt_text in enumerate(prompts):
        payload = {"prompt": prompt_text}
        response = client.post("/prompts/general", json=payload)
        assert response.status_code == 200

        # Verify count increases
        count = db_session.query(GeneralSettings).count()
        assert count == i + 1

    # Verify all records exist
    all_settings = db_session.query(GeneralSettings).order_by(GeneralSettings.id).all()
    assert len(all_settings) == 3
    assert all_settings[0].general_prompt == "Prompt v1"
    assert all_settings[1].general_prompt == "Prompt v2"
    assert all_settings[2].general_prompt == "Prompt v3"


def test_save_same_prompt_does_not_create_new_record(client, db_session):
    """Test that saving the same prompt doesn't create a new record"""
    # Create initial prompt
    payload = {"prompt": "Same prompt"}
    response = client.post("/prompts/general", json=payload)
    assert response.status_code == 200

    # Verify one record exists
    count = db_session.query(GeneralSettings).count()
    assert count == 1

    # Save the same prompt again
    response = client.post("/prompts/general", json=payload)
    assert response.status_code == 200

    # Verify still only one record (no duplicate created)
    count = db_session.query(GeneralSettings).count()
    assert count == 1
