import os
import sys
from pathlib import Path

# Add backend directory and root to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(BACKEND_DIR))

from app.services.pan import parse_pan_ground_truth, parse_pan_dob_to_iso

def test_dob_conversion():
    assert parse_pan_dob_to_iso("01/01/1958") == "1958-01-01"
    assert parse_pan_dob_to_iso("14-03-2005") == "2005-03-14"

def test_pan_parsing_on_sample():
    sample_path = REPO_ROOT / "modules" / "pan_verifier" / "samples" / "sample_pan.png"
    assert sample_path.exists(), f"Sample PAN image not found at {sample_path}"

    with open(sample_path, "rb") as f:
        img_bytes = f.read()

    res = parse_pan_ground_truth(img_bytes)
    assert res["success"] is True
    assert res["id_type"] == "PAN"
    gt = res["ground_truth"]
    assert gt["pan_number"] == "IPXPM8977J"
    assert "BODHI" in gt["name"]
    assert "MAHTO" in gt["name"]
    assert gt["dob"] == "01/01/1958"
    assert gt["dob_iso"] == "1958-01-01"
    print("Test passed successfully:", res)

if __name__ == "__main__":
    test_dob_conversion()
    test_pan_parsing_on_sample()
    print("All PAN verification unit tests passed!")
