import io
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import pytest

from app.services.tampering import (
    analyze_document_tampering,
    check_font_consistency,
    check_ocr_confidence,
    check_text_alignment,
    check_text_geometry,
    detect_compression_anomaly,
    detect_copy_move,
    detect_noise_edge_inconsistency,
    detect_splicing,
)


@pytest.fixture
def clean_id_bytes():
    """Generates a clean synthetic college ID card in memory."""
    img = Image.new("RGB", (600, 380), color=(245, 247, 250))
    draw = ImageDraw.Draw(img)

    # Header
    draw.rectangle([(0, 0), (600, 70)], fill=(24, 43, 73))
    draw.text((20, 24), "PES UNIVERSITY · STUDENT IDENTITY CARD", fill=(255, 255, 255))

    # Photo box
    draw.rectangle([(30, 95), (150, 245)], fill=(200, 210, 220), outline=(100, 110, 120))

    # Text fields
    draw.text((180, 100), "NAME: ARJUN SHARMA", fill=(20, 20, 20))
    draw.text((180, 140), "USN: PES1UG20CS001", fill=(20, 20, 20))
    draw.text((180, 180), "DOB: 2004-05-12", fill=(20, 20, 20))
    draw.text((180, 220), "BRANCH: COMPUTER SCIENCE & ENG", fill=(20, 20, 20))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def tampered_sample_bytes():
    """Reads tampered demo sample if available, or creates a spliced sample."""
    sample_path = Path(__file__).resolve().parent.parent / "static" / "samples" / "tampered_dob_id.png"
    if sample_path.exists():
        return sample_path.read_bytes()

    # Fallback synthetic tampered
    img = Image.new("RGB", (600, 380), color=(245, 247, 250))
    draw = ImageDraw.Draw(img)
    draw.text((180, 100), "NAME: ARJUN SHARMA", fill=(20, 20, 20))
    # Spliced red box
    draw.rectangle([(175, 175), (350, 205)], fill=(255, 220, 220))
    draw.text((180, 180), "DOB: 2007-04-14", fill=(220, 20, 20))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_analyze_clean_document(clean_id_bytes):
    ocr_res = {
        "NAME": {"value": "ARJUN SHARMA", "confidence": 0.98},
        "ID_NUMBER": {"value": "PES1UG20CS001", "confidence": 0.97},
        "INSTITUTION": {"value": "PES UNIVERSITY", "confidence": 0.96},
        "DOB": {"value": "2004-05-12", "confidence": 0.95},
        "ocr_confidence": 0.97,
    }
    result = analyze_document_tampering(clean_id_bytes, ocr_res=ocr_res)

    assert "risk_level" in result
    assert result["risk_level"] in ("LOW", "MEDIUM")
    assert not result["tamper_detected"]
    assert "formatted_report" in result
    assert "Tampering Analysis" in result["formatted_report"]
    assert len(result["checks"]) == 8

    # Check that all 8 check names exist
    expected_checks = [
        "copy_move", "splicing", "compression", "noise_edge",
        "font_consistency", "text_alignment", "text_geometry", "ocr_confidence"
    ]
    for k in expected_checks:
        assert k in result["checks"]
        assert result["checks"][k]["category"] in ("PIXEL", "TEXT")
        assert result["checks"][k]["status"] in ("PASS", "SUSPICIOUS", "FLAGGED")


def test_analyze_tampered_demo_scenario(tampered_sample_bytes):
    ocr_res = {
        "NAME": {"value": "ARJUN SHARMA", "confidence": 0.92},
        "ID_NUMBER": {"value": "PES1UG20CS001", "confidence": 0.90},
        "INSTITUTION": {"value": "PES UNIVERSITY", "confidence": 0.95},
        "DOB": {"value": "2007-04-14", "confidence": 0.65},
        "demo_scenario": "tampered",
    }
    result = analyze_document_tampering(tampered_sample_bytes, ocr_res=ocr_res, demo_scenario="tampered")

    assert result["risk_level"] in ("HIGH", "MEDIUM")
    assert result["tamper_detected"] is True or result["risk_level"] == "HIGH"
    assert result["checks"]["compression"]["status"] in ("FLAGGED", "SUSPICIOUS")
    assert result["checks"]["font_consistency"]["status"] in ("FLAGGED", "SUSPICIOUS")
    assert "Tampering Analysis" in result["formatted_report"]


def test_individual_pixel_and_text_checks(clean_id_bytes):
    img = Image.open(io.BytesIO(clean_id_bytes)).convert("RGB")
    rgb = np.array(img)
    gray = np.array(img.convert("L"))

    # Pixel checks
    cm = detect_copy_move(gray)
    assert cm["category"] == "PIXEL"
    assert 0.0 <= cm["score"] <= 1.0

    sp = detect_splicing(rgb, gray)
    assert sp["category"] == "PIXEL"
    assert 0.0 <= sp["score"] <= 1.0

    ca = detect_compression_anomaly(clean_id_bytes)
    assert ca["category"] == "PIXEL"
    assert 0.0 <= ca["score"] <= 1.0

    ne = detect_noise_edge_inconsistency(gray)
    assert ne["category"] == "PIXEL"
    assert 0.0 <= ne["score"] <= 1.0

    # Text checks
    ocr_mock = {"ocr_confidence": 0.95}
    fc = check_font_consistency(gray, ocr_mock)
    assert fc["category"] == "TEXT"
    assert 0.0 <= fc["score"] <= 1.0

    ta = check_text_alignment(gray, ocr_mock)
    assert ta["category"] == "TEXT"
    assert 0.0 <= ta["score"] <= 1.0

    tg = check_text_geometry(gray, ocr_mock)
    assert tg["category"] == "TEXT"
    assert 0.0 <= tg["score"] <= 1.0

    oc = check_ocr_confidence(ocr_mock)
    assert oc["category"] == "TEXT"
    assert 0.0 <= oc["score"] <= 1.0
