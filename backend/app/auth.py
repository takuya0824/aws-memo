import httpx
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()

def get_cognito_public_keys():
    url = (
        f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/"
        f"{settings.cognito_user_pool_id}/.well-known/jwks.json"
    )
    response = httpx.get(url)
    return response.json()["keys"]

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    token = credentials.credentials
    try:
        keys = get_cognito_public_keys()
        header = jwt.get_unverified_header(token)
        key = next((k for k in keys if k["kid"] == header["kid"]), None)
        if not key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        payload = jwt.decode(token, key, algorithms=["RS256"], audience=settings.cognito_client_id)
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
