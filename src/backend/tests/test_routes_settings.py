"""
Tests for general settings routes functionality including prompt versioning and history management.
"""
import pytest
from app.db.models import GeneralSettings


def test_get_general_settings_default(client, db_session):
    """Test getting default general settings when none exist"""
    response = client.get("/settings/general")
    assert response.status_code == 200
    data = response.json()
    assert data["prompt"] == ""
    assert data["checkInterval"] == 60  # Default: 60 minutes
    assert data["disabled"] is False


def test_save_general_settings_first_time(client, db_session):
    """Test saving general settings for the first time"""
    payload = {
        "prompt": "First prompt",
        "checkInterval": 30,  # 30 minutes
        "disabled": False
    }
    response = client.put("/settings/general", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prompt"] == "First prompt"
    assert data["checkInterval"] == 30
    assert data["disabled"] is False

    # Verify only one record exists
    count = db_session.query(GeneralSettings).count()
    assert count == 1


def test_save_general_settings_update_non_prompt_fields(client, db_session):
    """Test updating only check_interval and disabled fields without changing prompt"""
    # Create initial settings
    initial = GeneralSettings(
        general_prompt="Initial prompt",
        update_time=None,
        updates_disabled=False
    )
    db_session.add(initial)
    db_session.commit()
    initial_id = initial.id

    # Update only non-prompt fields
    payload = {
        "prompt": "Initial prompt",  # Same prompt
        "checkInterval": 45,  # 45 minutes
        "disabled": True
    }
    response = client.put("/settings/general", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prompt"] == "Initial prompt"
    assert data["checkInterval"] == 45
    assert data["disabled"] is True

    # Verify still only one record (updated, not created new)
    count = db_session.query(GeneralSettings).count()
    assert count == 1

    # Verify it's the same record
    updated = db_session.query(GeneralSettings).first()
    assert updated.id == initial_id


def test_save_general_settings_prompt_change_creates_new_record(client, db_session):
    """Test that changing the prompt creates a new record"""
    # Create initial settings
    initial = GeneralSettings(
        general_prompt="Initial prompt",
        update_time=None,
        updates_disabled=False
    )
    db_session.add(initial)
    db_session.commit()
    initial_id = initial.id

    # Change the prompt
    payload = {
        "prompt": "Updated prompt",  # Different prompt
        "checkInterval": 45,  # 45 minutes
        "disabled": True
    }
    response = client.put("/settings/general", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["prompt"] == "Updated prompt"
    assert data["checkInterval"] == 45
    assert data["disabled"] is True

    # Verify TWO records now exist
    count = db_session.query(GeneralSettings).count()
    assert count == 2

    # Verify it's a new record with a different ID
    latest = db_session.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()
    assert latest.id != initial_id
    assert latest.id > initial_id
    assert latest.general_prompt == "Updated prompt"


def test_save_general_settings_prompt_change_copies_other_settings(client, db_session):
    """Test that changing prompt copies other settings from previous record when not explicitly provided"""
    from datetime import timedelta

    # Create initial settings with specific values (30 minutes as timedelta)
    initial = GeneralSettings(
        general_prompt="Initial prompt",
        update_time=timedelta(minutes=30),
        updates_disabled=True
    )
    db_session.add(initial)
    db_session.commit()

    # Change only the prompt, keeping other fields the same
    # This simulates a user changing only the prompt in the UI
    payload = {
        "prompt": "New prompt",
        "checkInterval": 30,  # Same as before (kept by user)
        "disabled": True  # Same as before (kept by user)
    }
    response = client.put("/settings/general", json=payload)
    assert response.status_code == 200

    # Verify new record was created
    count = db_session.query(GeneralSettings).count()
    assert count == 2

    # Verify the new record has the correct values
    latest = db_session.query(GeneralSettings).order_by(GeneralSettings.id.desc()).first()
    assert latest.general_prompt == "New prompt"
    assert latest.update_time == timedelta(minutes=30)  # 30 minutes
    assert latest.updates_disabled is True


def test_get_general_settings_returns_latest(client, db_session):
    """Test that GET returns the most recent settings"""
    from datetime import timedelta

    # Create multiple settings records
    # 30 minutes as timedelta
    old_settings = GeneralSettings(
        general_prompt="Old prompt",
        update_time=timedelta(minutes=30),
        updates_disabled=False
    )
    db_session.add(old_settings)
    db_session.commit()

    # 45 minutes as timedelta
    new_settings = GeneralSettings(
        general_prompt="New prompt",
        update_time=timedelta(minutes=45),
        updates_disabled=True
    )
    db_session.add(new_settings)
    db_session.commit()

    # Get settings should return the latest
    response = client.get("/settings/general")
    assert response.status_code == 200
    data = response.json()
    assert data["prompt"] == "New prompt"
    assert data["checkInterval"] == 45  # 45 minutes
    assert data["disabled"] is True


def test_prompt_history_multiple_changes(client, db_session):
    """Test creating multiple prompt history records"""
    prompts = ["Prompt 1", "Prompt 2", "Prompt 3"]

    for i, prompt_text in enumerate(prompts):
        payload = {
            "prompt": prompt_text,
            "checkInterval": 30,  # 30 minutes
            "disabled": False
        }
        response = client.put("/settings/general", json=payload)
        assert response.status_code == 200

        # Verify the count increases
        count = db_session.query(GeneralSettings).count()
        assert count == i + 1

    # Verify all records exist
    all_settings = db_session.query(GeneralSettings).order_by(GeneralSettings.id).all()
    assert len(all_settings) == 3
    assert all_settings[0].general_prompt == "Prompt 1"
    assert all_settings[1].general_prompt == "Prompt 2"
    assert all_settings[2].general_prompt == "Prompt 3"

    # Verify GET returns the latest
    response = client.get("/settings/general")
    assert response.status_code == 200
    data = response.json()
    assert data["prompt"] == "Prompt 3"
