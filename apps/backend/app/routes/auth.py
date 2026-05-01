from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def auth_root() -> dict[str, str]:
    return {"message": "auth routes ready"}