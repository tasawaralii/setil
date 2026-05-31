from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas.index import DownloadCheckRequest, DownloadCheckResponse
from app.core.database import Settings, get_settings, get_db
from sqlalchemy.orm import Session
from app.models.scan_cache import ScanCache
import httpx
import base64
import hashlib
import os

router = APIRouter()

VT_BASE_URL = "https://www.virustotal.com/api/v3"
DANGEROUS_EXTENSIONS = {".exe", ".scr", ".bat", ".vbs", ".js", ".msi", ".ps1", ".jar"}

def get_vt_headers(api_key: str):
    return {
        "x-apikey": api_key,
        "accept": "application/json"
    }

def get_cached_result(db: Session, key: str) -> DownloadCheckResponse | None:
    cached = db.query(ScanCache).filter(ScanCache.key == key).first()
    if cached:
        return DownloadCheckResponse(
            status=cached.status,
            reason=f"{cached.reason} (cached)",
            malicious_count=cached.malicious_count
        )
    return None

def save_to_cache(db: Session, key: str, result: DownloadCheckResponse):
    # Update if exists, else create
    cached = db.query(ScanCache).filter(ScanCache.key == key).first()
    if not cached:
        cached = ScanCache(key=key)
        db.add(cached)
    
    cached.status = result.status
    cached.reason = result.reason
    cached.malicious_count = result.malicious_count
    db.commit()

@router.get("/check-url", response_model=DownloadCheckResponse)
async def check_url(
    url: str = Query(...),
    api_key: str | None = Query(None),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db)
):
    # 1. Local Heuristics (Extension Check)
    path = url.split("?")[0]
    ext = os.path.splitext(path)[1].lower()
    
    # Check for double extensions like file.pdf.exe
    if "." in os.path.splitext(path)[0]:
        inner_ext = os.path.splitext(os.path.splitext(path)[0])[1].lower()
        if inner_ext and ext in DANGEROUS_EXTENSIONS:
            return DownloadCheckResponse(status="suspicious", reason=f"Double extension detected: {inner_ext}{ext}")

    # 2. Check Cache
    cached = get_cached_result(db, url)
    if cached:
        return cached

    vt_key = api_key or settings.virustotal_api_key
    if not vt_key:
        return DownloadCheckResponse(status="error", reason="VT API key not configured")

    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
    
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            # 3. Check URL Reputation
            response = await client.get(
                f"{VT_BASE_URL}/urls/{url_id}",
                headers=get_vt_headers(vt_key)
            )
            
            data = None
            if response.status_code == 200:
                data = response.json()
                attributes = data.get("data", {}).get("attributes", {})
                stats = attributes.get("last_analysis_stats", {})
                
                if stats.get("malicious", 0) > 0:
                    res = DownloadCheckResponse(status="malicious", malicious_count=stats["malicious"], reason="VT flagged this URL as malicious")
                    save_to_cache(db, url, res)
                    return res
                
                # If VT already has the hash, check it
                file_hash = attributes.get("last_http_response_content_sha256")
                if file_hash:
                    hash_response = await check_hash(file_hash, vt_key, settings, db)
                    if hash_response.status != "safe":
                        save_to_cache(db, url, hash_response)
                        return hash_response

            # 4. Fetch and Hash Fallback
            try:
                async with client.stream("GET", url) as r:
                    if r.status_code == 200:
                        content_length = r.headers.get("Content-Length")
                        if content_length and int(content_length) > 20 * 1024 * 1024:
                            res = DownloadCheckResponse(status="safe", reason="File too large to scan, but URL is safe")
                            save_to_cache(db, url, res)
                            return res
                        
                        sha256_hash = hashlib.sha256()
                        bytes_read = 0
                        async for chunk in r.iter_bytes():
                            sha256_hash.update(chunk)
                            bytes_read += len(chunk)
                            if bytes_read > 20 * 1024 * 1024:
                                break
                        
                        computed_hash = sha256_hash.hexdigest()
                        res = await check_hash(computed_hash, vt_key, settings, db)
                        save_to_cache(db, url, res)
                        return res
            except Exception:
                if data:
                    res = DownloadCheckResponse(status="safe", reason="URL is clean, could not verify file content")
                    save_to_cache(db, url, res)
                    return res
                return DownloadCheckResponse(status="safe", reason="URL not found in VT and backend could not fetch file")

            res = DownloadCheckResponse(status="safe", reason="No immediate threats found")
            save_to_cache(db, url, res)
            return res
            
        except Exception as e:
            return DownloadCheckResponse(status="error", reason=str(e))

@router.get("/check-hash", response_model=DownloadCheckResponse)
async def check_hash(
    hash: str = Query(...),
    api_key: str | None = Query(None),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db)
):
    # Check Cache
    cached = get_cached_result(db, hash)
    if cached:
        return cached

    vt_key = api_key or settings.virustotal_api_key
    if not vt_key:
        return DownloadCheckResponse(status="error", reason="VT API key not configured")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{VT_BASE_URL}/files/{hash}",
                headers=get_vt_headers(vt_key)
            )
            
            if response.status_code == 404:
                res = DownloadCheckResponse(status="safe", reason="File hash not found in VT database")
                save_to_cache(db, hash, res)
                return res
            
            if response.status_code != 200:
                return DownloadCheckResponse(status="error", reason=f"VT API returned {response.status_code}")
            
            data = response.json()
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            malicious = stats.get("malicious", 0)
            suspicious = stats.get("suspicious", 0)
            
            res = None
            if malicious > 0:
                res = DownloadCheckResponse(status="malicious", malicious_count=malicious, reason="VT flagged this file as malicious")
            elif suspicious > 0:
                res = DownloadCheckResponse(status="suspicious", malicious_count=suspicious, reason="VT flagged this file as suspicious")
            else:
                res = DownloadCheckResponse(status="safe", reason="VT flagged this file as safe")
            
            save_to_cache(db, hash, res)
            return res
            
        except Exception as e:
            return DownloadCheckResponse(status="error", reason=str(e))
