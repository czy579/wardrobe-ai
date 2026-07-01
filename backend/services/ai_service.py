import os
import re
from typing import Optional

CATEGORY_KEYWORDS = {
    "tops": ["shirt", "tshirt", "t-shirt", "top", "blouse", "polo", "sweater", "hoodie", "tank", "crop", "vest"],
    "bottoms": ["pants", "jeans", "shorts", "skirt", "trousers", "leggings", "joggers", "sweatpants", "chino"],
    "shoes": ["shoe", "sneaker", "boot", "sandal", "loafer", "heel", "flipflop", "slipper"],
    "outerwear": ["jacket", "coat", "blazer", "hoodie", "parka", "windbreaker", "bomber", "cardigan"],
    "accessories": ["hat", "cap", "bag", "belt", "scarf", "watch", "sunglasses", "glasses", "jewelry", "necklace"],
}


def classify_by_keywords(filename: str) -> str:
    name = filename.lower().replace("_", " ").replace("-", " ")
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", name):
                return category
    return "other"


def classify_clothing(image_path: str, filename: str) -> str:
    clip_result = _classify_with_clip(image_path)
    if clip_result and clip_result != "other":
        return clip_result
    return classify_by_keywords(filename)


def _classify_with_clip(image_path: str) -> Optional[str]:
    try:
        import clip
        import torch
        from PIL import Image

        device = "cuda" if torch.cuda.is_available() else "cpu"
        model, preprocess = clip.load("ViT-B/32", device=device)

        categories = ["tops", "bottoms", "shoes", "outerwear", "accessories"]
        category_descriptions = [
            "a photo of a top or shirt clothing item",
            "a photo of bottom or pants clothing item",
            "a photo of shoes or footwear",
            "a photo of outerwear like a jacket or coat",
            "a photo of an accessory like a hat or bag",
        ]

        image = preprocess(Image.open(image_path)).unsqueeze(0).to(device)
        text_tokens = clip.tokenize(category_descriptions).to(device)

        with torch.no_grad():
            logits_per_image, _ = model(image, text_tokens)
            probs = logits_per_image.softmax(dim=-1).cpu().numpy()[0]

        best_idx = int(probs.argmax())
        if probs[best_idx] > 0.3:
            return categories[best_idx]
        return None
    except ImportError:
        return None
    except Exception as e:
        print(f"[CLIP error] {e}")
        return None


def extract_color(image_path: str) -> Optional[str]:
    try:
        from PIL import Image
        import colorsys

        img = Image.open(image_path).convert("RGB")
        pixels = list(img.getdata())
        r, g, b = 0, 0, 0
        count = 0
        for pr, pg, pb in pixels:
            if pr > 10 or pg > 10 or pb > 10:
                r += pr
                g += pg
                b += pb
                count += 1
        if count == 0:
            return None
        r, g, b = r // count, g // count, b // count
        h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)

        if l < 0.15:
            return "black"
        if l > 0.85:
            return "white"
        if s < 0.15:
            return "gray"

        h = h * 360
        if h < 15 or h >= 345:
            return "red"
        if h < 45:
            return "orange"
        if h < 75:
            return "yellow"
        if h < 150:
            return "green"
        if h < 200:
            return "cyan"
        if h < 255:
            return "blue"
        if h < 300:
            return "purple"
        return "pink"
    except ImportError:
        return None
    except Exception as e:
        print(f"[color extract error] {e}")
        return None
