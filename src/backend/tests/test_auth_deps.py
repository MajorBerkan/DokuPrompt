"""
Tests for authentication dependencies module
"""
import pytest
import os
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app.auth.deps import CurrentUser, verify_token, require_role


class TestCurrentUser:
    """Tests for CurrentUser class"""
    
    def test_current_user_creation(self):
        """Test creating a CurrentUser instance"""
        user = CurrentUser(
            sub="test-sub-123",
            name="Test User",
            email="test@example.com",
            roles=["admin", "user"]
        )
        
        assert user.sub == "test-sub-123"
        assert user.name == "Test User"
        assert user.email == "test@example.com"
        assert user.roles == ["admin", "user"]
    
    def test_current_user_empty_roles(self):
        """Test CurrentUser with None roles defaults to empty list"""
        user = CurrentUser(
            sub="test-sub",
            name="Test",
            email="test@example.com",
            roles=None
        )
        
        assert user.roles == []
    
    def test_current_user_optional_fields(self):
        """Test CurrentUser with optional fields as None"""
        user = CurrentUser(
            sub="test-sub",
            name=None,
            email=None,
            roles=[]
        )
        
        assert user.sub == "test-sub"
        assert user.name is None
        assert user.email is None
        assert user.roles == []


class TestVerifyTokenMock:
    """Tests for verify_token with mock authentication"""
    
    @patch.dict(os.environ, {"USE_MOCK_AUTH": "true"})
    def test_verify_token_missing_credentials(self):
        """Test verify_token with missing credentials"""
        with pytest.raises(HTTPException) as exc_info:
            verify_token(None)
        
        assert exc_info.value.status_code == 401
        assert "Missing bearer token" in exc_info.value.detail
    
    @patch.dict(os.environ, {"USE_MOCK_AUTH": "true"})
    def test_verify_token_wrong_scheme(self):
        """Test verify_token with wrong scheme"""
        creds = HTTPAuthorizationCredentials(
            scheme="Basic",
            credentials="some-token"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(creds)
        
        assert exc_info.value.status_code == 401
        assert "Missing bearer token" in exc_info.value.detail
    
    @patch.dict(os.environ, {"USE_MOCK_AUTH": "true"})
    @patch("app.auth.deps.get_session")
    def test_verify_token_mock_valid_session(self, mock_get_session):
        """Test verify_token with valid mock session"""
        mock_get_session.return_value = {
            "entra_object_id": "mock-admin-001",
            "display_name": "Test Admin",
            "email": "admin@test.com",
            "role": "admin"
        }
        
        creds = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="mock-session-123"
        )
        
        user = verify_token(creds)
        
        assert isinstance(user, CurrentUser)
        assert user.sub == "mock-admin-001"
        assert user.name == "Test Admin"
        assert user.email == "admin@test.com"
        assert user.roles == ["admin"]
    
    @patch.dict(os.environ, {"USE_MOCK_AUTH": "true"})
    @patch("app.auth.deps.get_session")
    def test_verify_token_mock_invalid_session(self, mock_get_session):
        """Test verify_token with invalid mock session"""
        mock_get_session.return_value = None
        
        creds = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="mock-session-invalid"
        )
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(creds)
        
        assert exc_info.value.status_code == 401
        assert "Invalid or expired session" in exc_info.value.detail


class TestRequireRole:
    """Tests for require_role decorator"""
    
    def test_require_role_with_role(self):
        """Test require_role when user has the required role"""
        user = CurrentUser(
            sub="test-sub",
            name="Test User",
            email="test@example.com",
            roles=["admin", "user"]
        )
        
        role_checker = require_role("admin")
        result = role_checker(user)
        
        assert result == user
    
    def test_require_role_without_role(self):
        """Test require_role when user lacks the required role"""
        user = CurrentUser(
            sub="test-sub",
            name="Test User",
            email="test@example.com",
            roles=["user"]
        )
        
        role_checker = require_role("admin")
        
        with pytest.raises(HTTPException) as exc_info:
            role_checker(user)
        
        assert exc_info.value.status_code == 403
        assert "Missing role: admin" in exc_info.value.detail
    
    def test_require_role_empty_roles(self):
        """Test require_role when user has no roles"""
        user = CurrentUser(
            sub="test-sub",
            name="Test User",
            email="test@example.com",
            roles=[]
        )
        
        role_checker = require_role("admin")
        
        with pytest.raises(HTTPException) as exc_info:
            role_checker(user)
        
        assert exc_info.value.status_code == 403
    
    def test_require_role_case_sensitive(self):
        """Test that require_role is case sensitive"""
        user = CurrentUser(
            sub="test-sub",
            name="Test User",
            email="test@example.com",
            roles=["Admin"]  # Capital A
        )
        
        role_checker = require_role("admin")  # lowercase a
        
        with pytest.raises(HTTPException) as exc_info:
            role_checker(user)
        
        assert exc_info.value.status_code == 403
