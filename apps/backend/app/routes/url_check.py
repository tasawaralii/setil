# app/routes/phishing.py
from fastapi import APIRouter, Depends, Query
from app.schemas.index import PhishingUrlCheckResponse
from app.core.database import get_db
from app.core.config import Settings, get_settings
from sqlalchemy.orm import Session
from app.models.scan_cache import ScanCache
import httpx
import base64

router = APIRouter()

VT_BASE_URL = "https://www.virustotal.com/api/v3"

def get_vt_headers(api_key: str):
    return {
        "x-apikey": api_key,
        "accept": "application/json"
    }

def get_cached_result(db: Session, key: str) -> PhishingUrlCheckResponse | None:
    cached = db.query(ScanCache).filter(ScanCache.key == key).first()
    if cached:
        return PhishingUrlCheckResponse(
            status=cached.status,
            reason=f"{cached.reason} (cached)"
        )
    return None

def save_to_cache(db: Session, key: str, status: str, reason: str):
    cached = db.query(ScanCache).filter(ScanCache.key == key).first()
    if not cached:
        cached = ScanCache(key=key)
        db.add(cached)
    cached.status = status
    cached.reason = reason
    db.commit()

@router.get("/check-url", response_model=PhishingUrlCheckResponse)
async def url_check_root(
    url: str = Query(...),
    api_key: str | None = Query(None),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db)
):
    target_url = url.lower()

    # 1. Local Heuristics (Instant catch for obvious threats)
    suspicious_keywords = ["verify-account", "secure-update", "banking-auth", "deadtoons"]
    if "g00gle" in target_url or "faceboook" in target_url:
        return {"status": "malicious", "reason": "Typosquatting detected"}
    if any(keyword in target_url for keyword in suspicious_keywords):
        return {"status": "warning", "reason": "Suspicious keywords in URL"}

    # 2. Database Cache Check
    cached = get_cached_result(db, target_url)
    if cached:
        return cached

    # 3. VirusTotal API Check
    vt_key = api_key or settings.virustotal_api_key
    if not vt_key:
        return {"status": "safe", "reason": "No VT key; skipped advanced scan"}

    url_id = base64.urlsafe_b64encode(target_url.encode()).decode().strip("=")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{VT_BASE_URL}/urls/{url_id}",
                headers=get_vt_headers(vt_key)
            )
            
            if response.status_code == 200:
                data = response.json()
                stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                
                malicious_count = stats.get("malicious", 0)
                suspicious_count = stats.get("suspicious", 0)
                
                if malicious_count > 0:
                    save_to_cache(db, target_url, "malicious", "Flagged by VirusTotal")
                    return {"status": "malicious", "reason": "Flagged by VirusTotal"}
                elif suspicious_count > 0:
                    save_to_cache(db, target_url, "warning", "Suspicious reputation on VT")
                    return {"status": "warning", "reason": "Suspicious reputation on VT"}

            save_to_cache(db, target_url, "safe", "VT flagged as safe")
            return {"status": "safe", "reason": "No immediate threats found"}
            
        except Exception as e:
            return {"status": "safe", "reason": f"Scan error: {str(e)}"}