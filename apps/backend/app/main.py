from fastapi import FastAPI

from app.routes.auth import router as auth_router
from app.routes.health import router as health_router
from app.routes.passwords import router as passwords_router
from app.routes.url_check import router as url_check_router

app = FastAPI(title="Setil API", version="0.0.0")

app.include_router(health_router)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(passwords_router, prefix="/passwords", tags=["passwords"])
app.include_router(url_check_router, tags=["url-check"])