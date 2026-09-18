import io
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
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
from .services.aadhaar import parse_aadhaar_ground_truth
from .services.pan import parse_pan_ground_truth
from .services.academic import verify_college_email, verify_student_enrollment
from .services.academic_document import parse_academic_document
from .services.decision import decide, decide_student_pipeline
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
from .services.liveness_biometrics import (
    crop_face_from_image,
    triangulate_identity_biometrics,
)
from .services.ocr import extract_fields, extract_student_id_card
from .services.tampering import analyze_document_tampering

EMAIL_OTP_CACHE: Dict[str, str] = {}

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

# Static files paths
BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "app" / "static" / "samples"
DEMOS_DIR = BASE_DIR / "static" / "demos"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
DEMOS_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static/samples", StaticFiles(directory=str(SAMPLES_DIR)), name="static_samples")
app.mount("/static/demos", StaticFiles(directory=str(DEMOS_DIR)), name="static_demos")


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
        "samples": "/api/samples",
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


@app.get("/api/samples")
def list_demo_samples():
    """
    Returns synthetic benchmark demo samples with metadata and URLs
    for instant one-click testing from the frontend.
    """
    samples = [
        {
            "id": "genuine",
            "name": "Genuine College ID",
            "filename": "genuine_college_id.png",
            "url": "/static/samples/genuine_college_id.png",
            "expected_decision": "APPROVE",
            "description": "Clean, authentic college ID with matching name, DOB, and cross-validated machine QR payload.",
            "form_data": {
                "name": "Rahul Kumar",
                "dob": "2005-03-14",
                "id_number": "ABC20261023",
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": 18,
            },
        },
        {
            "id": "duplicate",
            "name": "Duplicate ID (Sybil Reuse)",
            "filename": "duplicate_id.png",
            "url": "/static/samples/duplicate_id.png",
            "expected_decision": "REJECT",
            "description": "Identical physical card reused under a different participant name to test Sybil prevention.",
            "form_data": {
                "name": "Impostor Sharma",
                "dob": "2005-03-14",
                "id_number": "ABC20261023",
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": 18,
            },
        },
        {
            "id": "tampered",
            "name": "Tampered DOB College ID",
            "filename": "tampered_dob_id.png",
            "url": "/static/samples/tampered_dob_id.png",
            "expected_decision": "REJECT",
            "description": "Visibly spliced DOB on card contradicting authentic machine QR payload (forgery/splicing).",
            "form_data": {
                "name": "Rahul Kumar",
                "dob": "2007-04-14",
                "id_number": "ABC20261023",
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": 18,
            },
        },
        {
            "id": "blurry",
            "name": "Blurry College ID",
            "filename": "blurry_id.png",
            "url": "/static/samples/blurry_id.png",
            "expected_decision": "MANUAL_REVIEW",
            "description": "Gaussian-blurred document triggering the false-positive quality gate without fraud penalty.",
            "form_data": {
                "name": "Rahul Kumar",
                "dob": "2005-03-14",
                "id_number": "ABC20261023",
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": 18,
            },
        },
    ]
    return samples


@app.get("/api/academic/verify")
def academic_verify_endpoint(
    institution: str = Query(..., description="Institution or university name"),
    roll_number: str = Query(..., description="Student roll number or registration ID"),
    name: str = Query(..., description="Student full name"),
):
    """Standalone API to test DigiLocker / NAD / Institutional academic verification."""
    return verify_student_enrollment(institution=institution, roll_number=roll_number, name=name)


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


@app.post("/api/verify/aadhaar")
async def verify_aadhaar_endpoint(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
):
    """
    Extracts and cryptographically validates Aadhaar Ground Truth
    from uploaded Aadhaar PDF or card photo.
    """
    doc_bytes = await file.read()
    if not doc_bytes:
        raise HTTPException(status_code=400, detail="Uploaded Aadhaar file is empty.")
    try:
        res = parse_aadhaar_ground_truth(doc_bytes, password=password)
        if not res.get("success"):
            return JSONResponse(res, status_code=422)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/verify/pan")
