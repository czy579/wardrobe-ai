import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..models import (
    create_outfit, get_all_outfits, get_all_clothing,
    create_outfit_v2, get_outfit_by_id, update_outfit, delete_outfit,
    compute_outfit_tags, parse_outfit_items,
)

router = APIRouter(prefix="/api", tags=["outfit"])


class OutfitCreate(BaseModel):
    items: list[int]
    name: str = ""


class OutfitPosItem(BaseModel):
    clothing_id: int
    x: float = 0
    y: float = 0
    scale: float = 1
    rotation: float = 0
    z_index: int = 0


class OutfitCreateV2(BaseModel):
    name: str = ""
    items: list[OutfitPosItem]


class OutfitUpdate(BaseModel):
    name: Optional[str] = None
    items: Optional[list[OutfitPosItem]] = None


@router.post("/outfit/create")
async def create_outfit_endpoint(data: OutfitCreate):
    if not data.items:
        raise HTTPException(status_code=400, detail="Items list cannot be empty")
    wardrobe = {c["id"] for c in get_all_clothing()}
    for item_id in data.items:
        if item_id not in wardrobe:
            raise HTTPException(status_code=400, detail=f"Item {item_id} not found in wardrobe")
    outfit = create_outfit(data.items, data.name)
    outfit["items"] = [int(x) for x in outfit["items"].split(",") if x]
    return outfit


@router.get("/outfits")
async def list_outfits():
    outfits = get_all_outfits()
    all_items = {c["id"]: c for c in get_all_clothing()}
    result = []
    for outfit in outfits:
        parsed = outfit["items"]
        enriched = []
        for entry in parsed:
            if isinstance(entry, dict):
                cid = entry.get("clothing_id")
                clothing = all_items.get(cid)
                if clothing:
                    enriched.append({**entry, "clothing": clothing})
            else:
                clothing = all_items.get(entry)
                if clothing:
                    enriched.append({"clothing_id": entry, "clothing": clothing, "x": 0, "y": 0, "scale": 1, "z_index": 0})
        tags = compute_outfit_tags(enriched)
        result.append({
            "id": outfit["id"],
            "name": outfit["name"],
            "items": enriched,
            "tags": tags,
            "created_at": outfit["created_at"],
        })
    return {"outfits": result}


@router.post("/outfits")
async def create_outfit_v2_endpoint(data: OutfitCreateV2):
    if not data.items:
        raise HTTPException(status_code=400, detail="Items list cannot be empty")
    wardrobe = {c["id"] for c in get_all_clothing()}
    for item in data.items:
        if item.clothing_id not in wardrobe:
            raise HTTPException(status_code=400, detail=f"Item {item.clothing_id} not found in wardrobe")
    items_dict = [item.model_dump() for item in data.items]
    outfit = create_outfit_v2(data.name, items_dict)
    return outfit


@router.get("/outfits/{outfit_id}")
async def get_outfit(outfit_id: int):
    outfit = get_outfit_by_id(outfit_id)
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    all_items = {c["id"]: c for c in get_all_clothing()}
    parsed = parse_outfit_items(outfit["items"])
    enriched = []
    for entry in parsed:
        if isinstance(entry, dict):
            cid = entry.get("clothing_id")
            clothing = all_items.get(cid)
            enriched.append({**entry, "clothing": clothing})
        else:
            clothing = all_items.get(entry)
            enriched.append({"clothing_id": entry, "clothing": clothing, "x": 0, "y": 0, "scale": 1, "z_index": 0})
    tags = compute_outfit_tags(enriched)
    return {
        "id": outfit["id"],
        "name": outfit["name"],
        "items": enriched,
        "tags": tags,
        "created_at": outfit["created_at"],
    }


@router.put("/outfits/{outfit_id}")
async def update_outfit_endpoint(outfit_id: int, data: OutfitUpdate):
    outfit = get_outfit_by_id(outfit_id)
    if not outfit:
        raise HTTPException(status_code=404, detail="Outfit not found")
    name = data.name if data.name is not None else outfit["name"]
    items = [item.model_dump() for item in data.items] if data.items is not None else json.loads(outfit["items"])
    updated = update_outfit(outfit_id, name, items)
    if not updated:
        raise HTTPException(status_code=500, detail="Update failed")
    return updated


@router.delete("/outfits/{outfit_id}")
async def delete_outfit_endpoint(outfit_id: int):
    if not delete_outfit(outfit_id):
        raise HTTPException(status_code=404, detail="Outfit not found")
    return {"message": "已删除"}
