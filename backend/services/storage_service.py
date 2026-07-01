import os
import uuid
from pathlib import Path

BASE_DIR = Path(os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
ORIGINAL_DIR = BASE_DIR / "original"
PROCESSED_DIR = BASE_DIR / "processed"

ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def save_original(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    filepath = ORIGINAL_DIR / unique_name
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return unique_name


def save_processed(file_bytes: bytes) -> str:
    unique_name = f"{uuid.uuid4().hex}.png"
    filepath = PROCESSED_DIR / unique_name
    with open(filepath, "wb") as f:
        f.write(file_bytes)
    return unique_name


def get_original_url(filename: str) -> str:
    return f"uploads/original/{filename}"


def get_processed_url(filename: str) -> str:
    return f"uploads/processed/{filename}"


def get_original_path(filename: str) -> str:
    return str(ORIGINAL_DIR / filename)


def get_processed_path(filename: str) -> str:
    return str(PROCESSED_DIR / filename)