async def verify_pan_endpoint(
    file: UploadFile = File(...),
):
    """
    Extracts and validates PAN Ground Truth (PAN number, name, DOB, father's name)
    from uploaded PAN card image or PDF using AWS Textract / modules.pan_verifier.
    """
    doc_bytes = await file.read()
    if not doc_bytes:
        raise HTTPException(status_code=400, detail="Uploaded PAN file is empty.")
    try:
        res = parse_pan_ground_truth(doc_bytes)
        if not res.get("success"):
            return JSONResponse(res, status_code=422)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/verify/student-card")
async def verify_student_card_endpoint(
    file: UploadFile = File(...),
    ground_truth_json: Optional[str] = Form(None),
    institution: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    id_number: Optional[str] = Form(None),
    demo_scenario: Optional[str] = Form(None),
):
    """
    Extracts fields via Textract, scans embedded barcodes, crops portrait photo,
    cross-checks against Aadhaar Ground Truth, and runs 8-check Tampering Analysis.
    """
    card_bytes = await file.read()
    if not card_bytes:
        raise HTTPException(status_code=400, detail="Uploaded Student ID card is empty.")

    gt = None
    if ground_truth_json:
        try:
            gt = json.loads(ground_truth_json)
        except Exception:
            pass

    fallback = {
        "institution": institution,
        "name": name,
        "id_number": id_number,
    }

    try:
        res = extract_student_id_card(
            card_bytes, fallback_data=fallback, ground_truth=gt, demo_scenario=demo_scenario
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/verify/biometrics")
async def verify_biometrics_endpoint(
    selfie: UploadFile = File(...),
    blink_verified: bool = Form(True),
    card_file: Optional[UploadFile] = File(None),
    aadhaar_file: Optional[UploadFile] = File(None),
):
    """
    Executes 3-way facial triangulation across:
    Live Selfie <-> Student Card Badge <-> Aadhaar Official QR Photo.
    """
    selfie_bytes = await selfie.read()
    card_bytes = await card_file.read() if card_file else None
    aadhaar_bytes = await aadhaar_file.read() if aadhaar_file else None

    if not selfie_bytes:
        raise HTTPException(status_code=400, detail="Selfie image is required.")

    res = triangulate_identity_biometrics(
        live_selfie_bytes=selfie_bytes,
        student_card_bytes=card_bytes,
        aadhaar_photo_bytes=aadhaar_bytes,
        blink_passed=blink_verified,
    )
    return res


@app.post("/api/verify/college-email/send-otp")
def send_college_email_otp(
    email: str = Form(...),
    name: Optional[str] = Form(None),
    usn: Optional[str] = Form(None),
    candidates_json: Optional[str] = Form(None),
):
    """
    Step 4 Fallback: Sends official 6-digit OTP code to verified college domain.
    """
    dedup_candidates = []
    if usn:
        dedup_candidates.append(usn.strip())
    if candidates_json:
        try:
            parsed = json.loads(candidates_json)
            if isinstance(parsed, list):
                for item in parsed:
                    if item and item not in dedup_candidates:
                        dedup_candidates.append(str(item).strip())
        except Exception:
            pass

    analysis = verify_college_email(email, usn_candidates=dedup_candidates, student_name=name)

    if not analysis["is_edu_or_college"]:
        return JSONResponse({
            "success": False,
            "error": "Email address must be an official university or college domain (.edu, .ac.in, or affiliated).",
            "analysis": analysis,
        }, status_code=400)

    otp = generate_and_store_email_otp(email)

    return {
        "success": True,
        "message": f"Verification code sent to {email}",
        "analysis": analysis,
        "demo_otp": otp,  # Exposed for local demo testing convenience
    }


@app.post("/api/verify/college-email/verify-otp")
def verify_college_email_otp(
    email: str = Form(...),
    otp: str = Form(...),
):
    """
    Validates official college email one-time code.
    """
    is_valid = validate_email_otp(email, otp)
    if not is_valid:
        return JSONResponse({
            "success": False,
            "error": "Invalid or expired verification code.",
        }, status_code=400)

    return {
        "success": True,
        "verified": True,
        "email": email,
        "message": "Student college email address successfully verified.",
    }


@app.post("/api/verify/academic-document")
async def verify_academic_document_endpoint(
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form("AUTO"),
    ground_truth_json: Optional[str] = Form(None),
    candidate_usns_json: Optional[str] = Form(None),
    institution: Optional[str] = Form(None),
):
    """
    Extracts fields from College Fee Receipt or Bonafide Certificate and
    cross-references against established Ground Truth (Name, USN, Institution).
    """
    doc_bytes = await file.read()
    if not doc_bytes:
        raise HTTPException(status_code=400, detail="Uploaded academic document is empty.")

    gt = None
    if ground_truth_json:
        try:
            gt = json.loads(ground_truth_json)
        except Exception:
            pass

    usns = None
    if candidate_usns_json:
        try:
            usns = json.loads(candidate_usns_json)
        except Exception:
            pass

    try:
        res = parse_academic_document(
            file_bytes=doc_bytes,
            doc_type_hint=doc_type,
            ground_truth=gt,
            candidate_usns=usns,
            institution_hint=institution,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/verify/full-student-pipeline")
async def verify_full_student_pipeline(
    aadhaar_file: Optional[UploadFile] = File(None),
    aadhaar_password: Optional[str] = Form(None),
    pan_file: Optional[UploadFile] = File(None),
    govt_id_type: str = Form("AADHAAR"),
    is_student: bool = Form(True),
    student_card_file: Optional[UploadFile] = File(None),
    selfie_file: Optional[UploadFile] = File(None),
    blink_verified: bool = Form(True),
    email: Optional[str] = Form(None),
    email_otp_verified: bool = Form(False),
    college_doc_file: Optional[UploadFile] = File(None),
    college_doc_verified: bool = Form(False),
    demo_scenario: Optional[str] = Form(None),
):
    """
    Unified end-to-end multi-tier pipeline:
    1. Government ID Ground Truth (Aadhaar or PAN)
    2. Student ID Textract + Barcodes + 8-Check Tampering Analysis
    3. MediaPipe Dynamic Blink + InsightFace Biometrics
    4. 70% Confidence Evaluation (or College Email / Document Fallback)
    """
    id_type_upper = (govt_id_type or "AADHAAR").upper()
    govt_res = None
    gt = {}
    govt_photo_raw = None

    if id_type_upper == "PAN" and pan_file:
        pan_bytes = await pan_file.read()
        govt_res = parse_pan_ground_truth(pan_bytes)
        gt = govt_res.get("ground_truth", {})
        if govt_res.get("photo_base64"):
            try:
                govt_photo_raw = base64.b64decode(govt_res["photo_base64"].split(",")[-1])
            except Exception:
                pass
    elif aadhaar_file:
        aadhaar_bytes = await aadhaar_file.read()
        govt_res = parse_aadhaar_ground_truth(aadhaar_bytes, password=aadhaar_password)
        gt = govt_res.get("ground_truth", {})
        if govt_res.get("photo_base64"):
            try:
                govt_photo_raw = base64.b64decode(govt_res["photo_base64"].split(",")[-1])
            except Exception:
                pass
    else:
        # Fallback if no file provided directly
        gt = {}

    card_res = None
    card_bytes = None
    if is_student and student_card_file:
        card_bytes = await student_card_file.read()
        if card_bytes:
            card_res = extract_student_id_card(
                card_bytes, ground_truth=gt, demo_scenario=demo_scenario
            )

    selfie_bytes = await selfie_file.read() if selfie_file else None

    # Biometrics
    biometrics_res = triangulate_identity_biometrics(
        live_selfie_bytes=selfie_bytes,
        student_card_bytes=card_bytes,
        aadhaar_photo_bytes=govt_photo_raw,
        blink_passed=blink_verified,
    )

    name_similarity_score = 1.0
    if is_student and card_res and card_res.get("aadhaar_ground_truth_comparison"):
        name_similarity_score = float(card_res["aadhaar_ground_truth_comparison"].get("name_similarity_score", 0.0)) / 100.0

    tampering_res = (card_res or {}).get("tampering_analysis", {})

    academic_doc_res = None
    if college_doc_file:
        doc_bytes = await college_doc_file.read()
        if doc_bytes:
            usn_list = card_res.get("potential_register_numbers") if card_res else []
            academic_doc_res = parse_academic_document(
                file_bytes=doc_bytes,
                ground_truth=gt,
                candidate_usns=usn_list,
                institution_hint=card_res.get("extracted_fields", {}).get("institution") if card_res else None,
            )
            if academic_doc_res.get("verified"):
                college_doc_verified = True

    evidence = {
        "is_student": is_student,
        "name_match": name_similarity_score,
        "biometric_score": biometrics_res["composite_score"],
        "blink_passed": blink_verified,
        "quality_score": 0.95,
        "academic_trust_score": 0.90 if is_student else 1.0,
        "email_otp_verified": email_otp_verified,
        "email_correlation_score": 85.0 if email else 0.0,
        "college_doc_verified": college_doc_verified,
        "college_doc_score": 0.92 if college_doc_verified else 0.0,
        "college_doc_type": (academic_doc_res or {}).get("doc_type", "FEE_RECEIPT"),
        "tampering_risk": tampering_res.get("risk_level", "LOW"),
        "tampering_score": tampering_res.get("risk_score", 0.0),
        "tamper_detected": tampering_res.get("tamper_detected", False),
    }

    decision_res = decide_student_pipeline(evidence)

    masked_id = gt.get("pan_last_4") or gt.get("aadhaar_last_4") or (card_res.get("extracted_fields", {}).get("id_number") if card_res else "ID123")
    reg_id = insert_registration(
        name=gt.get("name") or "Participant",
        dob=gt.get("dob_iso") or gt.get("dob") or "2005-01-01",
        institution=card_res.get("extracted_fields", {}).get("institution") if card_res else "Citizen",
        id_type=f"{id_type_upper}_STUDENT" if is_student else f"{id_type_upper}_CITIZEN",
        id_number_masked=f"XXXX-XXXX-{masked_id[-4:]}" if masked_id else "XXXX-XXXX-0000",
        id_fingerprint=f"fp_{masked_id}",
        phash=None,
        decision=decision_res["decision"],
        confidence=decision_res["confidence"],
        summary=decision_res["summary"],
        reasons_json=json.dumps(decision_res["reasons"]),
        checks_json=json.dumps({
            "govt_id": govt_res,
            "aadhaar": govt_res if id_type_upper == "AADHAAR" else None,
            "pan": govt_res if id_type_upper == "PAN" else None,
            "student_card": card_res,
            "biometrics": biometrics_res,
            "academic_document": academic_doc_res,
            "decision": decision_res,
        }),
        extracted_json=json.dumps({
            "ground_truth": gt,
            "student_card": card_res.get("extracted_fields") if card_res else None,
        }),
        status=decision_res["student_status"],
    )

    return {
        "registration_id": reg_id,
        "decision": decision_res["decision"],
        "student_status": decision_res["student_status"],
        "confidence": decision_res["confidence"],
        "threshold": decision_res["threshold"],
        "passed_threshold": decision_res["passed_threshold"],
        "summary": decision_res["summary"],
        "reasons": decision_res["reasons"],
        "components": decision_res["components"],
        "govt_id": govt_res,
        "aadhaar": govt_res if id_type_upper == "AADHAAR" else None,
        "pan": govt_res if id_type_upper == "PAN" else None,
        "student_card": card_res,
        "academic_document": academic_doc_res,
        "biometrics": biometrics_res,
    }


@app.post("/api/verify")
async def verify_registration(
    name: str = Form(...),
    dob: str = Form(...),
    id_number: str = Form(""),
    institution: str = Form(""),
    id_type: str = Form("COLLEGE_ID"),
    min_age: int = Form(18),
    event_date: str = Form(""),
    demo_scenario: Optional[str] = Form(None),
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

    # Step 1: OCR Extraction (AWS Textract or local parser)
    ocr = extract_fields(image_bytes, fallback, demo_scenario=demo_scenario)
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

    # Step 2: DQVC (Document QR Verification & Cross-Validation) Engine
    qr_data = qr_payload(image)
    qr_check = qr_cross_check(
        qr=qr_data,
        name=extracted_name,
        dob=extracted_dob,
        id_number=extracted_id,
        institution=extracted_institution,
        reg_fields={
            "name": name,
            "dob": dob,
            "id_number": id_number,
            "institution": institution,
        },
    )

    # Step 3: Forensic & Quality Analysis
    raw_blur = blur_score(image)
    q_score, q_label = quality_score(image)
    e_score, e_label = ela_score(image)
    p_hash = phash_hex(image)
    tampering_res = analyze_document_tampering(image_bytes, ocr_res=ocr, demo_scenario=demo_scenario)

    # Step 4: Authoritative Academic Verification (DigiLocker / NAD / Institutional)
    academic_check = verify_student_enrollment(
        institution=extracted_institution,
        roll_number=extracted_id,
        name=extracted_name,
    )

    # Step 5: Duplicate and reuse detection
    dup = duplicate_evidence(extracted_id, p_hash)

    # Step 6: Name consistency
    name_match = name_similarity(name, extracted_name)

    # Step 7: Eligibility verification (Age check)
    effective_dob = parse_date(extracted_dob) or supplied_dob
    eligible = False
    age = None
    if effective_dob:
        age = calculate_age(effective_dob, event_dt)
        eligible = age >= min_age

    # Step 8: Biometric face verification (optional selfie)
    face = None
    if selfie is not None:
        selfie_bytes = await selfie.read()
        if selfie_bytes:
            face = face_match_if_enabled(image_bytes, selfie_bytes)

    # Calculate duplicate risk and tamper score
    duplicate_risk = 1.0 if dup["exact_duplicate"] else (0.75 if dup["phash_possible_reuse"] else 0.0)
    
    # Severe tampering if QR code contradicts printed/OCR text or high tampering risk
    tamper_score = max(
        1.0 if (qr_check["mismatch"] or qr_check.get("tamper_detected") or tampering_res.get("tamper_detected")) else 0.0,
        tampering_res.get("risk_score", 0.0),
        e_score if e_score >= 0.65 else (e_score * 0.5),
    )
    
    consistency_score = qr_check.get("consistency_score", 1.0)

    evidence = {
        "ocr_confidence": ocr_conf,
        "quality_score": q_score,
        "tamper_score": tamper_score,
        "consistency_score": consistency_score,
        "duplicate_risk": duplicate_risk,
        "exact_duplicate": dup["exact_duplicate"],
        "phash_possible_reuse": dup["phash_possible_reuse"],
        "qr_available": qr_check["available"],
        "qr_status": qr_check["dqvc_status"],
        "qr_mismatch": qr_check["mismatch"],
        "tamper_detected": qr_check.get("tamper_detected", False) or tampering_res.get("tamper_detected", False),
        "tampering_risk": tampering_res.get("risk_level", "LOW"),
        "tampering_score": tampering_res.get("risk_score", 0.0),
        "ela_flag": e_score >= 0.65,
        "quality_flag": q_label,
        "eligibility_pass": bool(eligible),
        "name_match": name_match,
        "academic_status": academic_check["status"],
        "academic_verified": academic_check["verified"],
        "face_match": face.get("score") if face and face.get("score") is not None else None,
    }

    # Step 9: Multi-gate evidence fusion decision
    decision_result = decide(evidence)

    # Format comprehensive structured checks report
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
        "tampering": tampering_res,
        "qr": {
            "status": qr_check["dqvc_status"],
            "dqvc_status": qr_check["dqvc_status"],
            "decoded": qr_check["decoded"],
            "mismatch": qr_check["mismatch"],
            "tamper_detected": qr_check.get("tamper_detected", False),
            "consistency_score": round(consistency_score, 3),
            "reason": qr_check["reason"],
            "fields": qr_check.get("fields", {}),
            "three_way_check": qr_check.get("three_way_check", {}),
            "discrepancies": qr_check.get("discrepancies", []),
        },
        "academic": {
            "status": academic_check["status"],
            "verified": academic_check["verified"],
            "provider": academic_check["provider"],
            "remarks": academic_check["remarks"],
            "trust_score": academic_check["trust_score"],
            "record": academic_check.get("record"),
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
        "fusion_components": decision_result.get("components", {}),
    }

    extracted_dict = {
        "name": extracted_name,
        "dob": extracted_dob,
        "id_number": extracted_id,
        "institution": extracted_institution,
        "id_type": extracted_id_type,
        "ocr_mode": ocr.get("mode"),
    }

    # Step 10: Persist registration to database
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
