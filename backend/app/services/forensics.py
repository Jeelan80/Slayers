"""
Forensics, Image Quality, Error Level Analysis (ELA), Perceptual Hashing (pHash),
and Document QR Verification & Cross-Validation (DQVC) integration.
"""

from difflib import SequenceMatcher
import io
import re
from typing import Any, Dict, Optional, Tuple, Union

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageStat

from .qr import (
    STATUS_CROSS_VALIDATED,
    STATUS_DECODED,
    STATUS_DETECTED,
    STATUS_NOT_FOUND,
    cross_validate_3way,
    decode_qr,
    normalize_date,
    normalize_id,
    normalize_text,
    parse_qr_payload,
)


def name_similarity(a: Optional[str], b: Optional[str]) -> float:
    a_n, b_n = normalize_text(a), normalize_text(b)
    if not a_n or not b_n:
        return 0.0
    if a_n == b_n:
        return 1.0
    return float(SequenceMatcher(None, a_n, b_n).ratio())


def blur_score(image: Image.Image) -> float:
    """Calculates Laplacian variance as an objective measure of image sharpness."""
    arr = np.array(image.convert("L"))
    return float(cv2.Laplacian(arr, cv2.CV_64F).var())


def quality_score(image: Image.Image) -> Tuple[float, str]:
    """
    Quality gate assessment to avoid false-positive rejections for blurry/low-res uploads.
    Returns (score: 0.0-1.0, label: "LOW_QUALITY" | "BORDERLINE_QUALITY" | "GOOD_QUALITY")
    """
    var = blur_score(image)
    if var < 40.0:
        return 0.35, "LOW_QUALITY"
    if var < 100.0:
        return 0.65, "BORDERLINE_QUALITY"
    return 0.95, "GOOD_QUALITY"


def ela_score(image: Image.Image) -> Tuple[float, str]:
    """
    Error Level Analysis (ELA): Analyzes difference in JPEG compression error levels.
    Spliced or edited regions exhibit distinct compression error rates compared to original pixels.
    """
    img = image.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    recompressed = Image.open(buf).convert("RGB")
    diff = ImageChops.difference(img, recompressed)
    
    boosted = diff.point(lambda p: min(255, p * 12))
    stat = ImageStat.Stat(boosted)
    mean_val = float(sum(stat.mean) / 3.0)
    
    arr = np.array(diff, dtype=np.float32)
    percentile_95 = float(np.percentile(arr, 95))
    raw = min(1.0, (mean_val / 30.0) * 0.55 + (percentile_95 / 90.0) * 0.45)
    
    if raw >= 0.65:
        label = "HIGH_ANOMALY"
    elif raw < 0.35:
        label = "LOW_ANOMALY"
    else:
        label = "MEDIUM_ANOMALY"
        
    return raw, label


def qr_payload(image: Image.Image) -> Dict[str, Any]:
    """
    Decodes QR code using PyZbar or OpenCV fallback.
    Returns dict with available, raw payload, decoding method, and points.
    """
    decoded = decode_qr(image)
    parsed = parse_qr_payload(decoded.get("raw"))
    return {
        "status": decoded["status"],
        "available": decoded["available"],
        "raw": decoded.get("raw"),
        "points": decoded.get("points"),
        "method": decoded.get("method"),
        "fields": parsed["fields"],
        "format": parsed["format"],
    }


def parse_qr_fields(raw: Optional[str]) -> Dict[str, str]:
    """Parses QR string into normalized field mapping."""
    return parse_qr_payload(raw).get("fields", {})


def qr_cross_check(
    qr: Dict[str, Any],
    name: Optional[str],
    dob: Optional[str],
    id_number: Optional[str] = None,
    institution: Optional[str] = None,
    reg_fields: Optional[Dict[str, Optional[str]]] = None,
) -> Dict[str, Any]:
    """
    Dedicated DQVC (Document QR Verification & Cross-Validation) engine.
    Conducts full 3-way cross-check:
    - OCR <-> QR
    - QR <-> Registration
    - OCR <-> Registration
    
    Vocabulary: NOT_FOUND, DETECTED, DECODED, CROSS_VALIDATED.
    """
    qr_status = qr.get("status") or (STATUS_DECODED if qr.get("available") else STATUS_NOT_FOUND)
    qr_fields = qr.get("fields") or parse_qr_fields(qr.get("raw"))

    ocr_fields = {
        "NAME": name,
        "DOB": dob,
        "ID_NUMBER": id_number,
        "INSTITUTION": institution,
    }

    if reg_fields is None:
        reg_fields = {
            "name": name,
            "dob": dob,
            "id_number": id_number,
            "institution": institution,
        }

    validation_result = cross_validate_3way(
        qr_fields=qr_fields,
        ocr_fields=ocr_fields,
        reg_fields=reg_fields,
        qr_status=qr_status,
    )

    all_ok = validation_result["dqvc_status"] == STATUS_CROSS_VALIDATED
    mismatch = validation_result["mismatch"]
    reason_str = "; ".join(validation_result["reasons"]) if validation_result["reasons"] else ""

    return {
        "status": validation_result["dqvc_status"],
        "dqvc_status": validation_result["dqvc_status"],
        "available": validation_result["available"],
        "decoded": validation_result["decoded"],
        "match": all_ok if validation_result["available"] else None,
        "mismatch": mismatch,
        "tamper_detected": validation_result["tamper_detected"],
        "consistency_score": validation_result["consistency_score"],
        "reason": reason_str,
        "fields": qr_fields,
        "three_way_check": validation_result["three_way_check"],
        "discrepancies": validation_result.get("discrepancies", []),
    }


def phash_hex(image: Image.Image) -> str:
    """Perceptual hash using 32x32 DCT low frequency coefficients."""
    gray = np.array(image.convert("L").resize((32, 32)), dtype=np.float32)
    dct = cv2.dct(gray)
    low = dct[:8, :8]
    med = float(np.median(low[1:, 1:]))
    bits = (low > med).flatten()
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return f"{value:016x}"


def phash_distance(a: str, b: str) -> int:
    """Hamming distance between two 64-bit perceptual hashes."""
    return bin(int(a, 16) ^ int(b, 16)).count("1")
