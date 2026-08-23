"""Hand-drawn diagram detection on prescription pages.

Doctors sketch — a spine, a tooth chart, an injection site, a dosing curve. That
drawing is often the clearest thing on the page and the vision pass reduces it to
prose like "diagram present", losing the actual content.

This runs a single-class YOLO detector (`models/best.pt`, task=detect,
names={0: 'diagram'}) over each rendered page, crops what it finds, and hands
back PNG bytes so the crop can be stored and shown beside the transcription.

The model is loaded lazily and once: it is ~39 MB and every Cloud Run Job
execution analyses exactly one prescription, so paying that cost at import time
would slow down runs that have no pages to scan.
"""

from __future__ import annotations

import base64
import io
import logging
import os
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = os.environ.get("DIAGRAM_MODEL_PATH", "models/best.pt")
# Below this the crop is more likely a dense scribble of text than a drawing.
DEFAULT_CONF = float(os.environ.get("DIAGRAM_MIN_CONFIDENCE", "0.35"))
# Padding around the box, as a fraction of its size — detectors clip strokes at
# the edge, and a diagram missing its outermost line reads as a different shape.
PAD_RATIO = 0.04

_model = None
_load_failed = False


@dataclass
class DetectedDiagram:
    page_index: int
    confidence: float
    # Pixel box on the rendered page image, kept so a reviewer can locate it.
    x1: int
    y1: int
    x2: int
    y2: int
    png_bytes: bytes


def diagram_detection_available() -> bool:
    """True when the weights are present. Detection is optional: a deployment
    without the model still analyses prescriptions, just without drawings."""
    return os.path.exists(DEFAULT_MODEL_PATH)


def _get_model():
    """Load once. Returns None if unavailable, so callers degrade rather than fail."""
    global _model, _load_failed
    if _model is not None or _load_failed:
        return _model
    try:
        from ultralytics import YOLO  # imported lazily: pulls in torch

        _model = YOLO(DEFAULT_MODEL_PATH)
        logger.info("diagram detector loaded from %s", DEFAULT_MODEL_PATH)
    except Exception as e:  # noqa: BLE001 - never let this break an analysis
        _load_failed = True
        logger.warning("diagram detector unavailable: %s", e)
    return _model


def _data_uri_to_image(data_uri: str):
    from PIL import Image

    _, _, b64 = data_uri.partition(",")
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")


def detect_diagrams(
    page_data_uris: List[str],
    min_confidence: Optional[float] = None,
) -> List[DetectedDiagram]:
    """Detect and crop hand-drawn diagrams across the rendered pages.

    Returns an empty list — never raises — when the model is missing, fails to
    load, or finds nothing. A prescription with no drawing is the common case,
    and a detector problem must not cost the user their transcription.
    """
    if not diagram_detection_available():
        logger.info("no diagram model at %s — skipping detection", DEFAULT_MODEL_PATH)
        return []

    model = _get_model()
    if model is None:
        return []

    conf = DEFAULT_CONF if min_confidence is None else min_confidence
    found: List[DetectedDiagram] = []

    for page_index, uri in enumerate(page_data_uris):
        try:
            image = _data_uri_to_image(uri)
            results = model.predict(image, conf=conf, verbose=False)
        except Exception as e:  # noqa: BLE001
            logger.warning("diagram detection failed on page %d: %s", page_index, e)
            continue

        for result in results:
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            for box in boxes:
                try:
                    x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
                    score = float(box.conf[0])
                except Exception:  # noqa: BLE001
                    continue

                pad_x = (x2 - x1) * PAD_RATIO
                pad_y = (y2 - y1) * PAD_RATIO
                cx1 = max(0, int(x1 - pad_x))
                cy1 = max(0, int(y1 - pad_y))
                cx2 = min(image.width, int(x2 + pad_x))
                cy2 = min(image.height, int(y2 + pad_y))
                if cx2 - cx1 < 24 or cy2 - cy1 < 24:
                    continue  # too small to be a readable drawing

                buf = io.BytesIO()
                image.crop((cx1, cy1, cx2, cy2)).save(buf, format="PNG", optimize=True)
                found.append(
                    DetectedDiagram(
                        page_index=page_index,
                        confidence=round(score, 4),
                        x1=cx1,
                        y1=cy1,
                        x2=cx2,
                        y2=cy2,
                        png_bytes=buf.getvalue(),
                    )
                )

    # Most confident first, so the UI leads with the clearest drawing.
    found.sort(key=lambda d: d.confidence, reverse=True)
    logger.info("detected %d diagram(s)", len(found))
    return found
