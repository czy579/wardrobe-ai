import sqlite3
import json
import os
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "db.sqlite")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def migrate_db():
    conn = get_db()
    existing = [row["name"] for row in conn.execute("PRAGMA table_info(clothing)").fetchall()]
    new_columns = {
        "sub_category": "TEXT DEFAULT ''",
        "fit": "TEXT DEFAULT 'regular'",
        "style_tags": "TEXT DEFAULT '[]'",
        "color_primary": "TEXT DEFAULT ''",
        "color_tone": "TEXT DEFAULT ''",
        "user_tags": "TEXT DEFAULT '[]'",
        "processed_image_url": "TEXT DEFAULT ''",
    }
    for col, dtype in new_columns.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE clothing ADD COLUMN {col} {dtype}")

    # Migrate outfits items from comma-separated to JSON
    outfit_cols = [row["name"] for row in conn.execute("PRAGMA table_info(outfits)").fetchall()]
    rows = conn.execute("SELECT id, items FROM outfits").fetchall()
    for r in rows:
        try:
            json.loads(r["items"])
            continue
        except (json.JSONDecodeError, TypeError):
            pass
        ids = [int(x) for x in r["items"].split(",") if x.strip()]
        new_items = json.dumps([{"clothing_id": i, "x": 0, "y": 0, "scale": 1, "z_index": idx} for idx, i in enumerate(ids)])
        conn.execute("UPDATE outfits SET items = ? WHERE id = ?", (new_items, r["id"]))

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS user_tag_defs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS clothing (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_url TEXT NOT NULL,
            original_image_url TEXT,
            category TEXT NOT NULL DEFAULT 'other',
            color TEXT,
            sub_category TEXT DEFAULT '',
            fit TEXT DEFAULT 'regular',
            style_tags TEXT DEFAULT '[]',
            color_primary TEXT DEFAULT '',
            color_tone TEXT DEFAULT '',
            user_tags TEXT DEFAULT '[]',
            processed_image_url TEXT DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS outfits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            items TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS clothing_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clothing_id INTEGER NOT NULL UNIQUE,
            embedding BLOB,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (clothing_id) REFERENCES clothing(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_tag_defs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()
    migrate_db()


def row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    for field in ("style_tags", "user_tags"):
        if field in d and isinstance(d[field], str):
            try:
                d[field] = json.loads(d[field])
            except (json.JSONDecodeError, TypeError):
                d[field] = []
    return d


def add_clothing(
    image_url: str,
    original_image_url: str,
    category: str,
    color: Optional[str] = None,
    sub_category: str = "",
    fit: str = "regular",
    style_tags: Optional[list] = None,
    color_primary: str = "",
    color_tone: str = "",
    user_tags: Optional[list] = None,
    processed_image_url: str = "",
) -> dict:
    conn = get_db()
    cur = conn.execute(
        """INSERT INTO clothing
           (image_url, original_image_url, category, color, sub_category, fit, style_tags, color_primary, color_tone, user_tags, processed_image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            image_url,
            original_image_url,
            category,
            color,
            sub_category,
            fit,
            json.dumps(style_tags or []),
            color_primary,
            color_tone,
            json.dumps(user_tags or []),
            processed_image_url,
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM clothing WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return row_to_dict(row)


def update_clothing(clothing_id: int, **kwargs) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM clothing WHERE id = ?", (clothing_id,)).fetchone()
    if not row:
        conn.close()
        return None
    allowed = {"category", "sub_category", "fit", "style_tags", "color_primary", "color_tone", "user_tags", "color", "image_url", "processed_image_url"}
    updates = {}
    for k, v in kwargs.items():
        if k in allowed:
            if k in ("style_tags", "user_tags"):
                updates[k] = json.dumps(v) if isinstance(v, list) else v
            else:
                updates[k] = v
    if not updates:
        conn.close()
        return row_to_dict(row)
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [clothing_id]
    conn.execute(f"UPDATE clothing SET {set_clause} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM clothing WHERE id = ?", (clothing_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


def get_all_clothing(category: Optional[str] = None) -> list[dict]:
    conn = get_db()
    if category and category != "all":
        rows = conn.execute(
            "SELECT * FROM clothing WHERE category = ? ORDER BY created_at DESC", (category,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM clothing ORDER BY created_at DESC").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def get_clothing_by_id(clothing_id: int) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM clothing WHERE id = ?", (clothing_id,)).fetchone()
    conn.close()
    return row_to_dict(row) if row else None


def search_clothing(
    keyword: Optional[str] = None,
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    fit: Optional[str] = None,
    style_tags: Optional[list] = None,
    color_tone: Optional[str] = None,
    user_tags: Optional[list] = None,
) -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM clothing ORDER BY created_at DESC").fetchall()
    conn.close()
    items = [row_to_dict(r) for r in rows]
    if category and category != "all":
        items = [i for i in items if i.get("category") == category]
    if sub_category:
        items = [i for i in items if i.get("sub_category", "") == sub_category]
    if fit:
        items = [i for i in items if i.get("fit", "regular") == fit]
    if color_tone:
        items = [i for i in items if i.get("color_tone", "") == color_tone]
    if style_tags:
        tag_set = set(t.lower() for t in style_tags)
        items = [i for i in items if tag_set.intersection(t.lower() for t in (i.get("style_tags") or []))]
    if user_tags:
        utag_set = set(t.lower() for t in user_tags)
        items = [i for i in items if utag_set.intersection(t.lower() for t in (i.get("user_tags") or []))]
    if keyword:
        kw = keyword.lower()
        items = [
            i
            for i in items
            if kw in i.get("category", "").lower()
            or kw in i.get("sub_category", "").lower()
            or kw in i.get("fit", "").lower()
            or kw in i.get("color_primary", "").lower()
            or kw in i.get("color_tone", "").lower()
            or any(kw in (t or "").lower() for t in (i.get("style_tags") or []))
            or any(kw in (t or "").lower() for t in (i.get("user_tags") or []))
        ]
    return items


def create_outfit(items: list[int], name: Optional[str] = None) -> dict:
    conn = get_db()
    items_json = ",".join(str(i) for i in items)
    cur = conn.execute(
        "INSERT INTO outfits (name, items) VALUES (?, ?)", (name or "", items_json)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM outfits WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def parse_outfit_items(items_str: str) -> list:
    if not items_str:
        return []
    try:
        parsed = json.loads(items_str)
        if isinstance(parsed, list):
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass
    return [int(x) for x in items_str.split(",") if x.strip()]


def get_all_outfits() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM outfits ORDER BY created_at DESC").fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["items"] = parse_outfit_items(d["items"])
        result.append(d)
    return result


def create_outfit_v2(name: str, items: list[dict]) -> dict:
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO outfits (name, items) VALUES (?, ?)",
        (name or "", json.dumps(items)),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM outfits WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return dict(row)


def get_outfit_by_id(outfit_id: int) -> Optional[dict]:
    conn = get_db()
    row = conn.execute("SELECT * FROM outfits WHERE id = ?", (outfit_id,)).fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)


def update_outfit(outfit_id: int, name: str, items: list[dict]) -> Optional[dict]:
    conn = get_db()
    cur = conn.execute(
        "UPDATE outfits SET name = ?, items = ? WHERE id = ?",
        (name or "", json.dumps(items), outfit_id),
    )
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        return None
    return get_outfit_by_id(outfit_id)


def delete_outfit(outfit_id: int) -> bool:
    conn = get_db()
    cur = conn.execute("DELETE FROM outfits WHERE id = ?", (outfit_id,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0


def compute_outfit_tags(items: list[dict]) -> dict:
    clothing = {c["id"]: c for c in get_all_clothing()}
    style_tags = set()
    color_tones = set()
    fits = set()
    for item in items:
        cid = item.get("clothing_id")
        c = clothing.get(cid)
        if c:
            for t in c.get("style_tags") or []:
                style_tags.add(t)
            if c.get("color_tone"):
                color_tones.add(c["color_tone"])
            if c.get("fit"):
                fits.add(c["fit"])
    return {
        "style_tags": sorted(style_tags),
        "color_tones": sorted(color_tones),
        "fits": sorted(fits),
    }


def add_user_tag_def(name: str) -> Optional[dict]:
    conn = get_db()
    try:
        cur = conn.execute("INSERT INTO user_tag_defs (name) VALUES (?)", (name.strip(),))
        conn.commit()
        row = conn.execute("SELECT * FROM user_tag_defs WHERE id = ?", (cur.lastrowid,)).fetchone()
        conn.close()
        return dict(row)
    except sqlite3.IntegrityError:
        conn.close()
        row = conn.execute("SELECT * FROM user_tag_defs WHERE name = ?", (name.strip(),)).fetchone()
        conn.close()
        return dict(row) if row else None


def get_all_user_tag_defs() -> list[dict]:
    conn = get_db()
    rows = conn.execute("SELECT * FROM user_tag_defs ORDER BY name ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_user_tag_def(tag_id: int) -> bool:
    conn = get_db()
    cur = conn.execute("DELETE FROM user_tag_defs WHERE id = ?", (tag_id,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0


def delete_clothing(clothing_id: int) -> bool:
    conn = get_db()
    cur = conn.execute("DELETE FROM clothing WHERE id = ?", (clothing_id,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0
