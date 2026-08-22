"""Render a prescription PDF (or image) into base64 page images for the vision model."""

import base64
import os
from typing import List

import fitz  # PyMuPDF


def _img_bytes_to_data_uri(img_bytes: bytes, mime: str = "image/png") -> str:
    return f"data:{mime};base64," + base64.b64encode(img_bytes).decode("utf-8")


def pdf_to_page_images(path: str, dpi: int = 300) -> List[str]:
    """Return a list of base64 data-URI PNGs, one per page.

    Accepts a PDF or a single image file. Higher DPI keeps handwriting legible.
    """
    ext = os.path.splitext(path)[1].lower()

    if ext in {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp"}:
        with open(path, "rb") as f:
            data = f.read()
        mime = "image/jpeg" if ext in {".jpg", ".jpeg"} else "image/png"
        return [_img_bytes_to_data_uri(data, mime)]

    images: List[str] = []
    zoom = dpi / 72.0  # 72 is the PDF base DPI
    matrix = fitz.Matrix(zoom, zoom)
    with fitz.open(path) as doc:
        for page in doc:
            pix = page.get_pixmap(matrix=matrix)
            images.append(_img_bytes_to_data_uri(pix.tobytes("png")))
    return images
