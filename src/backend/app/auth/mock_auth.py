"""
Mock Authentication Service for Development/Demo

This module provides a mock authentication system to simulate Entra ID authentication
when the team hasn't been added to the actual Entra ID tenant yet.

⚠️ WARNING: This is for development/demo purposes only!
- Passwords are stored in plain text
- No real token encryption
- No protection against brute-force attacks
- Sessions stored in memory (lost on restart)

For production, use real Entra ID authentication!
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict
from pydantic import BaseModel

# Mock user data
MOCK_USERS = [
    {
        "email": "admin@caffeinecode.com",
        "password": "admin123",
        "display_name": "Romy Becker",
        "entra_object_id": "mock-admin-001",
        "role": "admin"
    },
    {
        "email": "bearbeiter@caffeinecode.com",
        "password": "editor123",
        "display_name": "Paul Haustein",
        "entra_object_id": "mock-editor-001",
        "role": "bearbeiter"
    },
    {
        "email": "viewer@caffeinecode.com",
        "password": "viewer123",
        "display_name": "Paul Haustein",
        "entra_object_id": "mock-viewer-001",
        "role": "viewer"
    }
]

# In-memory session storage (will be lost on restart)
# Format: {token: {user_data, expires_at}}
_sessions: Dict[str, dict] = {}


class MockLoginRequest(BaseModel):
    username: str
    password: str


class MockUserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    entra_object_id: str
    role: str


class MockLoginResponse(BaseModel):
    token: str
    user: MockUserResponse


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """
    Authenticate a user with username and password.

    Returns user data if credentials are valid, None otherwise.
    """
    for user in MOCK_USERS:
        if user["email"] == username and user["password"] == password:
            return user.copy()
    return None


def create_session(user_data: dict) -> str:
    """
    Create a new session for a user.

    Returns a session token.
    """
    token = f"mock-session-{uuid.uuid4()}"
    expires_at = datetime.utcnow() + timedelta(hours=8)

    _sessions[token] = {
        "user": user_data,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    }

    return token


def get_session(token: str) -> Optional[dict]:
    """
    Get session data for a token.

    Returns user data if token is valid and not expired, None otherwise.
    """
    if not token.startswith("mock-session-"):
        return None

    session = _sessions.get(token)
    if not session:
        return None

    if datetime.utcnow() > session["expires_at"]:
        # Session expired
        del _sessions[token]
        return None

    return session["user"]


def delete_session(token: str) -> bool:
    """
    Delete a session (logout).

    Returns True if session was deleted, False if it didn't exist.
    """
    if token in _sessions:
        del _sessions[token]
        return True
    return False


def get_all_mock_users():
    """
    Get list of all mock users (without passwords).

    Used for displaying available test users on the login page.
    """
    return [
        {
            "email": user["email"],
            "display_name": user["display_name"],
            "role": user["role"],
            "password_hint": "Use the password from the documentation"
        }
        for user in MOCK_USERS
    ]


def cleanup_expired_sessions():
    """
    Clean up expired sessions from memory.

    Should be called periodically to prevent memory leaks.
    """
    now = datetime.utcnow()
    expired = [token for token, session in _sessions.items() if now > session["expires_at"]]
    for token in expired:
        del _sessions[token]
    return len(expired)
