from fastapi import APIRouter, Query
from typing import Optional
from ..services.outfit_service import recommend_outfit

router = APIRouter(prefix="/api", tags=["recommend"])


@router.get("/recommend-outfit")
async def get_recommendations(
    weather: Optional[str] = Query(None, pattern="^(hot|cold|normal)$"),
    style: Optional[str] = Query(None, pattern="^(casual|formal)$"),
):
    outfits = recommend_outfit(weather, style)
    return {
        "recommendations": [
            {"id": idx, "items": combo, "total_items": len(combo)}
            for idx, combo in enumerate(outfits)
        ]
    }
