from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas.index import WhitelistedDomainCreate, WhitelistedDomainOut
from app.models.whitelisted_domain import WhitelistedDomain

router = APIRouter()

@router.post("/", response_model=WhitelistedDomainOut, status_code=status.HTTP_201_CREATED)
def whitelist_domain(
    entry: WhitelistedDomainCreate, 
    db: Session = Depends(get_db), 
    user = Depends(get_current_user)
):
    clean_domain = entry.domain.strip().lower()
    
    # Check if this domain is already whitelisted for this specific user
    existing = db.query(WhitelistedDomain).filter(
        WhitelistedDomain.user_id == user.id,
        WhitelistedDomain.domain == clean_domain
    ).first()
    
    if existing:
        return _to_out(existing)

    new_entry = WhitelistedDomain(
        user_id=user.id,
        domain=clean_domain
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return _to_out(new_entry)


@router.get("/", response_model=List[WhitelistedDomainOut])
def list_whitelisted_domains(db: Session = Depends(get_db), user = Depends(get_current_user)):
    items = db.query(WhitelistedDomain).filter(WhitelistedDomain.user_id == user.id).all()
    return [_to_out(item) for item in items]


@router.delete("/{entry_id}", status_code=status.HTTP_200_OK)
def remove_whitelisted_domain(
    entry_id: int, 
    db: Session = Depends(get_db), 
    user = Depends(get_current_user)
):
    item = db.query(WhitelistedDomain).filter(
        WhitelistedDomain.id == entry_id, 
        WhitelistedDomain.user_id == user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain exemption entry not found")
        
    db.delete(item)
    db.commit()
    return {"ok": True, "detail": "Domain exemption successfully revoked"}


def _to_out(item: WhitelistedDomain) -> WhitelistedDomainOut:
    return WhitelistedDomainOut(
        id=item.id,
        domain=item.domain,
        created_at=item.created_at.isoformat() if item.created_at else None,
        updated_at=item.updated_at.isoformat() if item.updated_at else None,
    )