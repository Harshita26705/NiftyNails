"""Image upload validation and storage.

- Type is checked by decoding the bytes (never trusting filename or Content-Type).
- Size and pixel-count limits guard against decompression bombs.
- Images are re-encoded to WebP, which strips EXIF/GPS metadata.
- Storage is behind `ImageStorage`; swap `LocalImageStorage` for an S3/R2 adapter in production.
"""

import base64
import io
import secrets
from pathlib import Path
from typing import Protocol

import numpy as np
from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "MPO"}  # MPO = multi-picture JPEG from many phones


class ImageStorage(Protocol):
    def save(self, image: Image.Image, folder: str, fmt: str = "WEBP") -> str: ...

    def delete(self, url: str) -> None: ...


class LocalImageStorage:
    def __init__(self, root: Path, url_prefix: str):
        self.root = root
        self.url_prefix = url_prefix.rstrip("/")

    def save(self, image: Image.Image, folder: str, fmt: str = "WEBP") -> str:
        ext = "png" if fmt == "PNG" else "webp"
        name = f"{secrets.token_hex(12)}.{ext}"
        target_dir = self.root / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        params = {"quality": 88, "method": 4} if fmt == "WEBP" else {"optimize": True}
        image.save(target_dir / name, fmt, **params)
        return f"{self.url_prefix}/{folder}/{name}"

    def delete(self, url: str) -> None:
        if not url.startswith(self.url_prefix + "/"):
            return
        relative = url[len(self.url_prefix) + 1 :]
        path = (self.root / relative).resolve()
        if self.root.resolve() in path.parents and path.is_file():
            path.unlink()


def get_storage() -> ImageStorage:
    settings = get_settings()
    return LocalImageStorage(settings.media_dir, settings.media_url_prefix)


def _bad(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail)


def decode_image_bytes(data: bytes, max_bytes: int | None = None) -> Image.Image:
    settings = get_settings()
    limit = max_bytes or settings.max_upload_mb * 1024 * 1024
    if not data:
        raise _bad("The file is empty.")
    if len(data) > limit:
        raise _bad(f"Images must be under {limit // (1024 * 1024) or 1} MB.")
    Image.MAX_IMAGE_PIXELS = settings.max_image_pixels
    try:
        probe = Image.open(io.BytesIO(data))
        if probe.format not in ALLOWED_FORMATS:
            raise _bad("Please upload a JPG, PNG or WebP image.")
        probe.verify()
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, SyntaxError) as exc:
        raise _bad("That file doesn't look like a valid image.") from exc
    if image.width < 16 or image.height < 16:
        raise _bad("That image is too small.")
    return ImageOps.exif_transpose(image)


async def read_upload(upload: UploadFile) -> Image.Image:
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = await upload.read(limit + 1)
    return decode_image_bytes(data)


def to_rgb_array(image: Image.Image, max_side: int = 1600) -> np.ndarray:
    """RGB uint8 array, downscaled so CV work is fast and memory-bounded."""
    img = image.convert("RGB")
    img.thumbnail((max_side, max_side))
    return np.asarray(img)


def prepare_for_storage(image: Image.Image, max_side: int = 2000) -> Image.Image:
    img = image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
    img.thumbnail((max_side, max_side))
    return img


def decode_png_data_url(data_url: str, max_bytes: int = 400_000) -> Image.Image:
    prefix = "data:image/png;base64,"
    if not data_url.startswith(prefix):
        raise _bad("Paint layers must be PNG data.")
    try:
        raw = base64.b64decode(data_url[len(prefix) :], validate=True)
    except ValueError as exc:
        raise _bad("Paint layer is corrupted.") from exc
    image = decode_image_bytes(raw, max_bytes=max_bytes)
    if image.width > 1024 or image.height > 1024:
        raise _bad("Paint layer is too large.")
    return image
