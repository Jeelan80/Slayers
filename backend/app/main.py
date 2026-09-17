import io
import json
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image

from .config import settings
from .db import (
    get_registration,
    insert_registration,
    recent_registrations,
    reset_db,
    update_registration_status,
)
from .services.decision import decide
from .services.duplicate import duplicate_evidence, mask_id
from .services.face import face_match_if_enabled
from .services.forensics import (
    blur_score,
    ela_score,
    name_similarity,
    phash_hex,
    quality_score,
    qr_cross_check,
    qr_payload,
)
from .services.ocr import extract_fields

app = FastAPI(
    title=f"{settings.PROJECT_NAME} PS-003 API",
    version=settings.VERSION,
    description="AI-Powered Identity & Eligibility Verification Platform for Hackingly PS-003",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




def parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def calculate_age(dob: date, event_date: date) -> int:
    return event_date.year - dob.year - ((event_date.month, event_date.day) < (dob.month, dob.day))


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "challenge": "Hackingly PS-003",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "aws_textract_enabled": settings.AWS_TEXTRACT_ENABLED,
        "aws_rekognition_enabled": settings.AWS_REKOGNITION_ENABLED,
    }


@app.get("/api/registrations")
def get_registrations(limit: int = 50):
    return recent_registrations(limit=limit)


@app.get("/api/registrations/{reg_id}")
def get_registration_by_id(reg_id: int):
    record = get_registration(reg_id)
    if not record:
        raise HTTPException(status_code=404, detail="Registration not found")
    return record


@app.post("/api/registrations/{reg_id}/review")
def review_registration(
    reg_id: int,
    status: str = Form(...),
    notes: Optional[str] = Form(None),
):
    if status not in ("APPROVED", "REJECTED", "PENDING"):
        raise HTTPException(status_code=400, detail="Invalid status value")
    ok = update_registration_status(reg_id, status, notes)
    if not ok:
        raise HTTPException(status_code=404, detail="Registration not found")
    return {"status": "success", "registration_id": reg_id, "new_status": status}


@app.post("/api/reset")
def reset_database():
    reset_db()
    return {"status": "reset", "message": "Demo database cleared successfully"}


