from typing import Optional, List
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from authlib.jose import JsonWebToken
import httpx
import os
from app.core.azure_config import AZ_CLIENT_ID, AZ_ISSUER, AZ_JWKS_URL

# Check if mock authentication is enabled
USE_MOCK_AUTH = os.getenv("USE_MOCK_AUTH", "false").lower() == "true"

if USE_MOCK_AUTH:
    from app.auth.mock_auth import get_session

bearer_scheme = HTTPBearer(auto_error=False)
jwt = JsonWebToken(["RS256", "RS512"])


@lru_cache(maxsize=1)
def _fetch_jwks():
    with httpx.Client(timeout=5) as client:
        resp = client.get(AZ_JWKS_URL)
        resp.raise_for_status()
        return resp.json()


class CurrentUser:
    def __init__(self, sub: str, name: Optional[str], email: Optional[str], roles: List[str]):
        self.sub = sub
        self.name = name
        self.email = email
        self.roles = roles or []


def verify_token(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)) -> CurrentUser:
    if not creds or creds.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = creds.credentials

    # If mock authentication is enabled and token is a mock token
    if USE_MOCK_AUTH and token.startswith("mock-session-"):
        user_data = get_session(token)
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        # Map mock roles to format expected by frontend
        return CurrentUser(
            sub=user_data["entra_object_id"],
            name=user_data["display_name"],
            email=user_data["email"],
            roles=[user_data["role"]],
        )

    # Otherwise, use real Entra ID authentication
    jwks = _fetch_jwks()

    try:
        claims = jwt.decode(token, jwks)
        claims.validate()  # exp/nbf/iat
        if claims.get("iss") != AZ_ISSUER:
            raise HTTPException(status_code=401, detail="Invalid issuer")
        aud = claims.get("aud")
        if isinstance(aud, list):
            ok = AZ_CLIENT_ID in aud
        else:
            ok = (aud == AZ_CLIENT_ID)
        if not ok:
            raise HTTPException(status_code=401, detail="Invalid audience")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    email = claims.get("preferred_username") or claims.get("email")
    roles = claims.get("roles", []) or []  # App Roles wie "Team.Admin"
    return CurrentUser(
        sub=claims.get("sub"),
        name=claims.get("name"),
        email=email,
        roles=roles,
    )


def require_role(role: str):
    def _dep(user: CurrentUser = Depends(verify_token)) -> CurrentUser:
        if role not in user.roles:
            raise HTTPException(status_code=403, detail=f"Missing role: {role}")
        return user
    return _dep
