from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class ScanCache(Base):
    __tablename__ = "scan_cache"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True) # URL or Hash
    status = Column(String) # safe, malicious, suspicious
    reason = Column(String, nullable=True)
    malicious_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
