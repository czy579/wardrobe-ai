import os
import json
import traceback
from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from ..models import add_clothing, get_all_clothing, get_clothing_by_id, update_clothing, search_clothing, delete_clothing
from ..services.storage_service import save_original, save_processed, get_original_url, get_processed_url, get_processed_path
from ..services.image_service import process_clothing_image, crop_transparent
from ..services.ai_service import classify_clothing, extract_color

router = APIRouter(prefix="/api", tags=["clothing"])


@router.post("/upload-clothing")
async def upload_clothing(
    file: UploadFile = File(...),
    sub_category: Optional[str] = Form(None),
    fit: Optional[str] = Form(None),
    style_tags: Optional[str] = Form(None),
    color_primary: Optional[str] = Form(None),
    color_tone: Optional[str] = Form(None),
    user_tags: Optional[str] = Form(None),
):
    try:
        contents = await file.read()

        original_name = save_original(contents, file.filename)
        original_url = get_original_url(original_name)

        processed_bytes = process_clothing_image(contents)
        processed_name = save_processed(processed_bytes)
        processed_url = get_processed_url(processed_name)

        full_path = get_processed_path(processed_name)

        category = classify_clothing(full_path, file.filename)
        color = extract_color(full_path)

        parsed_style = json.loads(style_tags) if style_tags else None
        parsed_user = json.loads(user_tags) if user_tags else None

        clothing = add_clothing(
            image_url=processed_url,
            original_image_url=original_url,
            processed_image_url=processed_url,
            category=category,
            color=color,
            sub_category=sub_category or "",
            fit=fit or "regular",
            style_tags=parsed_style or [],
            color_primary=color_primary or "",
            color_tone=color_tone or "",
            user_tags=parsed_user or [],
        )
        return clothing
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"detail": str(e), "traceback": traceback.format_exc()})


@router.put("/clothing/{clothing_id}")
async def update_clothing_endpoint(clothing_id: int, body: dict):
    item = get_clothing_by_id(clothing_id)
    if not item:
        raise HTTPException(status_code=404, detail="Clothing not found")
    updated = update_clothing(clothing_id, **body)
    return updated


@router.post("/clothing/{clothing_id}/refine")
async def refine_clothing(clothing_id: int, file: UploadFile = File(...)):
    item = get_clothing_by_id(clothing_id)
    if not item:
        raise HTTPException(status_code=404, detail="Clothing not found")
    contents = await file.read()
    try:
        from PIL import Image
        from io import BytesIO
        img = Image.open(BytesIO(contents)).convert("RGBA")
        img = crop_transparent(img)
        buf = BytesIO()
        img.save(buf, format="PNG")
        contents = buf.getvalue()
    except Exception:
        pass
    processed_name = save_processed(contents)
    processed_url = get_processed_url(processed_name)
    update_clothing(clothing_id, image_url=processed_url, processed_image_url=processed_url)
    return {"processed_image_url": processed_url}


@router.get("/clothing/{clothing_id}")
async def get_clothing(clothing_id: int):
    item = get_clothing_by_id(clothing_id)
    if not item:
        raise HTTPException(status_code=404, detail="Clothing not found")
    return item


@router.get("/wardrobe")
async def get_wardrobe(category: Optional[str] = Query(None)):
    items = get_all_clothing(category)
    return {"items": items}


@router.delete("/clothing/{clothing_id}")
async def delete_clothing_endpoint(clothing_id: int):
    item = get_clothing_by_id(clothing_id)
    if not item:
        raise HTTPException(status_code=404, detail="Clothing not found")
    deleted = delete_clothing(clothing_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="删除失败")
    return {"message": "已删除"}


@router.get("/search-clothing")
async def search_clothing_endpoint(
    keyword: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sub_category: Optional[str] = Query(None),
    fit: Optional[str] = Query(None),
    style_tags: Optional[str] = Query(None),
    color_tone: Optional[str] = Query(None),
    user_tags: Optional[str] = Query(None),
):
    parsed_style = json.loads(style_tags) if style_tags else None
    parsed_user = json.loads(user_tags) if user_tags else None
    items = search_clothing(
        keyword=keyword,
        category=category,
        sub_category=sub_category,
        fit=fit,
        style_tags=parsed_style,
        color_tone=color_tone,
        user_tags=parsed_user,
    )
    return {"items": items}


@router.get("/diagnose-upload")
async def diagnose_upload():
    from PIL import Image
    from io import BytesIO
    import os
    result = {}
    result["PIL_available"] = True
    result["PIL_version"] = Image.__version__
    result["cwd"] = os.getcwd()
    result["file_dir"] = os.path.dirname(__file__)
    try:
        from rembg import remove
        result["rembg_available"] = True
    except ImportError:
        result["rembg_available"] = False
    except Exception as e:
        result["rembg_available"] = f"Error: {e}"
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    result["uploads_dir"] = os.path.abspath(uploads_dir)
    result["uploads_exists"] = os.path.exists(uploads_dir)
    result["original_dir_exists"] = os.path.exists(os.path.join(os.path.dirname(__file__), "..", "uploads", "original"))
    result["processed_dir_exists"] = os.path.exists(os.path.join(os.path.dirname(__file__), "..", "uploads", "processed"))
    return result
