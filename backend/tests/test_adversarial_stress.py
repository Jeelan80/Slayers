"""
Adversarial Stress & Edge Case Test Suite for VeriForge PS-003.
Author: Challenger 1 (Empirical Adversarial Challenger)
Validates live backend running at http://localhost:8000 against:
  1. Corrupted/unreadable image payloads (0-byte, truncated, binary garbage, disguised types, corrupted selfie)
  2. Spliced DOB vs QR payload edge cases (tampered form DOB, spliced card, 1-day shifts, malformed strings)
  3. Exact age threshold boundaries (18y 0d vs 17y 364d, leap year Feb 29, extreme ages, invalid event dates)
  4. Missing optional parameters and malformed multipart requests (missing required fields, truncated streams, bad boundaries, injections)
  5. Concurrency burst & server stability assurance (zero unhandled 500s, deterministic decision rules)
"""

import io
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "app" / "static" / "samples"
API_URL = "http://localhost:8000"


def send_multipart_request(
    url: str,
    fields: dict,
    files: dict,
    custom_boundary: str = None,
    corrupt_stream: bool = False,
    override_content_type: str = None,
) -> tuple[int, dict, float]:
    """Sends raw multipart/form-data HTTP request using urllib."""
    boundary = custom_boundary or "----WebKitFormBoundaryAdversarial7MA4YWxkTrZu0gW"
    body = bytearray()

    for k, v in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{v}\r\n".encode("utf-8"))

    for k, (filename, file_bytes, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{k}"; filename="{filename}"\r\n'.encode("utf-8")
        )
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(file_bytes)
        body.extend(b"\r\n")

    if not corrupt_stream:
        body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    else:
        # Deliberately truncate stream before closing boundary
        body = body[: len(body) // 2]

    c_type = override_content_type or f"multipart/form-data; boundary={boundary}"
    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={
            "Content-Type": c_type,
            "Content-Length": str(len(body)),
        },
        method="POST",
    )

    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            elapsed = (time.perf_counter() - t0) * 1000.0
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data, elapsed
    except urllib.error.HTTPError as err:
        elapsed = (time.perf_counter() - t0) * 1000.0
        raw = err.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw)
        except Exception:
            data = {"raw_error": raw}
        return err.code, data, elapsed
    except (urllib.error.URLError, TimeoutError) as err:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return 408, {"error": f"Socket timeout or URL error: {err}"}, elapsed


def send_raw_request(url: str, data_bytes: bytes, headers: dict, method: str = "POST") -> tuple[int, dict, float]:
    """Sends arbitrary raw bytes payload."""
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers=headers,
        method=method,
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            elapsed = (time.perf_counter() - t0) * 1000.0
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data, elapsed
    except urllib.error.HTTPError as err:
        elapsed = (time.perf_counter() - t0) * 1000.0
        raw = err.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw)
        except Exception:
            data = {"raw_error": raw}
        return err.code, data, elapsed
    except (urllib.error.URLError, TimeoutError) as err:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return 408, {"error": f"Socket timeout or URL error: {err}"}, elapsed


def send_get_request(url: str) -> tuple[int, dict, float]:
    req = urllib.request.Request(url, method="GET")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            elapsed = (time.perf_counter() - t0) * 1000.0
            data = json.loads(resp.read().decode("utf-8"))
            return resp.status, data, elapsed
    except urllib.error.HTTPError as err:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return err.code, {"error": err.reason}, elapsed
    except (urllib.error.URLError, TimeoutError) as err:
        elapsed = (time.perf_counter() - t0) * 1000.0
        return 408, {"error": f"Socket timeout or URL error: {err}"}, elapsed


