import argparse
import json
import sys
from pathlib import Path
from .pipeline import PANVerifierPipeline
from .storage import PANStorage

def main():
    parser = argparse.ArgumentParser(
        description="Independent Indian PAN Card Forensic Data Extraction & Verification Tool"
    )
    parser.add_argument("image_path", help="Path to input PAN card image (JPEG, PNG, etc.)")
    parser.add_argument("--output", "-o", help="Optional custom output JSON file path")
    parser.add_argument("--json", action="store_true", help="Print raw JSON to stdout")

    args = parser.parse_args()

    pipeline = PANVerifierPipeline()
    try:
        result = pipeline.process_image(args.image_path, save_json=True)
        
        if args.output:
            out_p = Path(args.output).resolve()
            out_p.parent.mkdir(parents=True, exist_ok=True)
            with open(out_p, "w", encoding="utf-8") as f:
                json.dump(result.model_dump(), f, indent=2, ensure_ascii=False)
            persisted = str(out_p)
        else:
            persisted = result.metadata.get("persisted_json")

        if args.json:
            print(json.dumps(result.model_dump(), indent=2, ensure_ascii=False))
        else:
            print("\n" + "="*65)
            print("         PAN CARD VERIFICATION & DATA EXTRACTION RESULT")
            print("="*65)
            print(f"Status              : {result.status}")
            print(f"Overall Confidence  : {result.overall_confidence:.1f}%")
            print(f"Image SHA-256       : {result.image_hash[:16]}...")
            print(f"Persisted JSON Path : {persisted}")
            print("-" * 65)
            print("EXTRACTED FIELDS:")
            for field_name, f_res in result.fields.items():
                val_str = f_res.value or "[NOT DETECTED]"
                conf_str = f"{f_res.confidence * 100:.1f}%" if f_res.confidence else "N/A"
                print(f"  • {field_name.ljust(15)}: {val_str.ljust(25)} (Confidence: {conf_str})")
            print("-" * 65)
            print(f"QR Code Detected    : {result.qr_data.detected} ({result.qr_data.status})")
            if result.qr_data.payload:
                print(f"QR Payload          : {result.qr_data.payload}")
            print("-" * 65)
            print(f"Forensic Summary    : {result.forensic_summary}")
            if result.reasons:
                print("Checks & Validation :")
                for r in result.reasons:
                    print(f"  ✓ {r}")
            print("="*65 + "\n")

    except Exception as e:
        print(f"Error processing PAN image: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
