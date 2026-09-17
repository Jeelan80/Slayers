import os
from pathlib import Path
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
DEMOS_DIR = BASE_DIR / "static" / "demos"



def run_tests():
    print("--- 1. Testing Health & Samples Endpoints ---")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("Health check OK:", res.json())

    samples_res = client.get("/api/samples")
    assert samples_res.status_code == 200
    samples = samples_res.json()
    print(f"Samples endpoint returned {len(samples)} samples:")
    for s in samples:
        print(f" - {s['id']}: {s['filename']} -> expected: {s['expected_decision']}")
    assert len(samples) >= 4

    print("\n--- 2. Testing Academic Verification Service Endpoint ---")
    acad_res = client.get(
        "/api/academic/verify",
        params={
            "institution": "ABC Institute of Technology",
            "roll_number": "ABC20261023",
            "name": "Rahul Kumar",
        },
    )
    assert acad_res.status_code == 200
    acad_data = acad_res.json()
    print("Academic verify check:", acad_data["status"], "| Verified:", acad_data["verified"])
    assert acad_data["status"] == "ACTIVE"
    assert acad_data["verified"] is True

    print("\n--- 3. Resetting Demo Database ---")
    res = client.post("/api/reset")
    assert res.status_code == 200
    print("Reset OK")

    demos = [
        ("valid", "APPROVE", "Rahul Kumar", "2005-03-14", "ABC20261023", "ABC Institute of Technology", 18),
        ("edited", "REJECT", "Rohan Sharma", "2007-04-14", "ABC20261023", "ABC Institute of Technology", 18),
        ("blurry", "MANUAL_REVIEW", "Rahul Kumar", "2005-03-14", "BLUR2026007", "ABC Institute of Technology", 18),
        ("underage", "REJECT", "Aarav Gupta", "2011-08-20", "SCH20269941", "Delhi Public School", 18),
    ]

    for scenario, expected_decision, name, dob, id_num, inst, min_age in demos:
        print(f"\n--- Testing Scenario: {scenario} (Expected: {expected_decision}) ---")
        img_path = DEMOS_DIR / f"{scenario}_id.jpg"
        if not img_path.exists():
            # Fallback to samples dir
            img_path = BASE_DIR / "app" / "static" / "samples" / f"{scenario}_id.png"
        with open(img_path, "rb") as f:
            resp = client.post(
                "/api/verify",
                data={
                    "name": name,
                    "dob": dob,
                    "id_number": id_num,
                    "institution": inst,
                    "id_type": "COLLEGE_ID",
                    "min_age": str(min_age),
                    "event_date": "2026-09-18",
                    "demo_scenario": scenario,
                },
                files={"file": (f"{scenario}_id.jpg", f, "image/jpeg")},
            )
        assert resp.status_code == 200, f"Error verifying {scenario}: {resp.text}"
        data = resp.json()
        print(f"Result: {data['decision']} | Confidence: {data['confidence']:.1%} | Summary: {data['summary']}")
        print(f"Reasons: {data['reasons']}")
        if data["decision"] != expected_decision:
            print(f"FAILED: Expected {expected_decision}, got {data['decision']}")
            sys.exit(1)

    print("\n--- 4. Testing Scenario: Duplicate ID Detection (Sybil Attack) ---")
    # Submitting the valid ID a second time under a different name to test reuse detection
    valid_path = DEMOS_DIR / "valid_id.jpg"
    with open(valid_path, "rb") as f:
        resp = client.post(
            "/api/verify",
            data={
                "name": "Impostor Sharma",
                "dob": "2005-03-14",
                "id_number": "ABC20261023",
                "institution": "ABC Institute of Technology",
                "id_type": "COLLEGE_ID",
                "min_age": "18",
                "event_date": "2026-09-18",
                "demo_scenario": "valid",
            },
            files={"file": ("valid_id.jpg", f, "image/jpeg")},
        )
    assert resp.status_code == 200
    dup_data = resp.json()
    print(f"Duplicate Result: {dup_data['decision']} | Flags: {dup_data['strong_flags']}")
    assert "EXACT_ID_DUPLICATE" in dup_data["strong_flags"] or dup_data["checks"]["duplicate"]["status"] == "DUPLICATE", "Duplicate check failed!"
    assert dup_data["decision"] == "REJECT", f"Expected REJECT for reused ID, got {dup_data['decision']}"

    print("\n--- 5. Testing Registrations List & Manual Review Workflow ---")
    res = client.get("/api/registrations")
    assert res.status_code == 200
    regs = res.json()
    print(f"Total registrations stored: {len(regs)}")
    assert len(regs) >= 5

    # Find the blurry registration and perform manual review override
    blurry_reg = next(r for r in regs if r["decision"] == "MANUAL_REVIEW")
    reg_id = blurry_reg["id"]
    print(f"Updating registration #{reg_id} status to APPROVED...")
    rev_res = client.post(
        f"/api/registrations/{reg_id}/review",
        data={"status": "APPROVED", "notes": "Verified manually by hackathon lead: student admitted with physical card."},
    )
    assert rev_res.status_code == 200
    updated = client.get(f"/api/registrations/{reg_id}").json()
    assert updated["status"] == "APPROVED"
    assert "Verified manually" in updated["reviewer_notes"]
    print("Manual review override OK!")

    print("\n==========================================")
    print("*** ALL VERIFORGE SMOKE TESTS PASSED! ***")
    print("==========================================")


if __name__ == "__main__":
    run_tests()
