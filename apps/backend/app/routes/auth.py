from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.index import UserCreate, Token
from app.models.user import User, UserStat
from app.core.deps import get_current_user
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> dict:
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(email=user_in.email, hashed_password=hash_password(user_in.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(user_in: UserCreate, db: Session = Depends(get_db)) -> dict:
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(str(user.id))
    return {"access_token": token, "token_type": "bearer"}

@router.patch("/sync-stats")
def sync_user_stats(stats_payload: dict[str, int], db: Session = Depends(get_db), user = Depends(get_current_user)):
    for key, value in stats_payload.items():
        record = db.query(UserStat).filter(UserStat.user_id == user.id, UserStat.stat_key == key).first()
        if record:
            # Prevent local extension counts from overriding a higher cloud count
            record.stat_value = max(record.stat_value, value)
        else:
            db.add(UserStat(user_id=user.id, stat_key=key, stat_value=value))
    db.commit()
    
    # Return the entire true master state back to the extension to overwrite its local numbers
    all_stats = db.query(UserStat).filter(UserStat.user_id == user.id).all()
    return {item.stat_key: item.stat_value for item in all_stats}