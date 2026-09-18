import json
import sys
from pathlib import Path
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.services.academic_document import parse_academic_document, detect_document_type

client = TestClient(app)

def test_document_type_detection():
    assert detect_document_type("PES University - Semester Tuition Fee Receipt 2024-2025") == "FEE_RECEIPT"
    assert detect_document_type("Official Bonafide Certificate - This is to certify that Rahul Kumar is a bonafide student") == "BONAFIDE_CERTIFICATE"
    assert detect_document_type("Provisional Admission & Enrollment Letter") == "ENROLLMENT_LETTER"

def test_parse_academic_document_service():
    # Synthetic image for document
    import numpy as np
    import cv2
    img = np.ones((600, 800, 3), dtype=np.uint8) * 255
    cv2.putText(img, "COLLEGE TUITION FEE RECEIPT", (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img, "Student Name: Rahul Kumar", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Roll No: ABC20261023", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Institution: PES University", (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "Academic Session: 2024-2025", (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    _, buf = cv2.imencode(".png", img)
    doc_bytes = buf.tobytes()

    gt = {"name": "Rahul Kumar", "institution": "PES University"}
    usns = ["ABC20261023"]

    res = parse_academic_document(
        doc_bytes,
        doc_type_hint="FEE_RECEIPT",
        ground_truth=gt,
        candidate_usns=usns,
        institution_hint="PES University",
    )
    assert res["success"] is True
    assert res["verified"] is True
    assert res["doc_type"] == "FEE_RECEIPT"
    assert res["comparison"]["name_match"] is True
    assert res["comparison"]["usn_match"] is True
    print("[PASS] parse_academic_document passed successfully:", res["message"])

def test_api_verify_academic_document():
    import numpy as np
    import cv2
    img = np.ones((600, 800, 3), dtype=np.uint8) * 255
    cv2.putText(img, "BONAFIDE CERTIFICATE", (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    cv2.putText(img, "Student Name: Rahul Kumar", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "USN: ABC20261023", (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, "PES University Bengaluru", (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    _, buf = cv2.imencode(".png", img)
    doc_bytes = buf.tobytes()

    response = client.post(
        "/api/verify/academic-document",
        data={
            "doc_type": "BONAFIDE",
            "ground_truth_json": json.dumps({"name": "Rahul Kumar", "institution": "PES University"}),
            "candidate_usns_json": json.dumps(["ABC20261023"]),
            "institution": "PES University",
        },
        files={"file": ("bonafide.png", doc_bytes, "image/png")},
    )
    assert response.status_code == 200, f"Error: {response.status_code} {response.text}"
    data = response.json()
    assert data["success"] is True
    assert data["verified"] is True
    assert data["doc_type"] == "BONAFIDE"
    print("[PASS] /api/verify/academic-document endpoint passed successfully")

def test_full_pipeline_with_document_fallback():
    sample_path = REPO_ROOT / "modules" / "pan_verifier" / "samples" / "sample_pan.png"
    card_path = BACKEND_DIR / "app" / "static" / "samples" / "genuine_college_id.png"

    with open(sample_path, "rb") as f:
        pan_bytes = f.read()
    with open(card_path, "rb") as f:
        card_bytes = f.read()

    response = client.post(
        "/api/verify/full-student-pipeline",
        data={
            "govt_id_type": "PAN",
            "is_student": "true",
            "blink_verified": "true",
            "college_doc_verified": "true",
        },
        files={
            "pan_file": ("sample_pan.png", pan_bytes, "image/png"),
            "student_card_file": ("genuine_college_id.png", card_bytes, "image/png"),
        },
    )
    assert response.status_code == 200, f"Error: {response.status_code} {response.text}"
    data = response.json()
    assert data["decision"] == "APPROVE"
    assert data["student_status"] == "VERIFIED_STUDENT_DOCUMENT_BACKED"
    assert data["confidence"] >= 0.88
    print(f"[PASS] full-student-pipeline with document fallback approved: status={data['student_status']}, conf={data['confidence']}")

if __name__ == "__main__":
    test_document_type_detection()
    test_parse_academic_document_service()
    test_api_verify_academic_document()
    test_full_pipeline_with_document_fallback()
    print("All Academic Document fallback tests passed successfully!")
