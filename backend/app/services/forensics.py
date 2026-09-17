import io
import re
from datetime import datetime
from difflib import SequenceMatcher
from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageStat


def normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]", "", value.lower())


def normalize_date(value: Optional[str]) -> str:
    if not value:
        return ""
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"):
        try:
            return datetime.strptime(value.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    return normalize_text(value)


def name_similarity(a: Optional[str], b: Optional[str]) -> float:
    a_n, b_n = normalize_text(a), normalize_text(b)
    if not a_n or not b_n:
        return 0.0
    if a_n == b_n:
        return 1.0
    return float(SequenceMatcher(None, a_n, b_n).ratio())


def blur_score(image: Image.Image) -> float:
    arr = np.array(image.convert("L"))
    return float(cv2.Laplacian(arr, cv2.CV_64F).var())


def quality_score(image: Image.Image) -> Tuple[float, str]:
    var = blur_score(image)
    if var < 40.0:
        return 0.35, "LOW_QUALITY"
    if var < 100.0:
        return 0.65, "BORDERLINE_QUALITY"
    return 0.95, "GOOD_QUALITY"


def ela_score(image: Image.Image) -> Tuple[float, str]:
    """
    Error Level Analysis: Recompress image as JPEG and analyze difference levels.
    High differences indicate tampered regions with varying compression histories.
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
    arr = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    detector = cv2.QRCodeDetector()
    data, points, _ = detector.detectAndDecode(arr)
    return {
        "available": bool(data),
        "raw": data or None,
        "points": points.tolist() if points is not None else None,
    }


def parse_qr_fields(raw: Optional[str]) -> Dict[str, str]:
    if not raw:
        return {}
    text = raw.strip()
    # Try parsing as JSON first
    try:
        import json
        obj = json.loads(text)
        if isinstance(obj, dict):
            return {str(k).upper(): str(v) for k, v in obj.items()}
    except Exception:
        pass
    
    # Try parsing as semicolon or newline delimited key=value
    fields: Dict[str, str] = {}
    for piece in re.split(r"[;\n]+", text):
        if "=" in piece:
            k, v = piece.split("=", 1)
            fields[k.strip().upper()] = v.strip()
    return fields


def qr_cross_check(qr: Dict[str, Any], name: Optional[str], dob: Optional[str]) -> Dict[str, Any]:
    if not qr.get("available"):
        return {
            "available": False,
            "match": None,
            "mismatch": False,
            "reason": "QR not detected on document",
            "fields": {},
        }
    
    fields = parse_qr_fields(qr.get("raw"))
    checks = []
    reasons = []
    
    if "NAME" in fields and name:
        name_ok = normalize_text(fields["NAME"]) == normalize_text(name)
        checks.append(name_ok)
        if not name_ok:
            reasons.append(f"QR Name '{fields['NAME']}' does not match document name '{name}'")
            
    if "DOB" in fields and dob:
        dob_ok = normalize_date(fields["DOB"]) == normalize_date(dob)
        checks.append(dob_ok)
        if not dob_ok:
            reasons.append(f"QR DOB '{fields['DOB']}' does not match document DOB '{dob}'")
            
    if not checks:
        return {
            "available": True,
            "match": None,
            "mismatch": False,
            "fields": fields,
            "reason": "QR detected but contains no comparable identity fields",
        }
        
    all_ok = all(checks)
    return {
        "available": True,
        "match": all_ok,
        "mismatch": not all_ok,
        "fields": fields,
        "reason": "QR payload matches printed/OCR fields" if all_ok else "; ".join(reasons),
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
    return bin(int(a, 16) ^ int(b, 16)).count("1")
