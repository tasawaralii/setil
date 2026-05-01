from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def passwords_root() -> dict[str, str]:
    return {"message": "password routes ready"}