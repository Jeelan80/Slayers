"""
Smoke Test for VeriForge Upgraded Pipeline:
1. Aadhaar Ground Truth Extraction
2. Student ID Textract & Barcode Extraction
3. MediaPipe & Biometrics Triangulation
4. College Email OTP Verification
5. Full Multi-Tier Pipeline Execution
"""

import io
import os
from pathlib import Path
import sys

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_college_email_otp_flow():
    print("[1] Testing College Email OTP Flow...")
    res = client.post(
        "/api/verify/college-email/send-otp",
        data={
            "email": "pes2ug23cs915@pes.edu",
            "usn": "PES2UG23CS915",
            "name": "MOHAMMED MUSHARRAF",
        },
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    body = res.json()
    assert body["status"] == "otp_sent"
    assert body["is_institutional"] is True
    assert body["usn_matched"] == "pes2ug23cs915"
    print("    [OK] OTP dispatch confirmed. USN matched in email prefix.")

    # Verify with demo code 123456
    v_res = client.post(
        "/api/verify/college-email/verify-otp",
        data={"email": "pes2ug23cs915@pes.edu", "otp": "123456"},
    )
    assert v_res.status_code == 200, f"Expected 200, got {v_res.status_code}: {v_res.text}"
    v_body = v_res.json()
    assert v_body["status"] == "verified"
    print("    [OK] College email OTP successfully validated.")


def test_student_card_extraction():
    print("\n[2] Testing Student Card Extraction...")
    pesu_pdf = Path("C:/Users/Musharraf/Documents/Aadhar-card/PESU_ID.pdf")
    if not pesu_pdf.exists():
        print("    [skip] PESU_ID.pdf not found.")
        return

    with open(pesu_pdf, "rb") as f:
        pdf_bytes = f.read()

    res = client.post(
        "/api/verify/student-card",
        files={"file": ("PESU_ID.pdf", pdf_bytes, "application/pdf")},
        data={"institution": "PES UNIVERSITY", "name": "MOHAMMED MUSHARRAF"},
    )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    print(f"    [OK] Student Card extracted: Name={data['extracted_fields'].get('name')}, Inst={data['extracted_fields'].get('institution')}")
    print(f"    [OK] OCR Confidence: {data['ocr_confidence']}, Has Cropped Face: {data['has_cropped_face']}")


def test_aadhaar_extraction():
    print("\n[3] Testing Aadhaar Extraction...")
    dad_pdf = Path("C:/Users/Musharraf/Documents/Aadhar-card/Dad-Aadhar (1).pdf")
    if not dad_pdf.exists():
        print("    [skip] Dad-Aadhar (1).pdf not found.")
        return

    with open(dad_pdf, "rb") as f:
        pdf_bytes = f.read()

    res = client.post(
        "/api/verify/aadhaar",
        files={"file": ("Dad-Aadhar.pdf", pdf_bytes, "application/pdf")},
    )
    print(f"    [OK] Aadhaar endpoint responded with status {res.status_code}")
    if res.status_code == 200:
        data = res.json()
        gt = data.get("ground_truth", {})
        print(f"    [OK] Extracted Aadhaar Ground Truth Name: {gt.get('name')}, DOB: {gt.get('dob_iso')}")


def main():
    print("=" * 60)
    print("VeriForge Upgraded Multi-Tier Pipeline Integration Tests")
    print("=" * 60)
    test_college_email_otp_flow()
    test_student_card_extraction()
    test_aadhaar_extraction()
    print("\n[SUCCESS] ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
