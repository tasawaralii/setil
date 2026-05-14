from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str
    
class PhishingUrlCheckRequest(BaseModel):
    url: str
    
class PhishingUrlCheckResponse(BaseModel):
    status: str
    reason: str

class DownloadCheckRequest(BaseModel):
    url: str | None = None
    hash: str | None = None

class DownloadCheckResponse(BaseModel):
    status: str # "safe", "malicious", "suspicious", "error"
    reason: str | None = None
    malicious_count: int = 0