@app.post("/api/verify")
async def verify_registration(
    name: str = Form(...),
    dob: str = Form(...),
    id_number: str = Form(""),
    institution: str = Form(""),
    id_type: str = Form("COLLEGE_ID"),
    min_age: int = Form(18),
    event_date: str = Form(""),
    file: UploadFile = File(...),
    selfie: Optional[UploadFile] = File(None),
):
    image_bytes = await file.read()
    if not image_bytes:
        return JSONResponse({"error": "Uploaded document is empty"}, status_code=400)

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        return JSONResponse({"error": "Unsupported image format or corrupt file"}, status_code=400)

    event_dt = parse_date(event_date) or date.today()
    supplied_dob = parse_date(dob)

    fallback = {
        "name": name,
        "dob": dob,
        "id_number": id_number,
        "institution": institution,
        "id_type": id_type,
    }

    # Step 1: OCR Extraction (AWS Textract or fallback)
    ocr = extract_fields(image_bytes, fallback)
    extracted_name = (ocr.get("NAME") or {}).get("value") or name
    extracted_dob = (ocr.get("DOB") or {}).get("value") or dob
    extracted_id = (ocr.get("ID_NUMBER") or {}).get("value") or id_number
    extracted_institution = (ocr.get("INSTITUTION") or {}).get("value") or institution
    extracted_id_type = (ocr.get("ID_TYPE") or {}).get("value") or id_type

    # Average OCR field confidence
    q_conf = [
        float((ocr.get(key) or {}).get("confidence") or 0.0)
        for key in ("NAME", "DOB", "ID_NUMBER")
        if (ocr.get(key) or {}).get("value")
    ]
    ocr_conf = sum(q_conf) / len(q_conf) if q_conf else 0.85

    # Step 2: QR payload decoding and cross check
    qr_data = qr_payload(image)
    qr_check = qr_cross_check(qr_data, extracted_name, extracted_dob)

    # Step 3: Forensic & Quality Analysis
    raw_blur = blur_score(image)
    q_score, q_label = quality_score(image)
    e_score, e_label = ela_score(image)
    p_hash = phash_hex(image)

    # Step 4: Duplicate and reuse detection
    dup = duplicate_evidence(extracted_id, p_hash)

    # Step 5: Name consistency
    name_match = name_similarity(name, extracted_name)

    # Step 6: Eligibility verification
    effective_dob = parse_date(extracted_dob) or supplied_dob
    eligible = False
    age = None
    if effective_dob:
        age = calculate_age(effective_dob, event_dt)
        eligible = age >= min_age

    # Step 7: Biometric face verification (optional selfie)
    face = None
    if selfie is not None:
        selfie_bytes = await selfie.read()
        if selfie_bytes:
            face = face_match_if_enabled(image_bytes, selfie_bytes)

    # Calculate duplicate risk and overall authenticity score
    duplicate_risk = 1.0 if dup["exact_duplicate"] else (0.75 if dup["phash_possible_reuse"] else 0.0)
    
    # ELA and QR penalty
    authenticity_score = max(
        0.0,
        1.0 - max(
            1.0 if qr_check["mismatch"] else 0.0,
            e_score * 0.55,
            (1.0 - q_score) * 0.40,
        ),
    )

    evidence = {
        "ocr_confidence": ocr_conf,
        "authenticity_score": authenticity_score,
        "duplicate_risk": duplicate_risk,
        "exact_duplicate": dup["exact_duplicate"],
        "phash_possible_reuse": dup["phash_possible_reuse"],
        "qr_available": qr_check["available"],
        "qr_mismatch": qr_check["mismatch"],
        "ela_flag": e_score >= 0.65,
        "quality_flag": q_label,
        "eligibility_pass": bool(eligible),
        "name_match": name_match,
        "face_match": face.get("score") if face and face.get("score") is not None else None,
    }

    # Step 8: Multi-gate decision fusion
    decision_result = decide(evidence)

    # Format structured checks report
    checks = {
        "ocr": {
            "status": "PASS" if ocr_conf >= 0.80 else "REVIEW",
            "confidence": round(ocr_conf, 3),
            "mode": ocr.get("mode"),
        },
        "eligibility": {
            "status": "PASS" if eligible else "FAIL",
            "age": age,
            "minimum_age": min_age,
            "event_date": event_dt.isoformat(),
        },
        "quality": {
            "status": "PASS" if q_score >= 0.80 else "REVIEW",
            "score": round(q_score, 3),
            "blur_variance": round(raw_blur, 2),
            "label": q_label,
        },
        "ela": {
            "status": "FLAG" if e_score >= 0.65 else "PASS",
            "score": round(e_score, 3),
            "label": e_label,
        },
        "qr": {
            "status": "MISMATCH" if qr_check["mismatch"] else ("MATCH" if qr_check["available"] else "N/A"),
            "reason": qr_check["reason"],
            "fields": qr_check.get("fields", {}),
        },
        "name_match": {
            "status": "MATCH" if name_match >= 0.85 else ("REVIEW" if name_match >= 0.50 else "MISMATCH"),
            "score": round(name_match, 3),
        },
        "duplicate": {
            "status": "DUPLICATE" if dup["exact_duplicate"] else ("POSSIBLE_REUSE" if dup["phash_possible_reuse"] else "UNIQUE"),
            "exact_match": dup["exact_match"],
            "phash_matches": dup["phash_matches"],
        },
        "face": face or {"available": False, "status": "NOT_PROVIDED"},
    }

    extracted_dict = {
        "name": extracted_name,
        "dob": extracted_dob,
        "id_number": extracted_id,
        "institution": extracted_institution,
        "id_type": extracted_id_type,
        "ocr_mode": ocr.get("mode"),
    }

    # Step 9: Persist registration to database
    reg_id = insert_registration(
        name=name,
        dob=extracted_dob,
        institution=extracted_institution,
        id_type=id_type,
        id_number_masked=mask_id(extracted_id),
        id_fingerprint=dup["id_fingerprint"],
        phash=p_hash,
        decision=decision_result["decision"],
        confidence=decision_result["confidence"],
        summary=decision_result["summary"],
        reasons_json=json.dumps(decision_result["reasons"]),
        checks_json=json.dumps(checks),
        extracted_json=json.dumps(extracted_dict),
        status="PENDING" if decision_result["decision"] == "MANUAL_REVIEW" else decision_result["decision"],
    )

    return {
        "registration_id": reg_id,
        "decision": decision_result["decision"],
        "confidence": decision_result["confidence"],
        "summary": decision_result["summary"],
        "reasons": decision_result["reasons"],
        "strong_flags": decision_result["strong_flags"],
        "extracted": extracted_dict,
        "checks": checks,
    }
