from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def url_check_root() -> dict[str, str]:
    return {"message": "url check routes ready"}