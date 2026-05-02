from fastapi import APIRouter, Query
from app.schemas.index import PhishingUrlCheckRequest, PhishingUrlCheckResponse
from typing import Annotated

router = APIRouter()


@router.get("/check-url", response_model=PhishingUrlCheckResponse)
def url_check_root(query: Annotated[PhishingUrlCheckRequest, Query()]) -> dict[str, str]:
    url = query.url.lower()

    suspicious_keywords = ["verify", "secure", "update", "banking"]
    is_suspicious = any(keyword in url for keyword in suspicious_keywords)

    if "g00gle" in url or "faceboook" in url:
        return {"status": "malicious", "reason": "Typosquatting detected"}

    if is_suspicious:
        return {"status": "warning", "reason": "Suspicious keywords in URL"}

    return {"status": "safe", "reason": "No immediate threats found"}
