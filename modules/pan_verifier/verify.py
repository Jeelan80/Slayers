import sys
from pathlib import Path
from modules.pan_verifier.pipeline import PANVerifierPipeline

GROUND_TRUTH = {
    "pan_number": "IPXPM8977J",
    "name": "BODHI MAHTO",
    "fathers_name": "SHANICHAR MAHTO",
    "dob": "01/01/1958",
}

def run_verification_benchmark():
    sample_path = Path(__file__).resolve().parent / "samples" / "sample_pan.png"
    if not sample_path.exists():
        print(f"Error: Target benchmark sample not found at {sample_path}")
        sys.exit(1)

    print("=================================================================")
    print("      INDIAN PAN CARD VERIFICATION & BENCHMARK ACCURACY TEST     ")
    print("=================================================================")
    print(f"Target Image: {sample_path}")

    pipeline = PANVerifierPipeline()
    result = pipeline.process_image(str(sample_path), save_json=True)

    print("\n--- GROUND TRUTH VS EXTRACTED FIELDS ---")
    print(f"{'Field':<18} | {'Ground Truth':<18} | {'Extracted':<18} | {'Conf':<8} | {'Match'}")
    print("-" * 75)

    all_passed = True
    for field_key, expected_val in GROUND_TRUTH.items():
        extracted_field = result.fields.get(field_key)
        extracted_val = extracted_field.value if extracted_field else None
        conf = f"{extracted_field.confidence * 100:.1f}%" if extracted_field else "0.0%"
        
        match = (extracted_val == expected_val)
        if not match:
            all_passed = False
        match_str = "PASS [✓]" if match else "FAIL [✗]"
        print(f"{field_key:<18} | {expected_val:<18} | {str(extracted_val):<18} | {conf:<8} | {match_str}")

    print("-" * 75)
    print(f"Overall Confidence Score : {result.overall_confidence:.2f}% (Target: >= 95.0%)")
    print(f"Status                   : {result.status}")
    print(f"QR Detection             : {result.qr_data.detected} ({result.qr_data.status})")
    print(f"Persisted JSON Record    : {result.metadata.get('persisted_json')}")
    print("=================================================================")

    # Assertions
    confidence_passed = result.overall_confidence >= 95.0
    if not confidence_passed:
        print(f"FAILED: Confidence score {result.overall_confidence:.2f}% is below target 95.0%")
        all_passed = False

    if all_passed:
        print("OVERALL BENCHMARK: SUCCESS - ALL ACCEPTANCE CRITERIA MET (Exit 0)")
        sys.exit(0)
    else:
        print("OVERALL BENCHMARK: FAILED - Criteria not met (Exit 1)")
        sys.exit(1)

if __name__ == "__main__":
    run_verification_benchmark()
