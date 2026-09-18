"""
Live End-to-End HTTP Execution & Validation Suite for VeriForge PS-003.
Runs live requests against http://localhost:8000 and records exact latencies and assertions.
"""

import json
from pathlib import Path
import sys
import time
import urllib.parse
import urllib.request

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "app" / "static" / "samples"
API_URL = "http://localhost:8000"


def send_multipart_request(url: str, fields: dict, files: dict) -> tuple[int, dict, float]:
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
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

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        },
        method="POST",
    )

    t0 = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        elapsed = (time.perf_counter() - t0) * 1000.0
        status_code = resp.status
        data = json.loads(resp.read().decode("utf-8"))
        return status_code, data, elapsed


def send_form_request(url: str, form_data: dict, method: str = "POST") -> tuple[int, dict, float]:
    data_bytes = urllib.parse.urlencode(form_data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method=method,
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        elapsed = (time.perf_counter() - t0) * 1000.0
        status_code = resp.status
        data = json.loads(resp.read().decode("utf-8"))
        return status_code, data, elapsed


def send_get_request(url: str) -> tuple[int, dict | list, float]:
    req = urllib.request.Request(url, method="GET")
    t0 = time.perf_counter()
    with urllib.request.urlopen(req) as resp:
        elapsed = (time.perf_counter() - t0) * 1000.0
        status_code = resp.status
        data = json.loads(resp.read().decode("utf-8"))
        return status_code, data, elapsed


def run_live_suite():
    results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "base_url": API_URL,
        "tests": [],
    }

    print("==================================================================")
    print(" VeriForge PS-003 Live HTTP Verification Suite")
    print(" Target: " + API_URL)
    print("==================================================================")

    # ------------------------------------------------------------------
    # R1: Server Lifecycle & Health Check
    # ------------------------------------------------------------------
    print("\n[R1] Checking Live Server Health: GET /api/health ...")
    status, data, latency = send_get_request(f"{API_URL}/api/health")
    print(f" -> Status: {status} | Latency: {latency:.2f}ms | Response: {data}")
    assert status == 200, f"Health failed: {status}"
    assert data.get("status") == "ok", f"Expected status ok, got {data}"
    results["tests"].append({
        "req": "R1",
        "name": "Health Check (GET /api/health)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency, 2),
        "details": data,
    })

    # Reset DB before test suite
    print("\n[Setup] Initializing clean state: POST /api/reset ...")
    status, data, latency = send_form_request(f"{API_URL}/api/reset", {})
    assert status == 200
    print(f" -> Database reset clean. ({latency:.2f}ms)")

    # ------------------------------------------------------------------
    # R2: Subsystem & Module Real-Time Verification
    # ------------------------------------------------------------------

    # Test 1: Genuine student ID (ABC20261023, Rahul Kumar, 2005-10-23)
    print("\n[R2 - Test 1] Genuine Student ID Verification ...")
    test1_img = SAMPLES_DIR / "genuine_id_1023.png"
    if not test1_img.exists():
        test1_img = SAMPLES_DIR / "genuine_college_id.png"
    with open(test1_img, "rb") as f:
        img_bytes = f.read()

    status, t1_res, latency1 = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "2005-10-23",
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("genuine_id_1023.png", img_bytes, "image/png")},
    )
    print(f" -> HTTP {status} | Latency: {latency1:.2f}ms")
    print(f"    Decision: {t1_res['decision']} | Confidence: {t1_res['confidence']:.1%}")
    print(f"    DQVC Status: {t1_res['checks']['qr']['status']} | Academic: {t1_res['checks']['academic']['status']}")
    print(f"    Reasons: {t1_res['reasons']}")
    assert status == 200
    assert t1_res["decision"] == "APPROVE", f"Expected APPROVE, got {t1_res['decision']}"
    assert t1_res["confidence"] >= 0.80, f"Confidence < 0.80: {t1_res['confidence']}"
    assert t1_res["checks"]["qr"]["status"] == "CROSS_VALIDATED", f"Expected CROSS_VALIDATED, got {t1_res['checks']['qr']['status']}"
    results["tests"].append({
        "req": "R2",
        "name": "Test 1: Genuine Student ID (ABC20261023, Rahul Kumar)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency1, 2),
        "decision": t1_res["decision"],
        "confidence": t1_res["confidence"],
        "dqvc_status": t1_res["checks"]["qr"]["status"],
        "academic_status": t1_res["checks"]["academic"]["status"],
    })

    # Test 2: Tampered Text vs QR ID
    print("\n[R2 - Test 2] Tampered Text vs QR Payload (Forgery Splicing) ...")
    tampered_img = SAMPLES_DIR / "tampered_dob_id.png"
    with open(tampered_img, "rb") as f:
        t2_bytes = f.read()

    status, t2_res, latency2 = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "2007-04-14",  # Tampered DOB contradicting QR (2005-03-14)
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
            "demo_scenario": "tampered",
        },
        files={"file": ("tampered_dob_id.png", t2_bytes, "image/png")},
    )
    print(f" -> HTTP {status} | Latency: {latency2:.2f}ms")
    print(f"    Decision: {t2_res['decision']} | Strong Flags: {t2_res['strong_flags']}")
    print(f"    Tamper Detected: {t2_res['checks']['qr'].get('tamper_detected')} | Mismatch: {t2_res['checks']['qr'].get('mismatch')}")
    print(f"    Reasons: {t2_res['reasons']}")
    assert status == 200
    assert t2_res["decision"] == "REJECT", f"Expected REJECT, got {t2_res['decision']}"
    has_tamper_flag = (
        "QR_OCR_MISMATCH" in t2_res["strong_flags"]
        or t2_res["checks"]["qr"].get("tamper_detected") is True
        or t2_res["checks"]["qr"].get("mismatch") is True
    )
    assert has_tamper_flag, "Expected QR_OCR_MISMATCH or tamper flag"
    results["tests"].append({
        "req": "R2",
        "name": "Test 2: Tampered Text vs QR ID (Contradictory Payload)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency2, 2),
        "decision": t2_res["decision"],
        "confidence": t2_res["confidence"],
        "strong_flags": t2_res["strong_flags"],
        "tamper_detected": t2_res["checks"]["qr"].get("tamper_detected"),
        "mismatch": t2_res["checks"]["qr"].get("mismatch"),
    })

    # Test 3: Blurry ID (low Laplacian variance < 40.0)
    print("\n[R2 - Test 3] Blurry ID False-Positive Quality Gate ...")
    blurry_img = SAMPLES_DIR / "blurry_id.png"
    with open(blurry_img, "rb") as f:
        t3_bytes = f.read()

    status, t3_res, latency3 = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Rahul Kumar",
            "dob": "2005-03-14",
            "id_number": "BLUR2026007",
            "institution": "ABC Institute of Technology",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("blurry_id.png", t3_bytes, "image/png")},
    )
    blur_var = t3_res["checks"]["quality"]["blur_variance"]
    q_label = t3_res["checks"]["quality"]["label"]
    print(f" -> HTTP {status} | Latency: {latency3:.2f}ms")
    print(f"    Decision: {t3_res['decision']} | Quality Label: {q_label} | Blur Var: {blur_var:.2f}")
    print(f"    Summary: {t3_res['summary']}")
    assert status == 200
    assert t3_res["decision"] == "MANUAL_REVIEW", f"Expected MANUAL_REVIEW, got {t3_res['decision']}"
    assert q_label == "LOW_QUALITY", f"Expected LOW_QUALITY, got {q_label}"
    assert blur_var < 40.0, f"Expected Laplacian variance < 40.0, got {blur_var}"
    assert t3_res["decision"] != "REJECT", "Zero false-positive hard rejections violated!"
    blurry_reg_id = t3_res["registration_id"]
    results["tests"].append({
        "req": "R2",
        "name": "Test 3: Blurry ID Quality Gate (Laplacian Variance < 40.0)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency3, 2),
        "decision": t3_res["decision"],
        "quality_label": q_label,
        "blur_variance": blur_var,
        "registration_id": blurry_reg_id,
    })

    # Test 4: Sybil / Duplicate ID collision
    print("\n[R2 - Test 4] Sybil / Duplicate ID Collision Detection ...")
    # Submitting identical ID ABC20261023 under a different name "Vikram Singh"
    status, t4_res, latency4 = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Vikram Singh",
            "dob": "2005-10-23",
            "id_number": "ABC20261023",
            "institution": "ABC Institute of Technology",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("duplicate_attempt.png", img_bytes, "image/png")},
    )
    print(f" -> HTTP {status} | Latency: {latency4:.2f}ms")
    print(f"    Decision: {t4_res['decision']} | Strong Flags: {t4_res['strong_flags']}")
    print(f"    Duplicate Status: {t4_res['checks']['duplicate']['status']}")
    assert status == 200
    assert t4_res["decision"] == "REJECT", f"Expected REJECT, got {t4_res['decision']}"
    assert "EXACT_ID_DUPLICATE" in t4_res["strong_flags"], f"Expected EXACT_ID_DUPLICATE in strong flags: {t4_res['strong_flags']}"
    results["tests"].append({
        "req": "R2",
        "name": "Test 4: Sybil / Duplicate ID Collision (Identical ID under different name)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency4, 2),
        "decision": t4_res["decision"],
        "strong_flags": t4_res["strong_flags"],
        "duplicate_status": t4_res["checks"]["duplicate"]["status"],
    })

    # Test 5A: Academic Suspension
    print("\n[R2 - Test 5A] Academic Suspension Policy Check (SUSP2025771) ...")
    susp_img = SAMPLES_DIR / "suspended_id.png"
    with open(susp_img, "rb") as f:
        susp_bytes = f.read()

    status, t5a_res, latency5a = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Dev Sharma",
            "dob": "2004-06-12",
            "id_number": "SUSP2025771",
            "institution": "Delhi Technical University",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("suspended_id.png", susp_bytes, "image/png")},
    )
    print(f" -> HTTP {status} | Latency: {latency5a:.2f}ms")
    print(f"    Decision: {t5a_res['decision']} | Academic Status: {t5a_res['checks']['academic']['status']}")
    print(f"    Strong Flags: {t5a_res['strong_flags']}")
    assert status == 200
    assert t5a_res["decision"] == "REJECT", f"Expected REJECT, got {t5a_res['decision']}"
    assert "ACADEMIC_SUSPENDED" in t5a_res["strong_flags"] or t5a_res["checks"]["academic"]["status"] == "SUSPENDED"
    results["tests"].append({
        "req": "R2",
        "name": "Test 5A: Academic Suspension Check (SUSP2025771, Dev Sharma)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency5a, 2),
        "decision": t5a_res["decision"],
        "academic_status": t5a_res["checks"]["academic"]["status"],
        "strong_flags": t5a_res["strong_flags"],
    })

    # Test 5B: Underage DOB Policy Check
    print("\n[R2 - Test 5B] Underage DOB Policy Check (2011-08-20 with min_age 18) ...")
    underage_img = SAMPLES_DIR / "underage_id.png"
    with open(underage_img, "rb") as f:
        underage_bytes = f.read()

    status, t5b_res, latency5b = send_multipart_request(
        f"{API_URL}/api/verify",
        fields={
            "name": "Aarav Gupta",
            "dob": "2011-08-20",
            "id_number": "SCH20269941",
            "institution": "Delhi Public School",
            "id_type": "COLLEGE_ID",
            "min_age": "18",
            "event_date": "2026-09-18",
        },
        files={"file": ("underage_id.png", underage_bytes, "image/png")},
    )
    print(f" -> HTTP {status} | Latency: {latency5b:.2f}ms")
    print(f"    Decision: {t5b_res['decision']} | Eligibility: {t5b_res['checks']['eligibility']['status']}")
    print(f"    Age: {t5b_res['checks']['eligibility']['age']} | Strong Flags: {t5b_res['strong_flags']}")
    assert status == 200
    assert t5b_res["decision"] == "REJECT", f"Expected REJECT, got {t5b_res['decision']}"
    assert "INELIGIBLE_AGE" in t5b_res["strong_flags"] or t5b_res["checks"]["eligibility"]["status"] == "FAIL"
    results["tests"].append({
        "req": "R2",
        "name": "Test 5B: Underage Participant Eligibility (DOB 2011-08-20, Age 15 < 18)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency5b, 2),
        "decision": t5b_res["decision"],
        "eligibility_status": t5b_res["checks"]["eligibility"]["status"],
        "age": t5b_res["checks"]["eligibility"]["age"],
        "strong_flags": t5b_res["strong_flags"],
    })

    # ------------------------------------------------------------------
    # R3: Organizer Audit & Lifecycle Operations
    # ------------------------------------------------------------------
    print("\n[R3 - Step 1] Querying GET /api/registrations ...")
    status, reg_list, latency_regs = send_get_request(f"{API_URL}/api/registrations")
    print(f" -> HTTP {status} | Latency: {latency_regs:.2f}ms | Registrations count: {len(reg_list)}")
    assert status == 200
    assert isinstance(reg_list, list) and len(reg_list) >= 5
    # Assert structured checks, reasons, extracted
    first = reg_list[0]
    assert "checks" in first and isinstance(first["checks"], dict)
    assert "reasons" in first and isinstance(first["reasons"], list)
    assert "extracted" in first and isinstance(first["extracted"], dict)
    print(f" -> Verified structured checks, reasons, and extracted objects present in registration records.")
    results["tests"].append({
        "req": "R3",
        "name": "Organizer Audit: Query Submissions (GET /api/registrations)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency_regs, 2),
        "count": len(reg_list),
        "fields_validated": ["checks", "reasons", "extracted"],
    })

    print(f"\n[R3 - Step 2] Reviewing Blurry Registration #{blurry_reg_id} via POST /api/registrations/{blurry_reg_id}/review ...")
    review_notes = "Manual audit approval: verified physical document with institution lead."
    status, rev_res, latency_rev = send_form_request(
        f"{API_URL}/api/registrations/{blurry_reg_id}/review",
        form_data={"status": "APPROVED", "notes": review_notes},
    )
    print(f" -> HTTP {status} | Latency: {latency_rev:.2f}ms | Response: {rev_res}")
    assert status == 200
    assert rev_res.get("status") == "success"
    assert rev_res.get("new_status") == "APPROVED"

    # Query back to verify persistence
    status, single_reg, latency_get = send_get_request(f"{API_URL}/api/registrations/{blurry_reg_id}")
    assert status == 200
    assert single_reg.get("status") == "APPROVED"
    assert single_reg.get("reviewer_notes") == review_notes
    print(f" -> Verified registration #{blurry_reg_id} updated to APPROVED with audit notes.")
    results["tests"].append({
        "req": "R3",
        "name": f"Organizer Audit: Review Override (POST /api/registrations/{blurry_reg_id}/review)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency_rev, 2),
        "new_status": single_reg.get("status"),
        "reviewer_notes": single_reg.get("reviewer_notes"),
    })

    print("\n[R3 - Step 3] Cleansing Demo Data via POST /api/reset ...")
    status, reset_res, latency_reset = send_form_request(f"{API_URL}/api/reset", {})
    print(f" -> HTTP {status} | Latency: {latency_reset:.2f}ms | Response: {reset_res}")
    assert status == 200
    assert reset_res.get("status") == "reset"

    # Verify database is wiped clean
    status, post_reset_list, _ = send_get_request(f"{API_URL}/api/registrations")
    assert status == 200
    assert len(post_reset_list) == 0, f"Expected 0 registrations after reset, got {len(post_reset_list)}"
    print(f" -> Verified database clean wipe: {len(post_reset_list)} records remain.")
    results["tests"].append({
        "req": "R3",
        "name": "Organizer Audit: Wipe Database (POST /api/reset)",
        "status": "PASS",
        "http_code": status,
        "latency_ms": round(latency_reset, 2),
        "post_reset_count": len(post_reset_list),
    })

    print("\n==================================================================")
    print(" ALL LIVE TEST SCENARIOS PASSED WITH ZERO ERRORS!")
    print("==================================================================")

    # Save structured results to file
    out_file = BASE_DIR / "scripts" / "live_execution_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Structured test results saved to: {out_file}")
    return results


if __name__ == "__main__":
    run_live_suite()
