from fastapi import APIRouter, Depends, HTTPException, Query
from app.schemas.index import DownloadCheckRequest, DownloadCheckResponse
from app.core.config import Settings, get_settings
import httpx
import base64
from typing import Annotated

router = APIRouter()

VT_BASE_URL = "https://www.virustotal.com/api/v3"

def get_vt_headers(api_key: str):
    return {
        "x-apikey": api_key,
        "accept": "application/json"
    }

@router.get("/check-url", response_model=DownloadCheckResponse)
async def check_url(
    url: str = Query(...),
    api_key: str | None = Query(None),
    settings: Settings = Depends(get_settings)
):
    vt_key = api_key or settings.virustotal_api_key
    if not vt_key:
        return DownloadCheckResponse(status="error", reason="VT API key not configured")

    # VT requires URL to be base64 encoded without padding
    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{VT_BASE_URL}/urls/{url_id}",
                headers=get_vt_headers(vt_key)
            )
            
            if response.status_code == 404:
                # URL not in VT yet, we could submit it, but for now let's say safe or unknown
                return DownloadCheckResponse(status="safe", reason="URL not found in VT database")
            
            if response.status_code != 200:
                return DownloadCheckResponse(status="error", reason=f"VT API returned {response.status_code}")
            
            data = response.json()
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            malicious = stats.get("malicious", 0)
            suspicious = stats.get("suspicious", 0)
            
            if malicious > 0:
                return DownloadCheckResponse(status="malicious", malicious_count=malicious, reason="VT flagged this URL as malicious")
            elif suspicious > 0:
                return DownloadCheckResponse(status="suspicious", malicious_count=suspicious, reason="VT flagged this URL as suspicious")
            
            return DownloadCheckResponse(status="safe", reason="VT flagged this URL as safe")
            
        except Exception as e:
            return DownloadCheckResponse(status="error", reason=str(e))

@router.get("/check-hash", response_model=DownloadCheckResponse)
async def check_hash(
    hash: str = Query(...),
    api_key: str | None = Query(None),
    settings: Settings = Depends(get_settings)
):
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
                return DownloadCheckResponse(status="safe", reason="File hash not found in VT database")
            
            if response.status_code != 200:
                return DownloadCheckResponse(status="error", reason=f"VT API returned {response.status_code}")
            
            data = response.json()
            stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
            malicious = stats.get("malicious", 0)
            suspicious = stats.get("suspicious", 0)
            
            if malicious > 0:
                return DownloadCheckResponse(status="malicious", malicious_count=malicious, reason="VT flagged this file as malicious")
            elif suspicious > 0:
                return DownloadCheckResponse(status="suspicious", malicious_count=suspicious, reason="VT flagged this file as suspicious")
            
            return DownloadCheckResponse(status="safe", reason="VT flagged this file as safe")
            
        except Exception as e:
            return DownloadCheckResponse(status="error", reason=str(e))
