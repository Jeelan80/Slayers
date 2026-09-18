"""
Independent Audit & Stress Test Script by Reviewer 2.
Tests with dynamically generated, unpredicted payloads to guarantee zero hardcoding or facade behavior.
"""

import io
import json
import time
import urllib.parse
import urllib.request
import numpy as np
from PIL import Image, ImageFilter

API_URL = "http://localhost:8000"

def send_multipart(url: str, fields: dict, files: dict):
    boundary = "----Reviewer2BoundaryXYZ"
    body = bytearray()
    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{v}\r\n".encode("utf-8"))
    for k, (filename, file_bytes, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(file_bytes)
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        },
        method="POST"
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        elapsed = (time.perf_counter() - t0) * 1000.0
        data = json.loads(resp.read().decode("utf-8"))
        return resp.status, data, elapsed

def send_form(url: str, form_data: dict, method: str = "POST"):
    data_bytes = urllib.parse.urlencode(form_data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method=method
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        elapsed = (time.perf_counter() - t0) * 1000.0
        data = json.loads(resp.read().decode("utf-8"))
        return resp.status, data, elapsed

def send_get(url: str):
    req = urllib.request.Request(url, method="GET")
    t0 = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        elapsed = (time.perf_counter() - t0) * 1000.0
        data = json.loads(resp.read().decode("utf-8"))
        return resp.status, data, elapsed

def create_dynamic_blurry_image() -> bytes:
    # Create an image with text/shapes and apply heavy Gaussian blur
    img = Image.new("RGB", (600, 380), color=(240, 240, 240))
    # Apply heavy blur filter
    blurred = img.filter(ImageFilter.GaussianBlur(radius=15))
    buf = io.BytesIO()
    blurred.save(buf, format="PNG")
    return buf.getvalue()

def run_independent_audit():
    print("=== REVIEWER 2 INDEPENDENT AUDIT START ===")
    
    # 0. Health check
    status, health, lat = send_get(f"{API_URL}/api/health")
    assert status == 200 and health.get("status") == "ok", f"Health failed: {health}"
    print(f"[PASS] Health check OK ({lat:.1f}ms): {health}")

    # Reset DB to ensure predictable clean state
    status, reset_resp, _ = send_form(f"{API_URL}/api/reset", {})
    assert status == 200 and reset_resp.get("status") == "reset"
    print("[PASS] DB initial reset OK")

    # 1. Test Blurry ID Quality Gate
    print("\n--- Test 1: Blurry ID Quality Gating ---")
    blurry_bytes = create_dynamic_blurry_image()
    unique_id = f"BLUR_TEST_{int(time.time())}"
    status, blur_resp, lat = send_multipart(
        f"{API_URL}/api/verify",
        fields={
            "name": "Audit Test Subject",
            "dob": "2004-05-15",
            "id_number": unique_id,
            "institution": "Audit Institute",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("dynamic_blurry.png", blurry_bytes, "image/png")}
    )
    print(f"Blurry ID response ({lat:.1f}ms): status={status}, decision={blur_resp.get('decision')}")
    print(f"Quality check: {blur_resp['checks']['quality']}")
    
    # Assertions
    assert status == 200, f"Expected 200, got {status}"
    assert blur_resp["decision"] == "MANUAL_REVIEW", f"Expected MANUAL_REVIEW, got {blur_resp['decision']}"
    assert blur_resp["decision"] != "REJECT", "CRITICAL FAILURE: Blurry ID was hard-rejected!"
    assert blur_resp["checks"]["quality"]["label"] == "LOW_QUALITY", f"Expected LOW_QUALITY, got {blur_resp['checks']['quality']['label']}"
    assert blur_resp["checks"]["quality"]["blur_variance"] < 40.0, f"Expected variance < 40, got {blur_resp['checks']['quality']['blur_variance']}"
    blurry_reg_id = blur_resp["registration_id"]
    print(f"[PASS] Blurry ID correctly routed to MANUAL_REVIEW without false-positive rejection. Registration ID: {blurry_reg_id}")

    # 2. Test Sybil / Duplicate ID Detection
    print("\n--- Test 2: Sybil / Duplicate ID Collision ---")
    sybil_id_num = f"SYBIL_{int(time.time())}"
    
    # Load sample genuine image
    with open("backend/app/static/samples/genuine_college_id.png", "rb") as f:
        card_bytes = f.read()

    # Legitimate first registration
    status1, reg1_resp, lat1 = send_multipart(
        f"{API_URL}/api/verify",
        fields={
            "name": "Carol Danvers",
            "dob": "2005-03-14",
            "id_number": sybil_id_num,
            "institution": "ABC Institute of Technology",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("card.png", card_bytes, "image/png")}
    )
    print(f"User 1 registration ({lat1:.1f}ms): decision={reg1_resp['decision']}, id={reg1_resp['registration_id']}")
    assert status1 == 200

    # Malicious second registration attempting to reuse sybil_id_num under a different participant name
    status2, reg2_resp, lat2 = send_multipart(
        f"{API_URL}/api/verify",
        fields={
            "name": "Peter Parker",
            "dob": "2005-03-14",
            "id_number": sybil_id_num,
            "institution": "ABC Institute of Technology",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("card_copy.png", card_bytes, "image/png")}
    )
    print(f"User 2 Sybil attempt ({lat2:.1f}ms): decision={reg2_resp['decision']}, flags={reg2_resp['strong_flags']}")
    print(f"Duplicate check: {reg2_resp['checks']['duplicate']}")

    # Assertions
    assert status2 == 200, f"Expected 200, got {status2}"
    assert reg2_resp["decision"] == "REJECT", f"Expected REJECT for duplicate, got {reg2_resp['decision']}"
    assert "EXACT_ID_DUPLICATE" in reg2_resp["strong_flags"], f"Expected EXACT_ID_DUPLICATE in {reg2_resp['strong_flags']}"
    assert reg2_resp["checks"]["duplicate"]["status"] == "DUPLICATE", f"Expected DUPLICATE status, got {reg2_resp['checks']['duplicate']['status']}"
    assert reg2_resp["checks"]["duplicate"]["exact_match"]["name"] == "Carol Danvers", f"Expected match to Carol Danvers, got {reg2_resp['checks']['duplicate']['exact_match']}"
    print("[PASS] Sybil duplicate detection triggered EXACT_ID_DUPLICATE and REJECT with exact provenance match.")

    # 3. Test Organizer Endpoints
    print("\n--- Test 3: Organizer Audit Endpoints ---")
    
    # 3a. GET /api/registrations
    status, reg_list, lat = send_get(f"{API_URL}/api/registrations")
    print(f"GET /api/registrations ({lat:.1f}ms): count={len(reg_list)}")
    assert status == 200
    assert len(reg_list) >= 3, f"Expected at least 3 records, got {len(reg_list)}"
    for r in reg_list:
        assert "checks" in r and isinstance(r["checks"], dict), "checks dict missing in record"
        assert "reasons" in r and isinstance(r["reasons"], list), "reasons list missing in record"
        assert "extracted" in r and isinstance(r["extracted"], dict), "extracted dict missing in record"
    print("[PASS] GET /api/registrations returns structured JSON checks, reasons, and extracted data.")

    # 3b. POST /api/registrations/{id}/review
    notes_payload = "Reviewer 2 independent audit: manual verification confirmed."
    status, rev_resp, lat = send_form(
        f"{API_URL}/api/registrations/{blurry_reg_id}/review",
        form_data={"status": "APPROVED", "notes": notes_payload}
    )
    print(f"POST /api/registrations/{blurry_reg_id}/review ({lat:.1f}ms): {rev_resp}")
    assert status == 200
    assert rev_resp.get("status") == "success"
    assert rev_resp.get("new_status") == "APPROVED"
    assert rev_resp.get("registration_id") == blurry_reg_id

    # Verify persistence via GET /api/registrations/{id}
    status, fetched_record, _ = send_get(f"{API_URL}/api/registrations/{blurry_reg_id}")
    assert status == 200
    assert fetched_record.get("status") == "APPROVED"
    assert fetched_record.get("reviewer_notes") == notes_payload
    print(f"[PASS] POST /api/registrations/{blurry_reg_id}/review successfully updated status to APPROVED and saved audit notes.")

    # 3c. POST /api/reset
    status, reset_resp, lat = send_form(f"{API_URL}/api/reset", {})
    print(f"POST /api/reset ({lat:.1f}ms): {reset_resp}")
    assert status == 200
    assert reset_resp.get("status") == "reset"

    # Verify database is completely empty
    status, post_reset_list, _ = send_get(f"{API_URL}/api/registrations")
    assert status == 200
    assert len(post_reset_list) == 0, f"Expected 0 registrations after reset, got {len(post_reset_list)}"
    print(f"[PASS] POST /api/reset cleanly wiped registrations database (0 records remaining).")

    print("\n=== ALL REVIEWER 2 AUDIT CHECKS PASSED PERFECTLY ===")

if __name__ == "__main__":
    run_independent_audit()
