from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.health import router as health_router
from app.routes.passwords import router as passwords_router
from app.routes.url_check import router as url_check_router
from app.routes.downloads import router as downloads_router
from app.routes.whitelisted_domains import router as whitelisted_domains_router

app = FastAPI(title="Setil API", version="0.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(passwords_router, prefix="/passwords", tags=["passwords"])
app.include_router(url_check_router, tags=["url-check"])
app.include_router(downloads_router, prefix="/downloads", tags=["downloads"])
app.include_router(whitelisted_domains_router, prefix="/whitelisted-domains", tags=["whitelisted-domains"])