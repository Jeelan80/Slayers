import json
import sys
from pathlib import Path
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app

client = TestClient(app)

def test_pan_endpoint():
    sample_path = REPO_ROOT / "modules" / "pan_verifier" / "samples" / "sample_pan.png"
    assert sample_path.exists()

    with open(sample_path, "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/verify/pan",
        files={"file": ("sample_pan.png", file_bytes, "image/png")},
    )
    assert response.status_code == 200, f"Error: {response.status_code} {response.text}"
    data = response.json()
    assert data["success"] is True
    assert data["id_type"] == "PAN"
    gt = data["ground_truth"]
    assert gt["pan_number"] == "IPXPM8977J"
    assert "BODHI" in gt["name"]
    print("[PASS] /api/verify/pan returned valid ground truth")

def test_full_pipeline_with_pan():
    sample_path = REPO_ROOT / "modules" / "pan_verifier" / "samples" / "sample_pan.png"
    card_path = BACKEND_DIR / "app" / "static" / "samples" / "genuine_college_id.png"

    with open(sample_path, "rb") as f:
        pan_bytes = f.read()
    with open(card_path, "rb") as f:
        card_bytes = f.read()

    response = client.post(
        "/api/verify/full-student-pipeline",
        data={"govt_id_type": "PAN", "is_student": "true", "blink_verified": "true"},
        files={
            "pan_file": ("sample_pan.png", pan_bytes, "image/png"),
            "student_card_file": ("genuine_college_id.png", card_bytes, "image/png"),
        },
    )
    assert response.status_code == 200, f"Error: {response.status_code} {response.text}"
    data = response.json()
    assert "decision" in data
    assert "confidence" in data
    assert "govt_id" in data
    assert data["govt_id"]["id_type"] == "PAN"
    print(f"[PASS] /api/verify/full-student-pipeline with PAN executed successfully: decision={data['decision']}, confidence={data['confidence']}")

if __name__ == "__main__":
    test_pan_endpoint()
    test_full_pipeline_with_pan()
    print("All FastAPI endpoint tests passed!")
