from fastapi import FastAPI, Depends, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from app.auth.deps import verify_token, require_role, CurrentUser
import os

# Check if mock authentication is enabled
USE_MOCK_AUTH = os.getenv("USE_MOCK_AUTH", "false").lower() == "true"

if USE_MOCK_AUTH:
    from app.auth.mock_auth import (
        authenticate_user, create_session, delete_session,
        get_all_mock_users, MockLoginRequest, MockLoginResponse, MockUserResponse
    )

router = APIRouter(prefix="/auth")


@router.get("/me")
def me(user: CurrentUser = Depends(verify_token)):
    return {"sub": user.sub, "name": user.name, "email": user.email, "roles": user.roles}


@router.get("/admin-test")
def admin_only(_user: CurrentUser = Depends(require_role("Team.Admin"))):
    return {"ok": True, "msg": "You are Team.Admin"}


# Mock authentication endpoints (only available when USE_MOCK_AUTH=true)
if USE_MOCK_AUTH:
    @router.post("/login", response_model=MockLoginResponse)
    def mock_login(request: MockLoginRequest):
        """
        Mock login endpoint for development/demo purposes.

        Accepts username (email) and password, returns a session token.
        """
        user_data = authenticate_user(request.username, request.password)
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Create session
        token = create_session(user_data)

        # Return response
        return MockLoginResponse(
            token=token,
            user=MockUserResponse(
                id=user_data["entra_object_id"],
                email=user_data["email"],
                display_name=user_data["display_name"],
                entra_object_id=user_data["entra_object_id"],
                role=user_data["role"]
            )
        )

    @router.post("/logout")
    def mock_logout(token: str = Query(...)):
        """
        Mock logout endpoint.

        Invalidates the session token.
        """
        delete_session(token)
        return {"message": "Logged out successfully"}

    @router.get("/mock-users")
    def list_mock_users():
        """
        List all available mock users for testing.

        Returns user information without passwords.
        """
        return get_all_mock_users()
