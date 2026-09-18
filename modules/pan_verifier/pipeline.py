import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .models import VerificationOutput
from .preprocessor import PANPreprocessor
from .ocr_engine import OCREngine
from .qr_scanner import QRScanner
from .parser import PANParser
from .evaluator import PANEvaluator
from .storage import PANStorage

class PANVerifierPipeline:
    """
    Independent End-to-End PAN Card Verification Pipeline.
    Extracts PAN Number, Cardholder Name, Father's Name, DOB, QR Code metadata,
    computes calibrated composite confidence, and persists structured JSON.
    """

    def __init__(self):
        self.preprocessor = PANPreprocessor()
        self.ocr_engine = OCREngine()
        self.qr_scanner = QRScanner()

    def process_image(self, image_path: str, save_json: bool = True) -> VerificationOutput:
        p = Path(image_path).resolve()
        if not p.exists():
            raise FileNotFoundError(f"Image not found at {image_path}")

        # 1. Cryptographic hashing
        img_hash = PANStorage.compute_sha256(str(p))

        # 2. Image loading and auto-orientation
        img = self.preprocessor.auto_orient_and_load(str(p))

        # 3. OCR extraction (Dual pass: full image + demographic column)
        ocr_res = self.ocr_engine.extract_all(img)
        full_text = ocr_res["full_text"]
        demographic_text = ocr_res["demographic_text"]
        tokens = ocr_res["tokens"]

        # 4. QR Code detection and decoding
        qr_result = self.qr_scanner.scan(img)

        # 5. Field parsing with anchor spatial matching & cross-validation
        fields = PANParser.parse(
            raw_text=full_text, 
            tokens=tokens, 
            demographic_text=demographic_text
        )

        # 6. Evaluation of composite confidence and status
        confidence, status, summary, reasons = PANEvaluator.evaluate(fields, qr_result)

        # 7. Construct final typed output
        output = VerificationOutput(
            image_hash=img_hash,
            image_path=str(p),
            image_name=p.name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            fields=fields,
            qr_data=qr_result,
            overall_confidence=confidence,
            status=status,
            forensic_summary=summary,
            reasons=reasons,
            metadata={
                "ocr_tokens_count": len(tokens),
                "resolution": [img.shape[1], img.shape[0]],
            }
        )

        # 8. Persist JSON output
        if save_json:
            saved_path = PANStorage.save_output(output)
            output.metadata["persisted_json"] = saved_path

        return output
