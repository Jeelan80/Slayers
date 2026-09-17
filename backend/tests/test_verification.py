"""
Comprehensive Test Suite for Hackingly PS-003 AI Identity & Eligibility Verification.
Tests Academic Service, DQVC QR Engine, Forensics, Decision Policy, and FastAPI Endpoints.
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services.academic import (
    STATUS_ACTIVE,
    STATUS_GRADUATED,
    STATUS_NOT_FOUND,
    STATUS_SUSPENDED,
    verify_student_enrollment,
)
from app.services.decision import decide
from app.services.forensics import (
    blur_score,
    ela_score,
    phash_distance,
    phash_hex,
    quality_score,
    qr_cross_check,
)
from app.services.qr import (
    STATUS_CROSS_VALIDATED,
    STATUS_DECODED,
    STATUS_DETECTED,
    STATUS_NOT_FOUND as QR_NOT_FOUND,
    cross_validate_3way,
    decode_qr,
    parse_qr_payload,
)

client = TestClient(app)
BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "app" / "static" / "samples"


@pytest.fixture(autouse=True)
def clean_database():
    from app.db import reset_db
    reset_db()
    yield


# ==============================================================================
# 1. Academic Verification Service Tests
# ==============================================================================
def test_academic_active_student():
    result = verify_student_enrollment(
        institution="ABC Institute of Technology",
        roll_number="ABC20261023",
        name="Rahul Kumar",
    )
    assert result["status"] == STATUS_ACTIVE
    assert result["verified"] is True
    assert result["trust_score"] >= 0.95
    assert result["record"] is not None
    assert "Rahul Kumar" in result["remarks"]


def test_academic_graduated_student():
    result = verify_student_enrollment(
        institution="Indian Institute of Technology Bombay",
        roll_number="ALUM2021004",
        name="Amitabh Roy",
    )
    assert result["status"] == STATUS_GRADUATED
    assert result["verified"] is False
    assert result["trust_score"] < 0.50


def test_academic_suspended_student():
    result = verify_student_enrollment(
        institution="Delhi Technical University",
        roll_number="SUSP2025771",
        name="Dev Sharma",
    )
    assert result["status"] == STATUS_SUSPENDED
    assert result["verified"] is False
    assert result["trust_score"] <= 0.20


def test_academic_not_found():
    result = verify_student_enrollment(
        institution="Unknown College",
        roll_number="FAKE999999",
        name="Nonexistent Person",
    )
    assert result["status"] == STATUS_NOT_FOUND
    assert result["verified"] is False


def test_academic_impostor_name_mismatch():
    result = verify_student_enrollment(
        institution="ABC Institute of Technology",
        roll_number="ABC20261023",
        name="Totally Different Person",
    )
    assert result["status"] == STATUS_NOT_FOUND
    assert result["verified"] is False
    assert "Impostor risk" in result["remarks"]


# ==============================================================================
# 2. DQVC QR Decoding and Payload Parsing Tests
# ==============================================================================
def test_parse_json_payload():
    raw_json = '{"name": "Priya Patel", "dob": "2004-11-20", "id_number": "NITK2024", "college": "NITK"}'
    parsed = parse_qr_payload(raw_json)
    assert parsed["format"] == "JSON"
    assert parsed["fields"]["NAME"] == "Priya Patel"
    assert parsed["fields"]["DOB"] == "2004-11-20"
    assert parsed["fields"]["ID_NUMBER"] == "NITK2024"
    assert parsed["fields"]["INSTITUTION"] == "NITK"


def test_parse_delimited_payload():
    raw_kv = "NAME=Rahul Kumar;DOB=2005-03-14;ROLL_NO=ABC20261023;INST=ABC Institute"
    parsed = parse_qr_payload(raw_kv)
    assert parsed["format"] == "DELIMITED_KV"
    assert parsed["fields"]["NAME"] == "Rahul Kumar"
    assert parsed["fields"]["DOB"] == "2005-03-14"
    assert parsed["fields"]["ID_NUMBER"] == "ABC20261023"


def test_parse_aadhaar_xml_payload():
    raw_xml = '<PrintLetterBarcodeData uid="999988887777" name="Rahul Kumar" gender="M" yob="2005" dob="14/03/2005" co="S/O Suresh Kumar" dist="Bengaluru" />'
    parsed = parse_qr_payload(raw_xml)
    assert parsed["format"] == "AADHAAR_XML"
    assert parsed["fields"]["NAME"] == "Rahul Kumar"
    assert parsed["fields"]["DOB"] == "14/03/2005"
    assert parsed["fields"]["UID"] == "999988887777"


def test_cross_validate_3way_perfect_match():
    qr_fields = {"NAME": "Rahul Kumar", "DOB": "2005-03-14", "ID_NUMBER": "ABC20261023"}
    ocr_fields = {"NAME": "Rahul Kumar", "DOB": "2005-03-14", "ID_NUMBER": "ABC20261023"}
    reg_fields = {"name": "Rahul Kumar", "dob": "2005-03-14", "id_number": "ABC20261023"}

    res = cross_validate_3way(qr_fields, ocr_fields, reg_fields, qr_status=STATUS_DECODED)
    assert res["dqvc_status"] == STATUS_CROSS_VALIDATED
    assert res["tamper_detected"] is False
    assert res["consistency_score"] == 1.0


def test_cross_validate_3way_tampered_dob():
    # Printed OCR says 2007-04-14, but authentic machine QR says 2005-03-14
    qr_fields = {"NAME": "Rahul Kumar", "DOB": "2005-03-14", "ID_NUMBER": "ABC20261023"}
    ocr_fields = {"NAME": "Rahul Kumar", "DOB": "2007-04-14", "ID_NUMBER": "ABC20261023"}
    reg_fields = {"name": "Rahul Kumar", "dob": "2007-04-14", "id_number": "ABC20261023"}

    res = cross_validate_3way(qr_fields, ocr_fields, reg_fields, qr_status=STATUS_DECODED)
    assert res["dqvc_status"] == STATUS_DECODED
    assert res["tamper_detected"] is True
    assert res["mismatch"] is True
    assert res["consistency_score"] <= 0.20


# ==============================================================================
# 3. Decision Formula & Policy Tests
# ==============================================================================
def test_decision_approve_clean_submission():
    ev = {
        "ocr_confidence": 0.95,
        "quality_score": 0.95,
        "tamper_score": 0.0,
        "consistency_score": 1.0,
        "duplicate_risk": 0.0,
        "face_match": 0.92,
        "exact_duplicate": False,
        "eligibility_pass": True,
        "name_match": 1.0,
        "academic_verified": True,
        "academic_status": "ACTIVE",
    }
    result = decide(ev)
    assert result["decision"] == "APPROVE"
    assert result["confidence"] >= 0.90
    assert len(result["strong_flags"]) == 0


def test_decision_blurry_image_routes_to_manual_review_not_reject():
    """Verify false-positive prevention: degraded image must NOT be rejected for fraud."""
    ev = {
        "ocr_confidence": 0.85,
        "quality_score": 0.35,
        "quality_flag": "LOW_QUALITY",
        "tamper_score": 0.0,
        "consistency_score": 0.80,
        "duplicate_risk": 0.0,
        "exact_duplicate": False,
        "eligibility_pass": True,
        "name_match": 1.0,
        "academic_verified": True,
        "academic_status": "ACTIVE",
    }
    result = decide(ev)
    assert result["decision"] == "MANUAL_REVIEW"
    assert "LOW_QUALITY" in result["summary"] or "blurry" in result["summary"]


def test_decision_rejects_qr_tamper_splicing():
    ev = {
        "ocr_confidence": 0.95,
        "quality_score": 0.95,
        "tamper_score": 1.0,
        "tamper_detected": True,
        "qr_mismatch": True,
        "consistency_score": 0.15,
        "duplicate_risk": 0.0,
        "exact_duplicate": False,
        "eligibility_pass": True,
    }
    result = decide(ev)
    assert result["decision"] == "REJECT"
    assert "QR_OCR_MISMATCH" in result["strong_flags"]


def test_decision_rejects_sybil_duplicate():
    ev = {
        "ocr_confidence": 0.95,
        "quality_score": 0.95,
        "tamper_score": 0.0,
        "consistency_score": 1.0,
        "duplicate_risk": 1.0,
        "exact_duplicate": True,
        "eligibility_pass": True,
    }
    result = decide(ev)
    assert result["decision"] == "REJECT"
    assert "EXACT_ID_DUPLICATE" in result["strong_flags"]


# ==============================================================================
# 4. API Endpoints & Benchmark Demo Samples Tests
# ==============================================================================
def test_samples_endpoint():
    resp = client.get("/api/samples")
    assert resp.status_code == 200
    samples = resp.json()
    assert len(samples) >= 4
    filenames = [s["filename"] for s in samples]
    assert "genuine_college_id.png" in filenames
    assert "duplicate_id.png" in filenames
    assert "tampered_dob_id.png" in filenames
    assert "blurry_id.png" in filenames


def test_static_sample_file_serving():
    resp = client.get("/static/samples/genuine_college_id.png")
    assert resp.status_code == 200
    assert resp.headers["content-type"] in ("image/png", "image/x-png")
    assert len(resp.content) > 1000


def test_verify_genuine_sample():
    with open(SAMPLES_DIR / "genuine_college_id.png", "rb") as f:
        resp = client.post(
            "/api/verify",
            data={
                "name": "Rahul Kumar",
                "dob": "2005-03-14",
                "id_number": "ABC20261023",
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": "18",
                "event_date": "2026-09-18",
            },
            files={"file": ("genuine_college_id.png", f, "image/png")},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "APPROVE"
    assert data["confidence"] >= 0.90
    assert data["checks"]["qr"]["status"] == "CROSS_VALIDATED"
    assert data["checks"]["academic"]["status"] == "ACTIVE"


def test_verify_tampered_dob_sample():
    with open(SAMPLES_DIR / "tampered_dob_id.png", "rb") as f:
        resp = client.post(
            "/api/verify",
            data={
                "name": "Rahul Kumar",
                "dob": "2007-04-14",  # Tampered DOB
                "id_number": "ABC20261023",
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": "18",
                "event_date": "2026-09-18",
                "demo_scenario": "tampered",
            },
            files={"file": ("tampered_dob_id.png", f, "image/png")},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "REJECT"
    assert "QR_OCR_MISMATCH" in data["strong_flags"]


def test_verify_blurry_sample_routes_to_manual_review():
    with open(SAMPLES_DIR / "blurry_id.png", "rb") as f:
        resp = client.post(
            "/api/verify",
            data={
                "name": "Rahul Kumar",
                "dob": "2005-03-14",
                "id_number": "BLUR2026007",
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": "18",
                "event_date": "2026-09-18",
            },
            files={"file": ("blurry_id.png", f, "image/png")},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "MANUAL_REVIEW"
    assert data["checks"]["quality"]["status"] == "REVIEW"
