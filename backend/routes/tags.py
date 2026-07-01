from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..models import add_user_tag_def, get_all_user_tag_defs, delete_user_tag_def

router = APIRouter(prefix="/api", tags=["tags"])


class TagCreate(BaseModel):
    name: str


@router.get("/tags")
async def list_tags():
    return {"tags": get_all_user_tag_defs()}


@router.post("/tags")
async def create_tag(data: TagCreate):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tag name cannot be empty")
    tag = add_user_tag_def(name)
    if not tag:
        raise HTTPException(status_code=500, detail="Failed to create tag")
    return tag


@router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: int):
    ok = delete_user_tag_def(tag_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"ok": True}
