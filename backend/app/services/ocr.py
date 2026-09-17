import io
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image
from pyzbar.pyzbar import decode as zbar_decode

from ..config import settings
from .liveness_biometrics import crop_face_from_image

QUERIES = [
    ("What is the full name of the student or person?", "NAME"),
    ("What is the date of birth or DOB?", "DOB"),
    ("What is the gender or sex?", "GENDER"),
    ("What is the student ID, roll number, register number, or USN?", "ID_NUMBER"),
    ("What is the name of the college, school, or university?", "INSTITUTION"),
    ("What is the email address?", "EMAIL"),
    ("What is the course, department, or branch?", "COURSE"),
    ("What is the valid date or expiry date?", "VALIDITY"),
    ("What is the document or ID type?", "ID_TYPE"),
]


def scan_barcodes_and_qrs(image_bytes: bytes) -> List[Dict[str, str]]:
    """
    Scans for 1D barcodes (Code128, Code39, EAN, PDF417) and 2D QR codes
    on the ID card using pyzbar across multiple preprocessing filters.
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    attempts = [
        gray,
        cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2),
        cv2.equalizeHist(gray),
    ]

    detected_codes = []
    seen_payloads = set()

    for variant in attempts:
        try:
            results = zbar_decode(variant)
            for r in results:
                payload = r.data.decode("utf-8", errors="ignore").strip()
                if payload and payload not in seen_payloads:
                    seen_payloads.add(payload)
                    detected_codes.append({
                        "type": str(r.type),
                        "data": payload,
                    })
        except Exception:
            continue

    return detected_codes


def extract_with_textract(image_bytes: bytes) -> Dict[str, Any]:
    """Execute AWS Textract AnalyzeDocument with QUERIES and FORMS features."""
    import boto3

    kwargs = {"region_name": settings.AWS_REGION}
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY

    client = boto3.client("textract", **kwargs)
    response = client.analyze_document(
        Document={"Bytes": image_bytes},
        FeatureTypes=["QUERIES", "FORMS"],
        QueriesConfig={
            "Queries": [{"Text": q, "Alias": alias} for q, alias in QUERIES]
        },
    )

    blocks = response.get("Blocks", [])
    block_map = {b.get("Id"): b for b in blocks}

    # 1. Parse Query blocks
    out: Dict[str, Any] = {alias: {"value": None, "confidence": 0.0} for _, alias in QUERIES}
    query_blocks = {b.get("Id"): b for b in blocks if b.get("BlockType") == "QUERY"}
    result_blocks = {b.get("Id"): b for b in blocks if b.get("BlockType") == "QUERY_RESULT"}

    for qid, qblock in query_blocks.items():
        alias = (qblock.get("Query") or {}).get("Alias")
        if not alias:
            continue
        for rel in qblock.get("Relationships", []):
            if rel.get("Type") != "ANSWER":
                continue
            for answer_id in rel.get("Ids", []):
                rb = result_blocks.get(answer_id)
                if rb:
                    out[alias] = {
                        "value": rb.get("Text"),
                        "confidence": float(rb.get("Confidence", 0.0)) / 100.0,
                    }
                    break

    # 2. Parse Form Key-Value pairs
    key_blocks = [b for b in blocks if b.get("BlockType") == "KEY_VALUE_SET" and "KEY" in b.get("EntityTypes", [])]
    kv_pairs = {}

    def get_text(b_id):
        b = block_map.get(b_id)
        if not b:
            return ""
        words = []
        for rel in b.get("Relationships", []):
            if rel.get("Type") == "CHILD":
                for cid in rel.get("Ids", []):
                    child = block_map.get(cid, {})
                    if child.get("BlockType") == "WORD":
                        words.append(child.get("Text", ""))
        return " ".join(words)

    for k in key_blocks:
        key_text = get_text(k.get("Id")).strip()
        val_text = ""
        for rel in k.get("Relationships", []):
            if rel.get("Type") == "VALUE":
                for vid in rel.get("Ids", []):
                    val_text = get_text(vid).strip()
        if key_text:
            kv_pairs[key_text] = val_text

    # 3. Parse raw lines
    raw_lines = [b.get("Text", "") for b in blocks if b.get("BlockType") == "LINE"]

    return {
        **out,
        "key_value_pairs": kv_pairs,
        "raw_text_lines": raw_lines,
        "mode": "AWS_TEXTRACT_QUERIES_AND_FORMS",
    }


def extract_fields(
    image_bytes: bytes,
    fallback: Dict[str, Optional[str]],
    demo_scenario: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extract fields from document.
    Uses AWS Textract when enabled; otherwise falls back to local demo parser.
    """
    if settings.AWS_TEXTRACT_ENABLED:
        try:
            return extract_with_textract(image_bytes)
        except Exception as exc:
            pass

    # If tampered demo scenario is explicitly tested, printed DOB was spliced to 2007-04-14
    target_dob = fallback.get("dob")
    if demo_scenario in ("tampered", "edited"):
        target_dob = "2007-04-14"

    return {
        "NAME": {"value": fallback.get("name"), "confidence": 0.96},
        "DOB": {"value": target_dob, "confidence": 0.98},
        "GENDER": {"value": fallback.get("gender"), "confidence": 0.92},
        "ID_NUMBER": {"value": fallback.get("id_number"), "confidence": 0.95},
        "INSTITUTION": {"value": fallback.get("institution"), "confidence": 0.93},
        "EMAIL": {"value": fallback.get("email"), "confidence": 0.90},
        "COURSE": {"value": fallback.get("course", "B.Tech Computer Science"), "confidence": 0.92},
        "VALIDITY": {"value": fallback.get("validity", "2023-2027"), "confidence": 0.94},
        "ID_TYPE": {"value": fallback.get("id_type", "COLLEGE_ID"), "confidence": 0.97},
        "key_value_pairs": {},
        "raw_text_lines": [
            fallback.get("institution", ""),
            fallback.get("name", ""),
            fallback.get("id_number", ""),
        ],
        "mode": "LOCAL_DEMO",
    }


