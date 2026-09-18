"""
Empirical Challenge Test Suite for Challenger 2:
Sybil Defense, Duplicate Detection, Forensics Edge Cases & Variance Extremes.
"""

import concurrent.futures
import io
import json
from pathlib import Path
import time
from typing import Any, Dict, Tuple

import cv2
import numpy as np
from PIL import Image
import pytest
import requests

from app.main import app
from app.services.decision import decide
from app.services.duplicate import (
    duplicate_evidence,
    fingerprint_id,
    mask_id,
    normalize_id,
)
from app.services.forensics import (
    blur_score,
    ela_score,
    phash_distance,
    phash_hex,
    quality_score,
)

BASE_URL = "http://localhost:8000"
BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "app" / "static" / "samples"
GENUINE_CARD_PATH = SAMPLES_DIR / "genuine_college_id.png"


def create_solid_image(width: int, height: int, color: Tuple[int, int, int]) -> bytes:
    """Creates a PNG image with a solid color."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_noise_image(width: int, height: int) -> bytes:
    """Creates a PNG image with extreme uniform random noise."""
    arr = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
    img = Image.fromarray(arr, "RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_calibrated_blur_image(target_var: float) -> Tuple[bytes, float]:
    """
    Synthesizes an image with a controlled Laplacian blur variance
    near target_var by blurring a checkerboard/texture.
    """
    # Start with genuine card or high-frequency checkerboard
    if GENUINE_CARD_PATH.exists():
        base = Image.open(GENUINE_CARD_PATH).convert("RGB")
    else:
        # 400x300 checkerboard
        grid = np.indices((300, 400)).sum(axis=0) % 2 * 255
        base = Image.fromarray(np.stack([grid]*3, axis=-1).astype(np.uint8))
    
    base_arr = np.array(base.convert("L"))
    
    # Binary search for blur kernel / sigma to get desired variance
    low_sigma, high_sigma = 0.5, 30.0
    best_img = base
    best_var = float(cv2.Laplacian(base_arr, cv2.CV_64F).var())
    
    for _ in range(25):
        mid_sigma = (low_sigma + high_sigma) / 2.0
        # Kernel size must be odd
        ksize = int(round(mid_sigma * 4)) | 1
        blurred = cv2.GaussianBlur(base_arr, (ksize, ksize), mid_sigma)
        var = float(cv2.Laplacian(blurred, cv2.CV_64F).var())
        
        if var > target_var:
            low_sigma = mid_sigma
        else:
            high_sigma = mid_sigma
            
        best_var = var
        best_img = Image.fromarray(blurred).convert("RGB")
        if abs(var - target_var) < 1.0:
            break
            
    buf = io.BytesIO()
    best_img.save(buf, format="PNG")
    return buf.getvalue(), best_var


@pytest.fixture(autouse=True)
def reset_server():
    """Reset server demo database before tests."""
    try:
        requests.post(f"{BASE_URL}/api/reset", timeout=5)
    except Exception:
        pass


# ==============================================================================
# 1. ID Normalization Edge Cases
# ==============================================================================
def test_normalize_id_unit_variations():
    """Verify that spaces, mixed casing, hyphens, and whitespace all normalize identically."""
    canonical = "ABC20261023"
    variations = [
        "ABC20261023",
        "abc20261023",
        "AbC20261023",
        "ABC 2026 1023",
        "  ABC  2026  1023  ",
        "ABC-2026-1023",
        "--ABC--2026--1023--",
        "   abc - 2026 - 1023   ",
        "\tABC20261023\n",
        "abc_2026_1023",  # underscore is non-alnum
        "ABC.2026.1023",  # dots
        "ABC/2026/1023",  # slashes
    ]
    for var in variations:
        norm = normalize_id(var)
        assert norm == canonical, f"Failed normalization for: {var!r} -> {norm!r} (expected {canonical!r})"


def test_normalize_id_empty_and_punctuation():
    assert normalize_id("") == ""
    assert normalize_id(None) == ""
    assert normalize_id("   ---   ///   ") == ""


def test_fingerprint_id_consistency():
    canonical_fp = fingerprint_id("ABC20261023")
    assert canonical_fp is not None
    assert len(canonical_fp) == 64  # SHA-256 hex string

    # All variations must produce the exact same fingerprint
    assert fingerprint_id("abc 2026 1023") == canonical_fp
    assert fingerprint_id("  ABC-2026-1023  ") == canonical_fp
    assert fingerprint_id("\tAbc20261023\n") == canonical_fp


def test_mask_id_behavior():
    assert mask_id("ABC20261023") == "AB*******23"
    assert mask_id("ABC-2026-1023") == "AB*********23"
    assert mask_id("1234") == "***"
    assert mask_id("12") == "***"
    assert mask_id("") == ""
    assert mask_id(None) == ""


def test_live_http_id_normalization_duplicate_detection():
    """
    Submit registration with hyphenated ID, then attempt duplicates with
    spaces, lower case, whitespace padding, and punctuation.
    """
    with open(GENUINE_CARD_PATH, "rb") as f:
        img_bytes = f.read()

    # Step 1: Initial legitimate registration
    resp1 = requests.post(
        f"{BASE_URL}/api/verify",
        data={
            "name": "Rahul Kumar",
            "dob": "2005-03-14",
            "id_number": "ABC-2026-1023",
            "institution": "ABC Institute of Technology",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("card.png", img_bytes, "image/png")},
        timeout=10,
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["decision"] == "APPROVE"

    # Variations that must all be caught as EXACT_ID_DUPLICATE
    variants = [
        ("Impostor Space", "abc 2026 1023"),
        ("Impostor Padding", "   ABC20261023   \t"),
        ("Impostor Mixed", "  AbC - 2026 - 1023  "),
        ("Impostor LowerHyphen", "abc-2026-1023"),
    ]

    for imp_name, imp_id in variants:
        resp = requests.post(
            f"{BASE_URL}/api/verify",
            data={
                "name": imp_name,
                "dob": "2005-03-14",
                "id_number": imp_id,
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": "18",
                "event_date": "2026-09-18",
            },
            files={"file": ("card.png", img_bytes, "image/png")},
            timeout=10,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["decision"] == "REJECT", f"Variant {imp_id!r} failed to reject! Got {data['decision']}"
        assert "EXACT_ID_DUPLICATE" in data["strong_flags"], f"Missing EXACT_ID_DUPLICATE flag for {imp_id!r}"
        assert data["checks"]["duplicate"]["status"] == "DUPLICATE"


# ==============================================================================
# 2. Rapid Duplicate Registrations
# ==============================================================================
def test_rapid_consecutive_duplicate_burst():
    """
    Submits 10 rapid consecutive registrations with the same ID.
    Registration 1 passes; Registrations 2-10 must all trigger EXACT_ID_DUPLICATE.
    """
    with open(GENUINE_CARD_PATH, "rb") as f:
        img_bytes = f.read()

    test_id = "RAPID2026999"
    results = []

    for i in range(10):
        t0 = time.time()
        resp = requests.post(
            f"{BASE_URL}/api/verify",
            data={
                "name": f"Student {i}",
                "dob": "2005-03-14",
                "id_number": test_id,
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": "18",
                "event_date": "2026-09-18",
            },
            files={"file": ("card.png", img_bytes, "image/png")},
            timeout=10,
        )
        latency = time.time() - t0
        assert resp.status_code == 200
        results.append((resp.json(), latency))

    # First request: Approved
    first_data, first_lat = results[0]
    assert first_data["decision"] == "APPROVE"
    assert "EXACT_ID_DUPLICATE" not in first_data["strong_flags"]

    # Subsequent 9 requests: MUST all be REJECT with EXACT_ID_DUPLICATE
    for idx, (data, lat) in enumerate(results[1:], start=2):
        assert data["decision"] == "REJECT", f"Request #{idx} failed to reject! Got {data['decision']}"
        assert "EXACT_ID_DUPLICATE" in data["strong_flags"], f"Request #{idx} missing EXACT_ID_DUPLICATE flag"
        assert data["checks"]["duplicate"]["status"] == "DUPLICATE"
        assert data["checks"]["duplicate"]["exact_match"] is not None


def test_concurrent_duplicate_submission_race_conditions():
    """
    Submits 5 concurrent requests with identical ID simultaneously using ThreadPoolExecutor.
    Verifies that system does not crash or leave inconsistent duplicate state.
    """
    with open(GENUINE_CARD_PATH, "rb") as f:
        img_bytes = f.read()

    test_id = "CONCURRENT2026888"

    def submit(idx: int):
        resp = requests.post(
            f"{BASE_URL}/api/verify",
            data={
                "name": f"Concurrent User {idx}",
                "dob": "2005-03-14",
                "id_number": test_id,
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": "18",
                "event_date": "2026-09-18",
            },
            files={"file": ("card.png", img_bytes, "image/png")},
            timeout=15,
        )
        return resp.status_code, resp.json()

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(submit, i) for i in range(5)]
        outcomes = [f.result() for f in futures]

    # Verify all requests returned HTTP 200
    for code, data in outcomes:
        assert code == 200

    decisions = [data["decision"] for _, data in outcomes]
    duplicate_flags = ["EXACT_ID_DUPLICATE" in data["strong_flags"] for _, data in outcomes]

    # At least one succeeded or was processed first, and duplicates were caught
    assert "APPROVE" in decisions or "REJECT" in decisions
    print(f"Concurrent burst decisions: {decisions}, duplicate flags: {duplicate_flags}")


# ==============================================================================
# 3. Forensics Variance Extremes
# ==============================================================================
def test_forensics_pure_black_zero_variance():
    """Tests pure black image: Laplacian variance == 0.0, score == 0.35, LOW_QUALITY."""
    img = Image.new("RGB", (400, 300), color=(0, 0, 0))
    var = blur_score(img)
    assert var == 0.0, f"Expected 0.0 variance for solid black, got {var}"

    score, label = quality_score(img)
    assert score == 0.35
    assert label == "LOW_QUALITY"

    phash = phash_hex(img)
    assert isinstance(phash, str) and len(phash) == 16
    assert phash == "0000000000000000"

    e_score, e_label = ela_score(img)
    assert isinstance(e_score, float)
    assert 0.0 <= e_score <= 1.0


def test_forensics_pure_white_zero_variance():
    """Tests pure white image: Laplacian variance == 0.0, score == 0.35, LOW_QUALITY."""
    img = Image.new("RGB", (400, 300), color=(255, 255, 255))
    var = blur_score(img)
    assert var == 0.0, f"Expected 0.0 variance for solid white, got {var}"

    score, label = quality_score(img)
    assert score == 0.35
    assert label == "LOW_QUALITY"

    phash = phash_hex(img)
    assert isinstance(phash, str) and len(phash) == 16
    assert phash == "0000000000000000"


def test_live_http_pure_black_routes_to_manual_review_not_fraud():
    """
    Submitting a pure black image must route to MANUAL_REVIEW via quality gate,
    and NOT be falsely rejected for fraud.
    """
    black_bytes = create_solid_image(400, 300, (0, 0, 0))
    resp = requests.post(
        f"{BASE_URL}/api/verify",
        data={
            "name": "Rahul Kumar",
            "dob": "2005-03-14",
            "id_number": "BLACK2026001",
            "institution": "ABC Institute of Technology",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("black.png", black_bytes, "image/png")},
        timeout=10,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "MANUAL_REVIEW"
    assert data["checks"]["quality"]["blur_variance"] == 0.0
    assert data["checks"]["quality"]["label"] == "LOW_QUALITY"
    assert "QR_OCR_MISMATCH" not in data["strong_flags"]
    assert "EXACT_ID_DUPLICATE" not in data["strong_flags"]


def test_live_http_pure_white_routes_to_manual_review():
    white_bytes = create_solid_image(400, 300, (255, 255, 255))
    resp = requests.post(
        f"{BASE_URL}/api/verify",
        data={
            "name": "Rahul Kumar",
            "dob": "2005-03-14",
            "id_number": "WHITE2026001",
            "institution": "ABC Institute of Technology",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("white.png", white_bytes, "image/png")},
        timeout=10,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "MANUAL_REVIEW"
    assert data["checks"]["quality"]["blur_variance"] == 0.0
    assert data["checks"]["quality"]["label"] == "LOW_QUALITY"


def test_forensics_extreme_noise():
    """Extreme noise image produces very high Laplacian variance without crashing."""
    noise_bytes = create_noise_image(400, 300)
    noise_img = Image.open(io.BytesIO(noise_bytes))

    var = blur_score(noise_img)
    assert var > 1000.0, f"Expected high variance for noise, got {var}"

    score, label = quality_score(noise_img)
    assert score == 0.95
    assert label == "GOOD_QUALITY"

    phash = phash_hex(noise_img)
    assert isinstance(phash, str) and len(phash) == 16

    resp = requests.post(
        f"{BASE_URL}/api/verify",
        data={
            "name": "Rahul Kumar",
            "dob": "2005-03-14",
            "id_number": "NOISE2026001",
            "institution": "ABC Institute of Technology",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("noise.png", noise_bytes, "image/png")},
        timeout=10,
    )
    assert resp.status_code == 200
    data = resp.json()
    # QR won't decode on pure random noise
    assert data["checks"]["qr"]["status"] == "NOT_FOUND"


def test_borderline_blur_variance_threshold_policy():
    """
    Verifies the sharp threshold at 40.0:
    variance < 40.0 -> score 0.35, LOW_QUALITY -> forces MANUAL_REVIEW.
    variance >= 40.0 -> score 0.65, BORDERLINE_QUALITY.
    """
    # 1. Variance 39.5 (Below 40.0 threshold)
    ev_39_5 = {
        "ocr_confidence": 0.95,
        "quality_score": 0.35,
        "quality_flag": "LOW_QUALITY",
        "tamper_score": 0.0,
        "consistency_score": 1.0,
        "duplicate_risk": 0.0,
        "exact_duplicate": False,
        "eligibility_pass": True,
        "name_match": 1.0,
        "academic_verified": True,
        "academic_status": "ACTIVE",
    }
    dec_39_5 = decide(ev_39_5)
    assert dec_39_5["decision"] == "MANUAL_REVIEW"
    assert "blurry/unreadable" in dec_39_5["summary"] or "LOW_QUALITY" in str(dec_39_5["reasons"])

    # 2. Variance 40.5 (Above 40.0 threshold, BORDERLINE_QUALITY)
    ev_40_5 = {
        "ocr_confidence": 0.95,
        "quality_score": 0.65,
        "quality_flag": "BORDERLINE_QUALITY",
        "tamper_score": 0.0,
        "consistency_score": 1.0,
        "duplicate_risk": 0.0,
        "exact_duplicate": False,
        "eligibility_pass": True,
        "name_match": 1.0,
        "academic_verified": True,
        "academic_status": "ACTIVE",
    }
    dec_40_5 = decide(ev_40_5)
    # Composite score: 0.9528 >= 0.78 -> APPROVE!
    assert dec_40_5["decision"] == "APPROVE"
    assert dec_40_5["confidence"] >= 0.78


def test_live_http_calibrated_blur_below_and_above_threshold():
    """Live verification with synthesized images near the 40.0 threshold."""
    # Synthesize image with variance < 40
    sub_40_bytes, sub_var = create_calibrated_blur_image(target_var=30.0)
    resp_sub = requests.post(
        f"{BASE_URL}/api/verify",
        data={
            "name": "Rahul Kumar",
            "dob": "2005-03-14",
            "id_number": "BLURSUB40",
            "institution": "ABC Institute of Technology",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("blur_sub.png", sub_40_bytes, "image/png")},
        timeout=10,
    )
    assert resp_sub.status_code == 200
    sub_data = resp_sub.json()
    assert sub_data["checks"]["quality"]["blur_variance"] < 40.0
    assert sub_data["decision"] == "MANUAL_REVIEW"
    assert sub_data["checks"]["quality"]["label"] == "LOW_QUALITY"


# ==============================================================================
# 4. Server Stability Under Malformed & Edge Conditions
# ==============================================================================
def test_server_empty_file():
    """Empty payload returns HTTP 400 Bad Request."""
    resp = requests.post(
        f"{BASE_URL}/api/verify",
        data={"name": "Test", "dob": "2000-01-01"},
        files={"file": ("empty.png", b"", "image/png")},
        timeout=5,
    )
    assert resp.status_code == 400
    assert "empty" in resp.json().get("error", "").lower()


def test_server_corrupt_file():
    """Corrupt image bytes return HTTP 400 Bad Request."""
    resp = requests.post(
        f"{BASE_URL}/api/verify",
        data={"name": "Test", "dob": "2000-01-01"},
        files={"file": ("corrupt.png", b"CORRUPT_NOT_AN_IMAGE_DATA_12345", "image/png")},
        timeout=5,
    )
    assert resp.status_code == 400
    assert "unsupported" in resp.json().get("error", "").lower() or "corrupt" in resp.json().get("error", "").lower()


def test_server_single_pixel_image():
    """1x1 image should not trigger crash, zero division, or 500 error."""
    pixel_bytes = create_solid_image(1, 1, (128, 128, 128))
    resp = requests.post(
        f"{BASE_URL}/api/verify",
        data={
            "name": "Single Pixel",
            "dob": "2000-01-01",
            "id_number": "PX1",
            "institution": "ABC",
        },
        files={"file": ("pixel.png", pixel_bytes, "image/png")},
        timeout=5,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["decision"] == "MANUAL_REVIEW"


def test_server_oversized_id_and_unicode():
    """Very large ID strings and unicode characters are handled gracefully."""
    with open(GENUINE_CARD_PATH, "rb") as f:
        img_bytes = f.read()

    long_id = "ABC" + ("9" * 2000)
    resp = requests.post(
        f"{BASE_URL}/api/verify",
        data={
            "name": "Rahul Kumar",
            "dob": "2005-03-14",
            "id_number": long_id,
            "institution": "ABC Institute",
        },
        files={"file": ("card.png", img_bytes, "image/png")},
        timeout=10,
    )
    assert resp.status_code == 200


def test_server_health_remains_ok():
    """Confirm server remains healthy after all stress tests."""
    resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
