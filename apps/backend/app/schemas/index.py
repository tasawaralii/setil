from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str
    
class PhishingUrlCheckRequest(BaseModel):
    url: str
    
class PhishingUrlCheckResponse(BaseModel):
    status: str
    reason: str