def extract_student_id_card(
    card_bytes: bytes,
    fallback_data: Optional[Dict[str, Optional[str]]] = None,
    ground_truth: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Comprehensive student card analyzer:
    1. Converts PDF cards to high-DPI image bytes for visual analysis.
    2. Scans 1D & 2D barcodes on the badge.
    3. Crops face portrait photo from the badge.
    4. Runs Textract (or demo OCR) for Name, DOB, USN, Institution, Email.
    5. Discovers all potential register numbers / USNs across barcodes, OCR, and raw lines.
    6. Performs fuzzy cross-check against Aadhaar Ground Truth.
    """
    from thefuzz import fuzz

    # 1. Handle PDF to PNG rasterization across pages
    actual_img_bytes = card_bytes
    all_pages_img = []
    if card_bytes[:4] == b"%PDF":
        try:
            import fitz
            doc = fitz.open(stream=card_bytes, filetype="pdf")
            for page in doc:
                pix = page.get_pixmap(dpi=300)
                all_pages_img.append(pix.tobytes("png"))
            if all_pages_img:
                actual_img_bytes = all_pages_img[0]
        except Exception as e:
            print(f"[warn] PDF rasterization error: {e}")

    fallback = fallback_data or {}
    ocr_res = extract_fields(actual_img_bytes, fallback)

    # Scan barcodes on all pages (front and back of ID card)
    barcodes = []
    seen_barcodes = set()
    candidate_imgs = all_pages_img if all_pages_img else [actual_img_bytes]
    for p_bytes in candidate_imgs:
        for b in scan_barcodes_and_qrs(p_bytes):
            if b["data"] not in seen_barcodes:
                seen_barcodes.add(b["data"])
                barcodes.append(b)

    cropped_face_bytes, cropped_face_b64 = crop_face_from_image(card_bytes)

    extracted_name = (ocr_res.get("NAME") or {}).get("value") or fallback.get("name", "")
    extracted_dob = (ocr_res.get("DOB") or {}).get("value") or fallback.get("dob", "")
    extracted_id = (ocr_res.get("ID_NUMBER") or {}).get("value") or fallback.get("id_number", "")
    extracted_inst = (ocr_res.get("INSTITUTION") or {}).get("value") or fallback.get("institution", "")
    extracted_email = (ocr_res.get("EMAIL") or {}).get("value") or fallback.get("email", "")

    # 2. Extract and discover ALL potential register numbers
    potential_reg_numbers = set()
    if extracted_id:
        potential_reg_numbers.add(extracted_id.strip())
    for b in barcodes:
        potential_reg_numbers.add(b["data"].strip())
    for k, v in (ocr_res.get("key_value_pairs") or {}).items():
        kl = k.lower()
        if any(term in kl for term in ["usn", "roll", "reg", "id no", "admission", "student id"]):
            if v:
                potential_reg_numbers.add(v.strip())
        # Check if key or value matches common USN patterns (e.g. PES2UG23CS915)
        for item in (k, v):
            if item and re.search(r"[A-Za-z]{2,5}\d{1,2}[A-Za-z0-9]{3,12}", item):
                potential_reg_numbers.add(item.strip())

    # Scan raw lines for candidate register numbers
    for line in ocr_res.get("raw_text_lines", []):
        matches = re.findall(r"\b[A-Za-z]{2,5}\d{1,2}[A-Za-z0-9]{3,12}\b", line)
        for m in matches:
            if len(m) >= 6:
                potential_reg_numbers.add(m.strip())
        num_matches = re.findall(r"\b\d{7,12}\b", line)
        for nm in num_matches:
            potential_reg_numbers.add(nm.strip())

    usn_candidates = list(filter(None, potential_reg_numbers))

    # If extracted_id is not set, pick the strongest candidate
    if not extracted_id and usn_candidates:
        extracted_id = usn_candidates[0]

    # Cross-check against Ground Truth if provided
    gt_comparison = None
    if ground_truth:
        gt_name = ground_truth.get("name") or ""
        gt_dob_iso = ground_truth.get("dob_iso") or ground_truth.get("dob") or ""
        gt_gender = ground_truth.get("gender") or ""

        name_score = 0.0
        if gt_name and extracted_name:
            name_score = float(fuzz.token_sort_ratio(gt_name.lower(), extracted_name.lower()))

        name_match = name_score >= 70.0
        dob_match = bool(gt_dob_iso and extracted_dob and (gt_dob_iso in extracted_dob or extracted_dob in gt_dob_iso))
        gender_match = False
        ext_gender = (ocr_res.get("GENDER") or {}).get("value") or ""
        if gt_gender and ext_gender:
            gender_match = gt_gender.strip().upper()[:1] == ext_gender.strip().upper()[:1]

        gt_comparison = {
            "name_similarity_score": round(name_score, 1),
            "name_match": name_match,
            "dob_match": dob_match,
            "gender_match": gender_match,
            "overall_identity_verified": name_match,
        }

    return {
        "success": True,
        "extracted_fields": {
            "name": extracted_name,
            "dob": extracted_dob,
            "id_number": extracted_id,
            "institution": extracted_inst,
            "email": extracted_email,
            "course": (ocr_res.get("COURSE") or {}).get("value"),
            "validity": (ocr_res.get("VALIDITY") or {}).get("value"),
            "gender": (ocr_res.get("GENDER") or {}).get("value"),
        },
        "ocr_confidence": round(
            sum(
                float((ocr_res.get(k) or {}).get("confidence") or 0.85)
                for k in ["NAME", "ID_NUMBER", "INSTITUTION"]
            ) / 3.0,
            3,
        ),
        "barcodes_and_qrs": barcodes,
        "usn_candidates": usn_candidates,
        "potential_register_numbers": usn_candidates,
        "has_cropped_face": cropped_face_bytes is not None,
        "cropped_face_base64": cropped_face_b64,
        "aadhaar_ground_truth_comparison": gt_comparison,
        "ocr_mode": ocr_res.get("mode"),
    }