def run_adversarial_suite() -> dict:
    results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_url": API_URL,
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0,
        "crashes_500": 0,
        "categories": {},
        "details": [],
    }

    def record_test(cat: str, name: str, passed: bool, status_code: int, latency: float, notes: str, resp_data: dict):
        results["total_tests"] += 1
        if passed:
            results["passed_tests"] += 1
        else:
            results["failed_tests"] += 1
        if status_code >= 500:
            results["crashes_500"] += 1

        if cat not in results["categories"]:
            results["categories"][cat] = {"total": 0, "passed": 0, "failed": 0, "crashes_500": 0}
        results["categories"][cat]["total"] += 1
        if passed:
            results["categories"][cat]["passed"] += 1
        else:
            results["categories"][cat]["failed"] += 1
        if status_code >= 500:
            results["categories"][cat]["crashes_500"] += 1

        status_tag = "PASS" if passed else "FAIL"
        print(f"[{status_tag}] {cat} :: {name} (HTTP {status_code}, {latency:.1f}ms) -> {notes}", flush=True)
        results["details"].append({
            "category": cat,
            "name": name,
            "passed": passed,
            "status_code": status_code,
            "latency_ms": round(latency, 2),
            "notes": notes,
            "response": resp_data,
        })

    # Reset DB to ensure clean initial state
    try:
        send_raw_request(f"{API_URL}/api/reset", b"", {}, method="POST")
    except Exception:
        pass

    # =========================================================================
    # Category 1: Pre-flight Health Check
    # =========================================================================
    code, data, lat = send_get_request(f"{API_URL}/api/health")
    passed = (code == 200 and data.get("status") == "ok")
    record_test(
        "PREFLIGHT",
        "Server Health Status",
        passed,
        code,
        lat,
        f"Server reports status='{data.get('status')}'",
        data,
    )
    assert passed, "Preflight check failed: Live server at http://localhost:8000 is not reachable or unhealthy"

    # Genuine sample bytes for baseline
    genuine_path = SAMPLES_DIR / "genuine_college_id.png"
    with open(genuine_path, "rb") as f:
        genuine_bytes = f.read()

    # =========================================================================
    # Category 2: Corrupted & Unreadable Image Files
    # =========================================================================
    # 2.1: Zero-byte file
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "dob": "2005-03-14", "id_number": "ABC20261023"},
        files={"file": ("empty.jpg", b"", "image/jpeg")},
    )
    passed = (code == 400 and "empty" in str(data).lower())
    record_test(
        "CORRUPTED_FILES",
        "Zero-byte empty file",
        passed,
        code,
        lat,
        f"Expected 400 Bad Request, got HTTP {code}: {data}",
        data,
    )

    # 2.2: 512 bytes random binary noise
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "dob": "2005-03-14", "id_number": "ABC20261023"},
        files={"file": ("corrupt.jpg", os.urandom(512), "image/jpeg")},
    )
    passed = (code == 400 and "corrupt" in str(data).lower())
    record_test(
        "CORRUPTED_FILES",
        "Random binary noise (512 bytes non-image)",
        passed,
        code,
        lat,
        f"Expected 400 Bad Request, got HTTP {code}: {data}",
        data,
    )

    # 2.3: Truncated JPEG header
    truncated_jpeg = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "dob": "2005-03-14"},
        files={"file": ("truncated.jpg", truncated_jpeg, "image/jpeg")},
    )
    passed = (code == 400 and "corrupt" in str(data).lower())
    record_test(
        "CORRUPTED_FILES",
        "Truncated JPEG header",
        passed,
        code,
        lat,
        f"Expected 400 Bad Request, got HTTP {code}: {data}",
        data,
    )

    # 2.4: Truncated PNG header
    truncated_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x01"
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "dob": "2005-03-14"},
        files={"file": ("truncated.png", truncated_png, "image/png")},
    )
    passed = (code == 400 and "corrupt" in str(data).lower())
    record_test(
        "CORRUPTED_FILES",
        "Truncated PNG header",
        passed,
        code,
        lat,
        f"Expected 400 Bad Request, got HTTP {code}: {data}",
        data,
    )

    # 2.5: HTML disguised as JPEG
    fake_img = b"<!DOCTYPE html><html><body><h1>Fake Image Exploit</h1></body></html>"
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "dob": "2005-03-14"},
        files={"file": ("exploit.jpg", fake_img, "image/jpeg")},
    )
    passed = (code == 400 and "corrupt" in str(data).lower())
    record_test(
        "CORRUPTED_FILES",
        "Disguised HTML document as JPEG",
        passed,
        code,
        lat,
        f"Expected 400 Bad Request, got HTTP {code}: {data}",
        data,
    )

    # 2.6: Valid 1x1 Blank PNG (synthesized clean image without card features)
    blank_io = io.BytesIO()
    Image.new("RGB", (1, 1), color="white").save(blank_io, format="PNG")
    blank_bytes = blank_io.getvalue()
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "dob": "2005-03-14", "id_number": "ABC20261023"},
        files={"file": ("blank_1x1.png", blank_bytes, "image/png")},
    )
    # 1x1 image should not crash the server; quality gate routes low blur/zero features to MANUAL_REVIEW
    passed = (code == 200 and data.get("decision") in ("MANUAL_REVIEW", "APPROVE"))
    record_test(
        "CORRUPTED_FILES",
        "Valid 1x1 Blank Image (feature-less boundary)",
        passed,
        code,
        lat,
        f"Expected 200 OK + MANUAL_REVIEW/APPROVE without crash, got {data.get('decision')}",
        data,
    )

    # 2.7: Corrupted selfie with genuine ID card
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "dob": "2005-03-14", "id_number": "ABC20261023"},
        files={
            "file": ("genuine.png", genuine_bytes, "image/png"),
            "selfie": ("bad_selfie.jpg", os.urandom(256), "image/jpeg"),
        },
    )
    # OpenCV detector handles corrupted bytes safely without crashing
    passed = (code == 200 and "decision" in data)
    record_test(
        "CORRUPTED_FILES",
        "Corrupted binary selfie with genuine ID",
        passed,
        code,
        lat,
        f"Expected 200 OK without crash, got decision: {data.get('decision')}",
        data,
    )

    # =========================================================================
    # Category 3: Spliced DOB vs QR Payload Edge Cases
    # =========================================================================
    # 3.1: Authentic card with QR DOB 2005-03-14, but registration form altered to 2000-01-01
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "2000-01-01",  # Alters DOB by 5 years
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    qr_check = checks.get("qr", {})
    passed = (
        code == 200
        and data.get("decision") == "REJECT"
        and (qr_check.get("mismatch") is True or "QR_OCR_MISMATCH" in data.get("strong_flags", []))
    )
    record_test(
        "SPLICED_DOB_VS_QR",
        "Form DOB altered (2000-01-01) vs Card QR (2005-03-14)",
        passed,
        code,
        lat,
        f"Decision: {data.get('decision')}, QR mismatch: {qr_check.get('mismatch')}, Flags: {data.get('strong_flags')}",
        data,
    )

    # 3.2: 1-Day Shift Attack (QR has 2005-03-14, Form claims 2005-03-15)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "2005-03-15",  # Subtle 1-day off tampering
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    qr_check = checks.get("qr", {})
    passed = (
        code == 200
        and data.get("decision") == "REJECT"
        and (qr_check.get("mismatch") is True or "QR_OCR_MISMATCH" in data.get("strong_flags", []))
    )
    record_test(
        "SPLICED_DOB_VS_QR",
        "Subtle 1-Day DOB shift (2005-03-15 vs 2005-03-14)",
        passed,
        code,
        lat,
        f"Decision: {data.get('decision')}, QR mismatch: {qr_check.get('mismatch')}, Discrepancies: {qr_check.get('discrepancies')}",
        data,
    )

    # 3.3: Spliced card image with demo_scenario='tampered'
    tampered_path = SAMPLES_DIR / "tampered_dob_id.png"
    with open(tampered_path, "rb") as f:
        tampered_bytes = f.read()

    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "2007-04-14",
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "demo_scenario": "tampered",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("tampered.png", tampered_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    qr_check = checks.get("qr", {})
    passed = (
        code == 200
        and data.get("decision") == "REJECT"
        and (qr_check.get("mismatch") is True or "QR_OCR_MISMATCH" in data.get("strong_flags", []))
    )
    record_test(
        "SPLICED_DOB_VS_QR",
        "Spliced Card DOB (printed 2007-04-14 vs QR 2005-03-14)",
        passed,
        code,
        lat,
        f"Decision: {data.get('decision')}, Tamper flags: {data.get('strong_flags')}",
        data,
    )

    # 3.4: Format Variance: DD/MM/YYYY normalizes to matching ISO
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "14/03/2005",  # Same date in DD/MM/YYYY
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    qr_check = checks.get("qr", {})
    passed = (
        code == 200
        and data.get("decision") == "APPROVE"
        and qr_check.get("mismatch") is False
    )
    record_test(
        "SPLICED_DOB_VS_QR",
        "Date Format Normalization (DD/MM/YYYY vs ISO)",
        passed,
        code,
        lat,
        f"Decision: {data.get('decision')}, QR mismatch: {qr_check.get('mismatch')}",
        data,
    )

    # 3.5: Malformed unparseable DOB string in registration
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "NOT_A_VALID_DATE_99",
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    # Server should not throw 500; unparseable date causes age eligibility check to fail -> REJECT
    passed = (
        code == 200
        and data.get("decision") == "REJECT"
        and "INELIGIBLE_AGE" in data.get("strong_flags", [])
    )
    record_test(
        "SPLICED_DOB_VS_QR",
        "Malformed unparseable DOB string ('NOT_A_VALID_DATE_99')",
        passed,
        code,
        lat,
        f"Decision: {data.get('decision')}, Flags: {data.get('strong_flags')}",
        data,
    )

    # =========================================================================
    # Category 4: Exact Age Threshold Boundaries (18y 0d vs 17y 364d)
    # =========================================================================
    # Reference Event Date: 2026-09-18
    # 4.1: Exactly 18 years 0 days (DOB = 2008-09-18)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Eligible Boundary",
            "dob": "2008-09-18",
            "id_number": "BND2026001",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    el = checks.get("eligibility", {})
    # Note: QR mismatch may reject overall decision because card QR has 2005-03-14,
    # but the eligibility check itself must report PASS with age=18!
    passed = (code == 200 and el.get("status") == "PASS" and el.get("age") == 18)
    record_test(
        "AGE_BOUNDARIES",
        "Exact 18 years 0 days (DOB 2008-09-18, Event 2026-09-18)",
        passed,
        code,
        lat,
        f"Eligibility status: {el.get('status')}, Calculated age: {el.get('age')}",
        data,
    )

    # 4.2: Exactly 17 years 364 days / turning 18 tomorrow (DOB = 2008-09-19)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Underage Boundary",
            "dob": "2008-09-19",
            "id_number": "BND2026002",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    el = checks.get("eligibility", {})
    passed = (
        code == 200
        and el.get("status") == "FAIL"
        and el.get("age") == 17
        and "INELIGIBLE_AGE" in data.get("strong_flags", [])
        and data.get("decision") == "REJECT"
    )
    record_test(
        "AGE_BOUNDARIES",
        "Exact 17 years 364 days (DOB 2008-09-19, Event 2026-09-18)",
        passed,
        code,
        lat,
        f"Eligibility status: {el.get('status')}, Age: {el.get('age')}, Decision: {data.get('decision')}",
        data,
    )

    # 4.3: Exactly 18 years 1 day (DOB = 2008-09-17)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Eligible Day After",
            "dob": "2008-09-17",
            "id_number": "BND2026003",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    el = checks.get("eligibility", {})
    passed = (code == 200 and el.get("status") == "PASS" and el.get("age") == 18)
    record_test(
        "AGE_BOUNDARIES",
        "Exact 18 years 1 day (DOB 2008-09-17, Event 2026-09-18)",
        passed,
        code,
        lat,
        f"Eligibility status: {el.get('status')}, Age: {el.get('age')}",
        data,
    )

    # 4.4: Leap Year Birthday: DOB 2008-02-29 vs Event 2026-02-28 (Age 17 -> FAIL)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Leap Day Candidate",
            "dob": "2008-02-29",
            "id_number": "BND2026004",
            "min_age": "18",
            "event_date": "2026-02-28",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    el = checks.get("eligibility", {})
    passed = (code == 200 and el.get("status") == "FAIL" and el.get("age") == 17)
    record_test(
        "AGE_BOUNDARIES",
        "Leap Day Birthday before anniversary (DOB 2008-02-29, Event 2026-02-28)",
        passed,
        code,
        lat,
        f"Eligibility status: {el.get('status')}, Age: {el.get('age')} (Must be 17)",
        data,
    )

    # 4.5: Leap Year Birthday: DOB 2008-02-29 vs Event 2026-03-01 (Age 18 -> PASS)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Leap Day Candidate",
            "dob": "2008-02-29",
            "id_number": "BND2026005",
            "min_age": "18",
            "event_date": "2026-03-01",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    el = checks.get("eligibility", {})
    passed = (code == 200 and el.get("status") == "PASS" and el.get("age") == 18)
    record_test(
        "AGE_BOUNDARIES",
        "Leap Day Birthday on March 1 (DOB 2008-02-29, Event 2026-03-01)",
        passed,
        code,
        lat,
        f"Eligibility status: {el.get('status')}, Age: {el.get('age')} (Must be 18)",
        data,
    )

    # 4.6: Future Date of Birth (DOB 2030-01-01)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Time Traveler",
            "dob": "2030-01-01",
            "id_number": "BND2026006",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    checks = data.get("checks", {})
    el = checks.get("eligibility", {})
    passed = (
        code == 200
        and el.get("status") == "FAIL"
        and el.get("age") is not None
        and el.get("age") < 0
        and data.get("decision") == "REJECT"
    )
    record_test(
        "AGE_BOUNDARIES",
        "Future Date of Birth (DOB 2030-01-01, negative age)",
        passed,
        code,
        lat,
        f"Eligibility status: {el.get('status')}, Age: {el.get('age')}, Decision: {data.get('decision')}",
        data,
    )

    # 4.7: Invalid Event Date format (fallback to today)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "2005-03-14",
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "event_date": "CORRUPTED_DATE_FORMAT",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    # Server should not crash on invalid event_date format; falls back gracefully to today
    passed = (code == 200 and "decision" in data)
    record_test(
        "AGE_BOUNDARIES",
        "Corrupted Event Date string ('CORRUPTED_DATE_FORMAT')",
        passed,
        code,
        lat,
        f"Expected graceful fallback without 500 error, got HTTP {code}, Decision: {data.get('decision')}",
        data,
    )

    # =========================================================================
    # Category 5: Missing Optional Parameters & Malformed Requests
    # =========================================================================
    # 5.1: Minimal valid request (Only name, dob, file; all optional fields omitted)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Minimal User", "dob": "2005-03-14"},
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    passed = (code == 200 and "decision" in data)
    record_test(
        "MALFORMED_REQUESTS",
        "Minimal valid request (all optional fields omitted)",
        passed,
        code,
        lat,
        f"Expected 200 OK with default values applied, got HTTP {code}, Decision: {data.get('decision')}",
        data,
    )

    # 5.2: Missing Required Field: 'name'
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"dob": "2005-03-14", "id_number": "ABC12345"},
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    passed = (code == 422)
    record_test(
        "MALFORMED_REQUESTS",
        "Missing required 'name' form parameter",
        passed,
        code,
        lat,
        f"Expected 422 Unprocessable Entity, got HTTP {code}",
        data,
    )

    # 5.3: Missing Required Field: 'dob'
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "id_number": "ABC12345"},
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    passed = (code == 422)
    record_test(
        "MALFORMED_REQUESTS",
        "Missing required 'dob' form parameter",
        passed,
        code,
        lat,
        f"Expected 422 Unprocessable Entity, got HTTP {code}",
        data,
    )

    # 5.4: Missing Required Field: 'file'
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "dob": "2005-03-14"},
        files={},
    )
    passed = (code == 422)
    record_test(
        "MALFORMED_REQUESTS",
        "Missing required 'file' upload",
        passed,
        code,
        lat,
        f"Expected 422 Unprocessable Entity, got HTTP {code}",
        data,
    )

    # 5.5: Empty multipart body with boundary header
    code, data, lat = send_raw_request(
        f"{API_URL}/api/verify",
        data_bytes=b"",
        headers={"Content-Type": "multipart/form-data; boundary=fake_boundary", "Content-Length": "0"},
        method="POST",
    )
    # FastAPI/Starlette yields 400 or 422 for empty multipart stream
    passed = (code in (400, 422))
    record_test(
        "MALFORMED_REQUESTS",
        "Empty payload with multipart/form-data header",
        passed,
        code,
        lat,
        f"Expected 400/422, got HTTP {code}",
        data,
    )

    # 5.6: Truncated multipart stream (premature connection EOF)
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={"name": "Rahul Kumar", "dob": "2005-03-14"},
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
        corrupt_stream=True,
    )
    passed = (code in (400, 422))
    record_test(
        "MALFORMED_REQUESTS",
        "Truncated multipart stream (missing closing boundary)",
        passed,
        code,
        lat,
        f"Expected 400/422, got HTTP {code}",
        data,
    )

    # 5.7: Missing boundary parameter in Content-Type header
    code, data, lat = send_raw_request(
        f"{API_URL}/api/verify",
        data_bytes=b"sample payload",
        headers={"Content-Type": "multipart/form-data", "Content-Length": "14"},
        method="POST",
    )
    passed = (code in (400, 422))
    record_test(
        "MALFORMED_REQUESTS",
        "Malformed Content-Type header (missing boundary param)",
        passed,
        code,
        lat,
        f"Expected 400/422, got HTTP {code}",
        data,
    )

    # 5.8: JSON payload sent to multipart endpoint
    code, data, lat = send_raw_request(
        f"{API_URL}/api/verify",
        data_bytes=json.dumps({"name": "Rahul Kumar", "dob": "2005-03-14"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    passed = (code == 422)
    record_test(
        "MALFORMED_REQUESTS",
        "JSON payload posted to multipart endpoint",
        passed,
        code,
        lat,
        f"Expected 422 Unprocessable Entity, got HTTP {code}",
        data,
    )

    # 5.9: SQL Injection, XSS, and Unicode in form fields
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul'; DROP TABLE registrations; -- 🚀 <script>alert(1)</script>",
            "dob": "2005-03-14",
            "id_number": "ABC20261023' UNION SELECT * FROM registrations --",
            "institution": "ABC Institute of Technology <img src=x onerror=alert(1)>",
            "id_type": "COLLEGE_ID",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    # Server should execute safely without SQL error or injection crash
    passed = (code == 200 and "registration_id" in data)
    record_test(
        "MALFORMED_REQUESTS",
        "SQLi / XSS / Unicode injection in form fields",
        passed,
        code,
        lat,
        f"Expected 200 OK without DB injection error, got HTTP {code}, ID: {data.get('registration_id')}",
        data,
    )

    # =========================================================================
    # Category 6: Sybil Duplicate Under Stress
    # =========================================================================
    # First ensure legitimate registration exists for ID ABC20261023
    send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "2005-03-14",
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )

    # Now attempt Sybil reuse: same ID ABC20261023 under different participant name
    code, data, lat = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Impostor Sybil",
            "dob": "2005-03-14",
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine.png", genuine_bytes, "image/png")},
    )
    passed = (
        code == 200
        and data.get("decision") == "REJECT"
        and "EXACT_ID_DUPLICATE" in data.get("strong_flags", [])
    )
    record_test(
        "SYBIL_DUPLICATE",
        "Identical card registered under different name",
        passed,
        code,
        lat,
        f"Decision: {data.get('decision')}, Flags: {data.get('strong_flags')}",
        data,
    )

    # =========================================================================
    # Category 7: Concurrency Burst & Post-Stress Health Check
    # =========================================================================
    burst_count = 15
    burst_passes = 0
    burst_500s = 0
    burst_start = time.perf_counter()
    for i in range(burst_count):
        c, d, l = send_multipart_request(
            f"{API_URL}/api/verify",
            fields={
                "name": f"Stress Tester {i}",
                "dob": "2005-03-14",
                "id_number": f"BURST_{i}_{time.time_ns()}",
                "institution": "ABC Institute of Technology",
            },
            files={"file": (f"burst_{i}.png", genuine_bytes, "image/png")},
        )
        if c == 200:
            burst_passes += 1
        elif c >= 500:
            burst_500s += 1
    burst_total_time = (time.perf_counter() - burst_start) * 1000.0

    passed = (burst_passes == burst_count and burst_500s == 0)
    record_test(
        "CONCURRENCY_BURST",
        f"Rapid burst of {burst_count} requests in sequence",
        passed,
        200 if passed else 500,
        burst_total_time / burst_count,
        f"Completed {burst_passes}/{burst_count} successful requests, 500 crashes: {burst_500s}, avg latency: {burst_total_time/burst_count:.1f}ms",
        {"burst_passes": burst_passes, "burst_500s": burst_500s},
    )

    # Final post-stress health check
    code, data, lat = send_get_request(f"{API_URL}/api/health")
    passed = (code == 200 and data.get("status") == "ok")
    record_test(
        "POST_STRESS",
        "Post-Stress Health Verification",
        passed,
        code,
        lat,
        f"Server healthy post-burst: status='{data.get('status')}'",
        data,
    )

    # Post-stress registrations audit check
    code, data, lat = send_get_request(f"{API_URL}/api/registrations?limit=5")
    passed = (code == 200 and isinstance(data, list))
    record_test(
        "POST_STRESS",
        "Post-Stress Database Query (GET /api/registrations)",
        passed,
        code,
        lat,
        f"Retrieved {len(data) if isinstance(data, list) else 0} records without database corruption",
        {"record_count": len(data) if isinstance(data, list) else 0},
    )

    return results


def test_adversarial_suite():
    """Pytest entrypoint to integrate with standard test runs."""
    results = run_adversarial_suite()
    assert results["crashes_500"] == 0, f"Found {results['crashes_500']} unhandled 500 crashes!"
    assert results["failed_tests"] == 0, f"{results['failed_tests']} tests failed out of {results['total_tests']}!"


if __name__ == "__main__":
    res = run_adversarial_suite()
    print("\n==================================================================")
    print(f"ADVERSARIAL STRESS SUITE SUMMARY: {res['passed_tests']}/{res['total_tests']} PASSED")
    print(f"500 Internal Server Errors: {res['crashes_500']}")
    print("==================================================================")
    for cat, stats in res["categories"].items():
        print(f" - {cat}: {stats['passed']}/{stats['total']} passed, {stats['crashes_500']} crashes")
    
    # Save results to a json file for report generation
    out_file = BASE_DIR.parent / ".agents" / "challenger_1" / "adversarial_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)
    print(f"\nSaved raw telemetry to {out_file}")

    if res["failed_tests"] > 0 or res["crashes_500"] > 0:
        sys.exit(1)
    sys.exit(0)
