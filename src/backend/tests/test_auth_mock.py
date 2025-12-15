"""
Tests for mock authentication module
"""
import pytest
from datetime import datetime, timedelta
from app.auth.mock_auth import (
    authenticate_user,
    create_session,
    get_session,
    delete_session,
    get_all_mock_users,
    cleanup_expired_sessions,
    _sessions,
    MOCK_USERS
)


def test_authenticate_user_valid_credentials():
    """Test authentication with valid credentials"""
    user = authenticate_user("admin@caffeinecode.com", "admin123")
    assert user is not None
    assert user["email"] == "admin@caffeinecode.com"
    assert user["display_name"] == "Romy Becker"
    assert user["role"] == "admin"
    assert user["entra_object_id"] == "mock-admin-001"


def test_authenticate_user_invalid_password():
    """Test authentication with invalid password"""
    user = authenticate_user("admin@caffeinecode.com", "wrongpassword")
    assert user is None


def test_authenticate_user_invalid_username():
    """Test authentication with invalid username"""
    user = authenticate_user("nonexistent@caffeinecode.com", "admin123")
    assert user is None


def test_authenticate_user_all_mock_users():
    """Test authentication for all mock users"""
    for mock_user in MOCK_USERS:
        user = authenticate_user(mock_user["email"], mock_user["password"])
        assert user is not None
        assert user["email"] == mock_user["email"]
        assert user["role"] == mock_user["role"]


def test_create_session():
    """Test session creation"""
    _sessions.clear()
    user_data = {"email": "test@example.com", "role": "admin"}
    
    token = create_session(user_data)
    
    assert token.startswith("mock-session-")
    assert token in _sessions
    assert _sessions[token]["user"] == user_data
    assert "expires_at" in _sessions[token]
    assert "created_at" in _sessions[token]


def test_get_session_valid():
    """Test retrieving valid session"""
    _sessions.clear()
    user_data = {"email": "test@example.com", "role": "admin"}
    token = create_session(user_data)
    
    retrieved_user = get_session(token)
    
    assert retrieved_user == user_data


def test_get_session_invalid_token():
    """Test retrieving session with invalid token"""
    _sessions.clear()
    user = get_session("mock-session-nonexistent")
    assert user is None


def test_get_session_wrong_prefix():
    """Test retrieving session with wrong token prefix"""
    _sessions.clear()
    user = get_session("invalid-prefix-123")
    assert user is None


def test_get_session_expired():
    """Test retrieving expired session"""
    _sessions.clear()
    user_data = {"email": "test@example.com", "role": "admin"}
    token = f"mock-session-test-expired"
    
    # Create expired session manually
    _sessions[token] = {
        "user": user_data,
        "expires_at": datetime.utcnow() - timedelta(hours=1),  # Expired 1 hour ago
        "created_at": datetime.utcnow() - timedelta(hours=9)
    }
    
    retrieved_user = get_session(token)
    
    assert retrieved_user is None
    assert token not in _sessions  # Should be deleted


def test_delete_session_existing():
    """Test deleting existing session"""
    _sessions.clear()
    user_data = {"email": "test@example.com", "role": "admin"}
    token = create_session(user_data)
    
    result = delete_session(token)
    
    assert result is True
    assert token not in _sessions


def test_delete_session_nonexistent():
    """Test deleting nonexistent session"""
    _sessions.clear()
    result = delete_session("mock-session-nonexistent")
    assert result is False


def test_get_all_mock_users():
    """Test getting all mock users"""
    users = get_all_mock_users()
    
    assert len(users) == len(MOCK_USERS)
    
    for user in users:
        assert "email" in user
        assert "display_name" in user
        assert "role" in user
        assert "password_hint" in user
        assert "password" not in user  # Passwords should not be exposed


def test_cleanup_expired_sessions():
    """Test cleanup of expired sessions"""
    _sessions.clear()
    
    # Create some valid sessions
    valid_user = {"email": "valid@example.com"}
    token1 = create_session(valid_user)
    token2 = create_session(valid_user)
    
    # Create expired sessions manually
    expired_token1 = f"mock-session-expired-1"
    expired_token2 = f"mock-session-expired-2"
    
    _sessions[expired_token1] = {
        "user": {"email": "expired1@example.com"},
        "expires_at": datetime.utcnow() - timedelta(hours=1),
        "created_at": datetime.utcnow() - timedelta(hours=9)
    }
    
    _sessions[expired_token2] = {
        "user": {"email": "expired2@example.com"},
        "expires_at": datetime.utcnow() - timedelta(minutes=1),
        "created_at": datetime.utcnow() - timedelta(hours=8)
    }
    
    # Should have 4 sessions total
    assert len(_sessions) == 4
    
    # Clean up
    cleaned_count = cleanup_expired_sessions()
    
    assert cleaned_count == 2
    assert len(_sessions) == 2
    assert token1 in _sessions
    assert token2 in _sessions
    assert expired_token1 not in _sessions
    assert expired_token2 not in _sessions


def test_session_isolation():
    """Test that different sessions are isolated"""
    _sessions.clear()
    
    user1 = {"email": "user1@example.com", "role": "admin"}
    user2 = {"email": "user2@example.com", "role": "viewer"}
    
    token1 = create_session(user1)
    token2 = create_session(user2)
    
    retrieved1 = get_session(token1)
    retrieved2 = get_session(token2)
    
    assert retrieved1 == user1
    assert retrieved2 == user2
    assert retrieved1 != retrieved2


def test_cleanup_expired_sessions_no_expired():
    """Test cleanup when there are no expired sessions"""
    _sessions.clear()
    
    # Create only valid sessions
    user = {"email": "valid@example.com"}
    create_session(user)
    create_session(user)
    
    cleaned_count = cleanup_expired_sessions()
    
    assert cleaned_count == 0
    assert len(_sessions) == 2
