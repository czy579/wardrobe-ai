import random
from typing import Optional
from ..models import get_all_clothing


def _get_tag(item: dict, field: str, default=None):
    val = item.get(field, default)
    if isinstance(val, list):
        return val
    return default or []


def recommend_outfit(weather: Optional[str] = None, style: Optional[str] = None) -> list[dict]:
    all_items = get_all_clothing()
    if not all_items:
        return []

    by_category: dict[str, list[dict]] = {}
    for item in all_items:
        by_category.setdefault(item["category"], []).append(item)

    tops = by_category.get("tops", [])
    bottoms = by_category.get("bottoms", [])
    shoes = by_category.get("shoes", [])
    outerwear = by_category.get("outerwear", [])
    accessories = by_category.get("accessories", [])

    candidates: list[list[dict]] = []

    if weather == "hot":
        combos = _build_combos(
            tops=_filter_light_tops(tops),
            bottoms=_filter_light_bottoms(bottoms),
            shoes=shoes,
        )
        candidates.extend(combos)
    elif weather == "cold":
        if outerwear:
            combos = _build_combos(tops=tops, bottoms=bottoms, shoes=shoes, outerwear=outerwear)
            candidates.extend(combos)
        combos = _build_combos(tops=tops, bottoms=bottoms, shoes=shoes)
        candidates.extend(combos)
    else:
        combos = _build_combos(tops=tops, bottoms=bottoms, shoes=shoes)
        candidates.extend(combos)
        if outerwear:
            combos = _build_combos(tops=tops, bottoms=bottoms, shoes=shoes, outerwear=outerwear)
            candidates.extend(combos)

    if style == "formal":
        formal_combos = _build_formal_combos(tops, bottoms, shoes, outerwear)
        candidates.extend(formal_combos)
    elif style == "casual":
        casual_combos = _build_casual_combos(tops, bottoms, shoes)
        candidates.extend(casual_combos)

    # ---- tag-based scoring ----
    if style:
        style_lower = style.lower()
        scored = []
        for combo in candidates:
            score = _score_combo_style(combo, style_lower)
            scored.append((score, combo))
        scored.sort(key=lambda x: -x[0])
        candidates = [c for _, c in scored]

    if not candidates:
        candidates = _build_combos(tops, bottoms, shoes)
    if not candidates and tops and bottoms:
        candidates = [[tops[0], bottoms[0]]]

    # deduplicate (by id set)
    seen = set()
    deduped = []
    for combo in candidates:
        key = tuple(sorted(c["id"] for c in combo))
        if key not in seen:
            seen.add(key)
            deduped.append(combo)
    candidates = deduped

    random.shuffle(candidates)
    return candidates[:5]


def _score_combo_style(combo: list[dict], target_style: str) -> int:
    score = 0
    for item in combo:
        tags = _get_tag(item, "style_tags")
        if target_style in [t.lower() for t in tags]:
            score += 3
        fit = item.get("fit", "")
        if target_style == "formal" and fit == "regular":
            score += 1
        if target_style == "casual" and fit in ("loose", "oversized"):
            score += 1
    return score


def _filter_light_tops(tops: list[dict]) -> list[dict]:
    result = [t for t in tops if t.get("sub_category", "").lower() in ("t-shirt", "short sleeve", "tank", "shirt")]
    if not result:
        light_keywords = ["tshirt", "t-shirt", "shirt", "tank", "crop", "blouse", "polo", "top"]
        result = [t for t in tops if any(kw in str(t.get("image_url", "")).lower() for kw in light_keywords)]
    return result or tops


def _filter_light_bottoms(bottoms: list[dict]) -> list[dict]:
    result = [b for b in bottoms if b.get("sub_category", "").lower() in ("shorts", "joggers")]
    if not result:
        light_keywords = ["shorts", "skirt", "joggers", "leggings"]
        result = [b for b in bottoms if any(kw in str(b.get("image_url", "")).lower() for kw in light_keywords)]
    return result or bottoms


def _build_combos(tops: list[dict], bottoms: list[dict], shoes: list[dict], outerwear: Optional[list[dict]] = None) -> list[list[dict]]:
    combos = []
    for t in tops[:3]:
        for b in bottoms[:3]:
            for s in shoes[:2]:
                combo = [t, b, s]
                if outerwear:
                    for o in outerwear[:2]:
                        combos.append([t, b, o, s])
                else:
                    combos.append(combo)
    return combos


def _build_formal_combos(tops: list[dict], bottoms: list[dict], shoes: list[dict], outerwear: list[dict]) -> list[list[dict]]:
    formal_tops = [t for t in tops if t.get("sub_category", "").lower() in ("shirt", "blouse", "polo") or "shirt" in str(t.get("image_url", "")).lower()] or tops[:2]
    formal_bottoms = [b for b in bottoms if b.get("sub_category", "").lower() in ("formal pants",) or any(kw in str(b.get("image_url", "")).lower() for kw in ["pants", "trousers", "chino"])] or bottoms[:2]
    combos = []
    for t in formal_tops[:2]:
        for b in formal_bottoms[:2]:
            for s in shoes[:2]:
                combo = [t, b, s]
                if outerwear:
                    combo.append(outerwear[0])
                combos.append(combo)
    return combos


def _build_casual_combos(tops: list[dict], bottoms: list[dict], shoes: list[dict]) -> list[list[dict]]:
    casual_tops = [t for t in tops if t.get("sub_category", "").lower() in ("t-shirt", "hoodie") or any(kw in str(t.get("image_url", "")).lower() for kw in ["tshirt", "t-shirt", "tank", "hoodie"])] or tops[:2]
    casual_bottoms = [b for b in bottoms if b.get("sub_category", "").lower() in ("jeans", "shorts", "joggers") or any(kw in str(b.get("image_url", "")).lower() for kw in ["jeans", "shorts", "joggers", "sweatpants"])] or bottoms[:2]
    combos = []
    for t in casual_tops[:2]:
        for b in casual_bottoms[:2]:
            for s in shoes[:2]:
                combos.append([t, b, s])
    return combos
