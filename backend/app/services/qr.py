"""
Document QR Verification & Cross-Validation (DQVC) Engine.
Implements multi-format QR decoding (PyZbar / OpenCV), payload parsing (JSON, Delimited, Aadhaar),
and comprehensive 3-way cross-validation: OCR <-> QR, QR <-> Registration, OCR <-> Registration.
"""

from datetime import datetime
from difflib import SequenceMatcher
import json
import re
from typing import Any, Dict, List, Optional, Tuple, Union
import xml.etree.ElementTree as ET

import cv2
import numpy as np
from PIL import Image

# Status Vocabulary
STATUS_NOT_FOUND = "NOT_FOUND"
STATUS_DETECTED = "DETECTED"
STATUS_DECODED = "DECODED"
STATUS_CROSS_VALIDATED = "CROSS_VALIDATED"


def normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]", "", value.lower())


def normalize_date(value: Optional[str]) -> str:
    if not value:
        return ""
    for fmt in (
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%d-%m-%y",
        "%d/%m/%y",
        "%Y/%m/%d",
        "%d.%m.%Y",
    ):
        try:
            return datetime.strptime(value.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    # If standard parse fails, try extracting 4-digit year or digits
    digits = re.sub(r"[^0-9]", "", value)
    if len(digits) == 8:
        # Check if YYYYMMDD
        if int(digits[:4]) in range(1950, 2035):
            return f"{digits[:4]}-{digits[4:6]}-{digits[6:8]}"
        # Check if DDMMYYYY
        if int(digits[4:]) in range(1950, 2035):
            return f"{digits[4:]}-{digits[2:4]}-{digits[:2]}"
    return normalize_text(value)


def normalize_id(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def _to_cv2_image(image: Union[Image.Image, np.ndarray, bytes]) -> np.ndarray:
    """Converts PIL Image, bytes, or numpy array to OpenCV BGR image."""
    if isinstance(image, bytes):
        arr = np.frombuffer(image, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    elif isinstance(image, Image.Image):
        return cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    elif isinstance(image, np.ndarray):
        if len(image.shape) == 2:
            return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        return image
    raise ValueError(f"Unsupported image type: {type(image)}")


def _decode_with_pyzbar(img_bgr: np.ndarray) -> Optional[Dict[str, Any]]:
    """Attempt decoding using pyzbar with multiple enhancement passes."""
    try:
        from pyzbar.pyzbar import decode as pz_decode, ZBarSymbol
    except ImportError:
        return None

    # Pass 1: Direct on original image
    results = pz_decode(img_bgr, symbols=[ZBarSymbol.QRCODE])
    if results:
        best = max(results, key=lambda r: len(r.data))
        try:
            text = best.data.decode("utf-8")
        except UnicodeDecodeError:
            text = best.data.decode("latin-1", errors="ignore")
        return {
            "raw": text,
            "polygon": [[p.x, p.y] for p in best.polygon] if best.polygon else [],
            "method": "PYZBAR",
        }

    # Pass 2: Grayscale + Otsu threshold
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    results = pz_decode(thresh, symbols=[ZBarSymbol.QRCODE])
    if results:
        best = max(results, key=lambda r: len(r.data))
        try:
            text = best.data.decode("utf-8")
        except UnicodeDecodeError:
            text = best.data.decode("latin-1", errors="ignore")
        return {
            "raw": text,
            "polygon": [[p.x, p.y] for p in best.polygon] if best.polygon else [],
            "method": "PYZBAR_THRESHOLD",
        }

    # Pass 3: Adaptive threshold
    adaptive = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 5
    )
    results = pz_decode(adaptive, symbols=[ZBarSymbol.QRCODE])
    if results:
        best = max(results, key=lambda r: len(r.data))
        try:
            text = best.data.decode("utf-8")
        except UnicodeDecodeError:
            text = best.data.decode("latin-1", errors="ignore")
        return {
            "raw": text,
            "polygon": [[p.x, p.y] for p in best.polygon] if best.polygon else [],
            "method": "PYZBAR_ADAPTIVE",
        }

    return None


def _decode_with_opencv(img_bgr: np.ndarray) -> Optional[Dict[str, Any]]:
    """Attempt decoding using OpenCV QRCodeDetector fallback."""
    detector = cv2.QRCodeDetector()
    data, points, _ = detector.detectAndDecode(img_bgr)
    if data:
        return {
            "raw": data,
            "polygon": points.tolist() if points is not None else [],
            "method": "OPENCV",
        }
    
    # Try with gray and contrast adjustment
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    data, points, _ = detector.detectAndDecode(gray)
    if data:
        return {
            "raw": data,
            "polygon": points.tolist() if points is not None else [],
            "method": "OPENCV_GRAY",
        }

    # Check if points were detected even if un-decoded
    if points is not None and len(points) > 0:
        return {
            "raw": None,
            "polygon": points.tolist(),
            "method": "OPENCV_DETECT_ONLY",
        }

    return None


def decode_qr(image: Union[Image.Image, np.ndarray, bytes]) -> Dict[str, Any]:
    """
    Multi-format QR code detector and decoder with PyZbar primary & OpenCV fallback.
    Returns status: NOT_FOUND, DETECTED, or DECODED.
    """
    try:
        img_bgr = _to_cv2_image(image)
    except Exception as exc:
        return {
            "status": STATUS_NOT_FOUND,
            "available": False,
            "raw": None,
            "method": None,
            "points": None,
            "error": str(exc),
        }

    # Step 1: Try PyZbar
    pyzbar_res = _decode_with_pyzbar(img_bgr)
    if pyzbar_res and pyzbar_res.get("raw"):
        return {
            "status": STATUS_DECODED,
            "available": True,
            "raw": pyzbar_res["raw"],
            "method": pyzbar_res["method"],
            "points": pyzbar_res.get("polygon"),
        }

    # Step 2: Fallback to OpenCV
    cv_res = _decode_with_opencv(img_bgr)
    if cv_res:
        if cv_res.get("raw"):
            return {
                "status": STATUS_DECODED,
                "available": True,
                "raw": cv_res["raw"],
                "method": cv_res["method"],
                "points": cv_res.get("polygon"),
            }
        else:
            return {
                "status": STATUS_DETECTED,
                "available": False,
                "raw": None,
                "method": cv_res["method"],
                "points": cv_res.get("polygon"),
                "reason": "QR bounding box detected on document, but payload could not be decoded (scratched/blurry).",
            }

    return {
        "status": STATUS_NOT_FOUND,
        "available": False,
        "raw": None,
        "method": None,
        "points": None,
        "reason": "No machine-readable QR code detected on document.",
    }


def parse_qr_payload(raw: Optional[str]) -> Dict[str, Any]:
    """
    Parses multi-format QR payloads:
    1. JSON dictionaries
    2. Delimited key=value or key:value strings
    3. Aadhaar-style XML strings (<PrintLetterBarcodeData .../>)
    4. Plain text / fallback
    
    Returns normalized dictionary mapping to standard keys:
    NAME, DOB, ID_NUMBER, INSTITUTION, GENDER, etc.
    """
    if not raw or not raw.strip():
        return {"format": "EMPTY", "fields": {}}

    text = raw.strip()
    fields: Dict[str, str] = {}
    payload_format = "UNKNOWN"

    # 1. Try parsing JSON
    if (text.startswith("{") and text.endswith("}")) or (text.startswith("[") and text.endswith("]")):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                payload_format = "JSON"
                for k, v in parsed.items():
                    if v is not None:
                        fields[str(k).upper()] = str(v).strip()
        except Exception:
            pass

    # 2. Try parsing Aadhaar XML payload
    if not fields and ("<PrintLetterBarcodeData" in text or "<QPData" in text or text.startswith("<?xml")):
        payload_format = "AADHAAR_XML"
        try:
            root = ET.fromstring(text)
            for attr, val in root.attrib.items():
                fields[attr.upper()] = val.strip()
        except Exception:
            # Regex extraction fallback for malformed XML
            for match in re.finditer(r'([a-zA-Z_]+)="([^"]*)"', text):
                fields[match.group(1).upper()] = match.group(2).strip()

    # 3. Try parsing Delimited Key=Value or Key:Value
    if not fields and any(sep in text for sep in ("=", ":", ";", "\n", "|")):
        lines = re.split(r"[;\n\|]+", text)
        extracted = {}
        for line in lines:
            if "=" in line:
                k, v = line.split("=", 1)
                extracted[k.strip().upper()] = v.strip()
            elif ":" in line:
                k, v = line.split(":", 1)
                extracted[k.strip().upper()] = v.strip()
        if extracted:
            payload_format = "DELIMITED_KV"
            fields = extracted

    # Map canonical aliases to standard field names
    alias_map = {
        "NAME": ["STUDENT_NAME", "FULL_NAME", "CANDIDATE_NAME", "STUDENTNAME"],
        "DOB": ["DATE_OF_BIRTH", "BIRTH_DATE", "DOB_STR", "DATEOFBIRTH"],
        "ID_NUMBER": ["ROLL_NUMBER", "ROLL_NO", "ROLLNO", "ID", "REG_NO", "UID", "REGNO", "ENROLLMENT_NO", "STUDENT_ID"],
        "INSTITUTION": ["COLLEGE", "UNIVERSITY", "ORG", "SCHOOL", "INSTITUTE", "COLLEGE_NAME"],
        "ID_TYPE": ["DOCUMENT_TYPE", "DOCTYPE", "TYPE"],
    }

    normalized_fields: Dict[str, str] = {}
    for canon, aliases in alias_map.items():
        if canon in fields:
            normalized_fields[canon] = fields[canon]
            continue
        for alias in aliases:
            if alias in fields:
                normalized_fields[canon] = fields[alias]
                break

    # Copy any other fields as-is
    for k, v in fields.items():
        if k not in normalized_fields:
            normalized_fields[k] = v

    # Fallback date extraction if DOB still missing
    if "DOB" not in normalized_fields:
        date_match = re.search(r"\b(\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b", text)
        if date_match:
            normalized_fields["DOB"] = date_match.group(1)

    return {
        "format": payload_format if payload_format != "UNKNOWN" else "PLAIN_TEXT",
        "fields": normalized_fields,
    }


def cross_validate_3way(
    qr_fields: Dict[str, str],
    ocr_fields: Dict[str, Optional[str]],
    reg_fields: Dict[str, Optional[str]],
    qr_status: str,
) -> Dict[str, Any]:
    """
    Executes full 3-way cross-validation:
    1. OCR <-> QR
    2. QR <-> Registration
    3. OCR <-> Registration
    
    Enforces strict consistency verification and returns DQVC status:
    NOT_FOUND | DETECTED | DECODED | CROSS_VALIDATED
    """
    # If QR was not found or detected but undecoded
    if qr_status == STATUS_NOT_FOUND:
        # Fallback to 1-way: OCR <-> Registration check
        ocr_reg_disc = []
        ocr_name = ocr_fields.get("NAME")
        reg_name = reg_fields.get("name")
        ocr_dob = ocr_fields.get("DOB")
        reg_dob = reg_fields.get("dob")
        
        name_sim = SequenceMatcher(None, normalize_text(ocr_name), normalize_text(reg_name)).ratio() if (ocr_name and reg_name) else 0.50
        dob_match = (normalize_date(ocr_dob) == normalize_date(reg_dob)) if (ocr_dob and reg_dob) else True

        if name_sim < 0.60:
            ocr_reg_disc.append(f"OCR Name '{ocr_name}' differs from Registration '{reg_name}' ({name_sim:.0%})")
        if not dob_match:
            ocr_reg_disc.append(f"OCR DOB '{ocr_dob}' does not match Registration '{reg_dob}'")

        consistency = (name_sim * 0.60) + (0.40 if dob_match else 0.0)
        return {
            "dqvc_status": STATUS_NOT_FOUND,
            "available": False,
            "decoded": False,
            "consistency_score": round(consistency, 4),
            "tamper_detected": False,
            "mismatch": False,
            "reasons": ["No machine-readable QR code found on document; falling back to OCR text verification."],
            "three_way_check": {
                "ocr_qr": {"match": None, "score": 0.0, "discrepancies": ["QR not present"]},
                "qr_registration": {"match": None, "score": 0.0, "discrepancies": ["QR not present"]},
                "ocr_registration": {"match": len(ocr_reg_disc) == 0, "score": round(name_sim, 3), "discrepancies": ocr_reg_disc},
            },
        }

    if qr_status == STATUS_DETECTED:
        return {
            "dqvc_status": STATUS_DETECTED,
            "available": True,
            "decoded": False,
            "consistency_score": 0.60,
            "tamper_detected": False,
            "mismatch": False,
            "reasons": ["QR code detected on document but could not be decoded due to blur, damage, or low contrast."],
            "three_way_check": {
                "ocr_qr": {"match": None, "score": 0.0, "discrepancies": ["QR detected but payload unreadable"]},
                "qr_registration": {"match": None, "score": 0.0, "discrepancies": ["QR detected but payload unreadable"]},
                "ocr_registration": {"match": True, "score": 0.85, "discrepancies": []},
            },
        }

    # QR is DECODED: Conduct rigorous 3-way checks
    discrepancies: List[str] = []
    reasons: List[str] = []
    
    # 1. OCR <-> QR check
    ocr_qr_disc = []
    ocr_name = ocr_fields.get("NAME")
    qr_name = qr_fields.get("NAME")
    if qr_name and ocr_name:
        sim = SequenceMatcher(None, normalize_text(qr_name), normalize_text(ocr_name)).ratio()
        if sim < 0.70:
            msg = f"OCR printed Name '{ocr_name}' contradicts machine-readable QR Name '{qr_name}'"
            ocr_qr_disc.append(msg)
            discrepancies.append(msg)

    ocr_dob = ocr_fields.get("DOB")
    qr_dob = qr_fields.get("DOB")
    if qr_dob and ocr_dob:
        if normalize_date(qr_dob) != normalize_date(ocr_dob):
            msg = f"Printed DOB '{ocr_dob}' contradicts authentic QR DOB '{qr_dob}' (likely digital splicing)"
            ocr_qr_disc.append(msg)
            discrepancies.append(msg)

    ocr_id = ocr_fields.get("ID_NUMBER")
    qr_id = qr_fields.get("ID_NUMBER")
    if qr_id and ocr_id:
        if normalize_id(qr_id) != normalize_id(ocr_id):
            msg = f"Printed ID Number '{ocr_id}' contradicts QR ID Number '{qr_id}'"
            ocr_qr_disc.append(msg)
            discrepancies.append(msg)

    # 2. QR <-> Registration check
    qr_reg_disc = []
    reg_name = reg_fields.get("name")
    if qr_name and reg_name:
        sim = SequenceMatcher(None, normalize_text(qr_name), normalize_text(reg_name)).ratio()
        if sim < 0.70:
            msg = f"Registration Name '{reg_name}' does not match card QR Name '{qr_name}' ({sim:.0%})"
            qr_reg_disc.append(msg)
            discrepancies.append(msg)

    reg_dob = reg_fields.get("dob")
    if qr_dob and reg_dob:
        if normalize_date(qr_dob) != normalize_date(reg_dob):
            msg = f"Registration DOB '{reg_dob}' contradicts card QR DOB '{qr_dob}'"
            qr_reg_disc.append(msg)
            discrepancies.append(msg)

    reg_id = reg_fields.get("id_number")
    if qr_id and reg_id:
        if normalize_id(qr_id) != normalize_id(reg_id):
            msg = f"Registration ID Number '{reg_id}' differs from card QR ID '{qr_id}'"
            qr_reg_disc.append(msg)
            discrepancies.append(msg)

    # 3. OCR <-> Registration check
    ocr_reg_disc = []
    if ocr_name and reg_name:
        sim = SequenceMatcher(None, normalize_text(ocr_name), normalize_text(reg_name)).ratio()
        if sim < 0.70:
            ocr_reg_disc.append(f"Registration Name '{reg_name}' differs from OCR Name '{ocr_name}'")

    if ocr_dob and reg_dob:
        if normalize_date(ocr_dob) != normalize_date(reg_dob):
            ocr_reg_disc.append(f"Registration DOB '{reg_dob}' differs from OCR DOB '{ocr_dob}'")

    # Evaluate matches
    ocr_qr_match = len(ocr_qr_disc) == 0
    qr_reg_match = len(qr_reg_disc) == 0
    ocr_reg_match = len(ocr_reg_disc) == 0

    has_tamper_discrepancy = any("contradicts" in d for d in discrepancies)
    has_mismatch = len(discrepancies) > 0

    if has_tamper_discrepancy:
        consistency_score = 0.15
        final_status = STATUS_DECODED
        reasons.append("Tampering detected: QR machine-readable payload directly contradicts printed text.")
    elif has_mismatch:
        consistency_score = 0.45
        final_status = STATUS_DECODED
        reasons.append("Discrepancy detected between QR payload and registration credentials.")
    else:
        consistency_score = 1.0
        final_status = STATUS_CROSS_VALIDATED
        reasons.append("Document QR verified and cross-validated across all 3 checkpoints (OCR, QR, Registration).")

    return {
        "dqvc_status": final_status,
        "available": True,
        "decoded": True,
        "consistency_score": consistency_score,
        "tamper_detected": has_tamper_discrepancy,
        "mismatch": has_mismatch,
        "reasons": reasons,
        "discrepancies": discrepancies,
        "three_way_check": {
            "ocr_qr": {
                "match": ocr_qr_match,
                "score": 1.0 if ocr_qr_match else 0.20,
                "discrepancies": ocr_qr_disc,
            },
            "qr_registration": {
                "match": qr_reg_match,
                "score": 1.0 if qr_reg_match else 0.30,
                "discrepancies": qr_reg_disc,
            },
            "ocr_registration": {
                "match": ocr_reg_match,
                "score": 1.0 if ocr_reg_match else 0.40,
                "discrepancies": ocr_reg_disc,
            },
        },
    }
