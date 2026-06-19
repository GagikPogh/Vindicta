from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.security import create_access_token, decode_token
from app.database import get_db
from app.models import User
from app.schemas import (
    MessageResponse,
    OAuthCallbackRequest,
    OAuthUrlResponse,
    TokenRefreshRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        user = await AuthService.register(db, payload.email, payload.password, payload.full_name)
        tokens = AuthService.create_tokens(user)
        return TokenResponse(**tokens)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await AuthService.authenticate(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    return TokenResponse(**AuthService.create_tokens(user))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.refresh_token)
    if not token_data or token_data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    from sqlalchemy import select
    import uuid

    user_id = token_data.get("sub")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(str(user.id), {"email": user.email}),
        refresh_token=payload.refresh_token,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/google/url", response_model=OAuthUrlResponse)
async def google_auth_url(redirect_uri: str = Query(...)):
    try:
        return OAuthUrlResponse(url=AuthService.get_google_auth_url(redirect_uri))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.post("/google/callback", response_model=TokenResponse)
async def google_callback(payload: OAuthCallbackRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await AuthService.handle_google_callback(db, payload.code, payload.redirect_uri)
        return TokenResponse(**AuthService.create_tokens(user))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/apple/url", response_model=OAuthUrlResponse)
async def apple_auth_url(redirect_uri: str = Query(...)):
    try:
        return OAuthUrlResponse(url=AuthService.get_apple_auth_url(redirect_uri))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


@router.post("/apple/callback", response_model=TokenResponse)
async def apple_callback(payload: OAuthCallbackRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await AuthService.handle_apple_callback(db, payload.code, payload.redirect_uri)
        return TokenResponse(**AuthService.create_tokens(user))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    return MessageResponse(message="Logged out successfully")
