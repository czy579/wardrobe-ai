from io import BytesIO
from PIL import Image

MAX_SIZE = 800


def remove_background(input_bytes: bytes) -> bytes:
    try:
        from rembg import remove
        output = remove(input_bytes)
        return output
    except ImportError:
        return input_bytes
    except Exception as e:
        print(f"[rembg error] {e}, falling back to original image")
        return input_bytes


def crop_transparent(image: Image.Image) -> Image.Image:
    if image.mode != "RGBA":
        return image
    bbox = image.getbbox()
    if bbox:
        return image.crop(bbox)
    return image


def resize_image(image: Image.Image, max_size: int = MAX_SIZE) -> Image.Image:
    w, h = image.size
    if w <= max_size and h <= max_size:
        return image
    ratio = min(max_size / w, max_size / h)
    new_w = int(w * ratio)
    new_h = int(h * ratio)
    return image.resize((new_w, new_h), Image.LANCZOS)


def process_clothing_image(input_bytes: bytes) -> bytes:
    no_bg_bytes = remove_background(input_bytes)
    try:
        img = Image.open(BytesIO(no_bg_bytes)).convert("RGBA")
        img = crop_transparent(img)
        img = resize_image(img, MAX_SIZE)
        output = BytesIO()
        img.save(output, format="PNG")
        return output.getvalue()
    except Exception as e:
        print(f"[image processing error] {e}, falling back to rembg result")
        return no_bg_bytes
