from typing import Dict, Any, Tuple
from .models import FieldResult, QRResult

class PANEvaluator:
    """
    Evaluator for Indian PAN Card extraction integrity and confidence.
    Computes calibrated composite confidence score (0–100%) and verification status.
    """

    WEIGHTS = {
        "pan_number": 0.35,
        "name": 0.25,
        "dob": 0.20,
        "fathers_name": 0.15,
        "qr": 0.05,
    }

    @classmethod
    def evaluate(
        cls, 
        fields: Dict[str, FieldResult], 
        qr_result: QRResult
    ) -> Tuple[float, str, str, list]:
        """
        Returns:
            overall_confidence: float (0.0 to 100.0)
            status: "VALID" | "MANUAL_REVIEW" | "REJECT"
            forensic_summary: str
            reasons: list of str
        """
        reasons = []
        c_pan = fields.get("pan_number", FieldResult()).confidence if fields.get("pan_number") and fields["pan_number"].is_valid else 0.0
        c_name = fields.get("name", FieldResult()).confidence if fields.get("name") and fields["name"].is_valid else 0.0
        c_dob = fields.get("dob", FieldResult()).confidence if fields.get("dob") and fields["dob"].is_valid else 0.0
        c_fat = fields.get("fathers_name", FieldResult()).confidence if fields.get("fathers_name") and fields["fathers_name"].is_valid else 0.0
        c_qr = 1.0 if qr_result.status == "DECODED" else (0.85 if qr_result.detected else 0.0)

        # Weighted base score (0.0 to 1.0)
        base_score = (
            cls.WEIGHTS["pan_number"] * c_pan +
            cls.WEIGHTS["name"] * c_name +
            cls.WEIGHTS["dob"] * c_dob +
            cls.WEIGHTS["fathers_name"] * c_fat +
            cls.WEIGHTS["qr"] * c_qr
        )

        # Forensic consistency bonuses
        bonus = 0.0
        pan_val = fields.get("pan_number", FieldResult()).value
        name_val = fields.get("name", FieldResult()).value
        fat_val = fields.get("fathers_name", FieldResult()).value

        if pan_val and name_val and len(pan_val) >= 5:
            surname = name_val.split()[-1].upper()
            if surname and pan_val[4] == surname[0]:
                bonus += 0.02
                reasons.append(f"Forensic check passed: 5th character of PAN '{pan_val[4]}' matches surname '{surname}'")

        if name_val and fat_val:
            name_surname = name_val.split()[-1].upper()
            fat_surname = fat_val.split()[-1].upper()
            if name_surname == fat_surname:
                bonus += 0.01
                reasons.append(f"Patronymic consistency verified: Cardholder and Father share surname '{name_surname}'")

        if qr_result.detected:
            reasons.append("Secure QR code presence detected")

        raw_score = min(1.0, base_score + bonus)
        overall_confidence = round(raw_score * 100.0, 2)

        # Determine status
        all_required = all(fields.get(f) and fields[f].is_valid for f in ["pan_number", "name", "dob", "fathers_name"])
        
        if all_required and overall_confidence >= 85.0:
            status = "VALID"
            forensic_summary = f"All 4 core identity fields successfully verified with high confidence ({overall_confidence}%)."
        elif fields.get("pan_number") and fields["pan_number"].is_valid:
            status = "MANUAL_REVIEW"
            forensic_summary = f"PAN number identified, but secondary fields need manual review ({overall_confidence}%)."
        else:
            status = "REJECT"
            forensic_summary = f"Verification failed: Essential PAN number could not be extracted ({overall_confidence}%)."

        return overall_confidence, status, forensic_summary, reasons
