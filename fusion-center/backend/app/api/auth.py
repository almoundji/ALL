from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import CLASSIFICATION_LABELS, CLASSIFICATIONS, create_access_token, verify_password
from ..models import User
from ..schemas import Token, UserOut
from ..services import audit
from .deps import client_ip, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.username == form.username)).scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password) or not user.is_active:
        audit.record(db, form.username, "LOGIN_FAILED", ip=client_ip(request))
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Identifiants incorrects")
    audit.record(db, user.username, "LOGIN", "user", user.id, ip=client_ip(request))
    db.commit()
    return Token(access_token=create_access_token(user.username, {"role": user.role, "clr": user.clearance}))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/meta")
def meta():
    from ..models import ENTITY_TYPES, RELATION_TYPES, SOURCE_TYPES
    return {
        "classifications": [{"level": k, "code": v, "label": CLASSIFICATION_LABELS[k]} for k, v in CLASSIFICATIONS.items()],
        "entity_types": list(ENTITY_TYPES),
        "relation_types": list(RELATION_TYPES),
        "source_types": list(SOURCE_TYPES),
    }
