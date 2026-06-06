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


class UserCreate(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordEntryBase(BaseModel):
    username: str | None = None
    password: str
    iv: list[int]
    origin: str


class PasswordEntryCreate(PasswordEntryBase):
    pass


class PasswordEntryOut(PasswordEntryBase):
    id: int
    created_at: str | None = None
    updated_at: str | None = None

    class Config:
        orm_mode = True