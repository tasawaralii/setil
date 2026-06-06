from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas.index import PasswordEntryCreate, PasswordEntryOut
from app.models.password_entry import PasswordEntry

router = APIRouter()

@router.post("/", response_model=PasswordEntryOut)
def create_password(entry: PasswordEntryCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    pe = PasswordEntry(
        user_id=user.id,
        credential_username=entry.username,
        encrypted_password=entry.password,
        iv=entry.iv,
        origin=entry.origin,
    )
    db.add(pe)
    db.commit()
    db.refresh(pe)
    return _to_out(pe)


@router.get("/", response_model=List[PasswordEntryOut])
def list_passwords(db: Session = Depends(get_db), user=Depends(get_current_user)):
    items = db.query(PasswordEntry).filter(PasswordEntry.user_id == user.id).all()
    return [_to_out(item) for item in items]


@router.get("/{entry_id}", response_model=PasswordEntryOut)
def get_password(entry_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.query(PasswordEntry).filter(PasswordEntry.id == entry_id, PasswordEntry.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return _to_out(item)


@router.delete("/{entry_id}")
def delete_password(entry_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = db.query(PasswordEntry).filter(PasswordEntry.id == entry_id, PasswordEntry.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


def _to_out(item: PasswordEntry) -> PasswordEntryOut:
    return PasswordEntryOut(
        id=item.id,
        username=item.credential_username,
        password=item.encrypted_password,
        iv=item.iv,
        origin=item.origin,
        created_at=item.created_at.isoformat() if item.created_at else None,
        updated_at=item.updated_at.isoformat() if item.updated_at else None,
    )