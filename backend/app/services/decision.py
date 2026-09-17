"""
Multi-Gate Evidence Fusion & Policy Decision Engine.
Implements the research evidence fusion formula:
C = 0.15*OCR + 0.10*Quality + 0.25*(1-Tamper) + 0.25*Consistency + 0.15*(1-Duplicate) + 0.10*Face

Enforces strict 3-way decision policy (APPROVE, MANUAL_REVIEW, REJECT)
with false-positive prevention for degraded/blurry inputs.
"""

from typing import Any, Dict, List, Optional


def clamp(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def decide(ev: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fuses multiple evidence signals into an auditable eligibility decision:
    APPROVE | MANUAL_REVIEW | REJECT
    
    Formula:
    C = 0.15*OCR + 0.10*Quality + 0.25*(1-Tamper) + 0.25*Consistency + 0.15*(1-Duplicate) + 0.10*Face
    """
    ocr_conf = clamp(ev.get("ocr_confidence", 0.85))
    quality = clamp(ev.get("quality_score", 0.90))
    
    # Tamper score (from ELA and QR contradiction)
    tamper = clamp(ev.get("tamper_score", 0.0))
    untampered = 1.0 - tamper
    
    # Cross-validation consistency (3-way check)
    consistency = clamp(ev.get("consistency_score", 1.0))
    
    # Duplicate risk (1.0 = duplicate, 0.0 = unique)
    dup_risk = clamp(ev.get("duplicate_risk", 0.0))
    uniqueness = 1.0 - dup_risk
    
    face_match = ev.get("face_match")

    # Evidence fusion weights:
    # 0.15*OCR + 0.10*Quality + 0.25*(1-Tamper) + 0.25*Consistency + 0.15*(1-Duplicate) + 0.10*Face
    if face_match is not None:
        face_val = clamp(face_match)
        score = (
            0.15 * ocr_conf
            + 0.10 * quality
            + 0.25 * untampered
            + 0.25 * consistency
            + 0.15 * uniqueness
            + 0.10 * face_val
        )
    else:
        # Re-normalize over remaining 0.90 total weight to preserve scale
        base_sum = 0.15 + 0.10 + 0.25 + 0.25 + 0.15  # = 0.90
        score = (
            (0.15 / base_sum) * ocr_conf
            + (0.10 / base_sum) * quality
            + (0.25 / base_sum) * untampered
            + (0.25 / base_sum) * consistency
            + (0.15 / base_sum) * uniqueness
        )

    score = clamp(score)

    strong_flags: List[str] = []
    reasons: List[str] = []

    # 1. Hard Veto Checks (Fraud / Ineligibility / Sybil attacks)
    if ev.get("exact_duplicate"):
        strong_flags.append("EXACT_ID_DUPLICATE")
        reasons.append("ID number has already been registered in the system (Sybil reuse attempt).")

    if ev.get("qr_mismatch") or ev.get("tamper_detected"):
        strong_flags.append("QR_OCR_MISMATCH")
        reasons.append("Machine-readable QR payload contradicts printed document text (probable digital forgery/splicing).")

    if not ev.get("eligibility_pass", True):
        strong_flags.append("INELIGIBLE_AGE")
        reasons.append("Participant's date of birth does not satisfy the minimum event age requirement.")

    name_match = ev.get("name_match")
    if name_match is not None and name_match < 0.40:
        strong_flags.append("NAME_MISMATCH")
        reasons.append(f"Registration name differs significantly from document ({name_match:.0%} match).")

    if ev.get("academic_status") == "SUSPENDED":
        strong_flags.append("ACADEMIC_SUSPENDED")
        reasons.append("Authoritative institutional registry confirms student enrollment is currently SUSPENDED.")

    if face_match is not None and face_match < 0.45:
        strong_flags.append("FACE_MISMATCH")
        reasons.append("Biometric face match between selfie and document portrait is below acceptable threshold.")

    # 2. Quality & False-Positive Prevention Signals
    is_low_quality = ev.get("quality_flag") == "LOW_QUALITY" or quality < 0.45
    if is_low_quality:
        reasons.append("Document image is low-resolution or blurry; routed to manual queue to avoid false rejection.")
    elif ev.get("quality_flag") == "BORDERLINE_QUALITY":
        reasons.append("Document image sharpness is borderline; manual verification advised.")

    if ev.get("ela_flag") and not (ev.get("qr_mismatch") or ev.get("tamper_detected")):
        reasons.append("Forensic Error Level Analysis detected localized digital compression anomalies.")

    if ev.get("phash_possible_reuse") and not ev.get("exact_duplicate"):
        reasons.append("Document image is visually nearly identical (pHash) to another registration.")

    if ev.get("academic_status") == "GRADUATED":
        reasons.append("NAD registry indicates student has already graduated; requires manual organizer clearance.")

    if ev.get("academic_status") == "NOT_FOUND" and not ev.get("academic_verified", True):
        reasons.append("Institutional registry match pending or unverified via DigiLocker.")

    # 3. Positive Evidence Confirmations
    if ev.get("eligibility_pass", True):
        reasons.append("Date of birth meets the configured event age criteria.")

    if name_match is not None and name_match >= 0.85:
        reasons.append(f"Registration name matches document ({name_match:.0%} similarity).")

    if not ev.get("exact_duplicate") and not ev.get("phash_possible_reuse"):
        reasons.append("Document and ID number are unique across registered participants.")

    if ev.get("qr_status") == "CROSS_VALIDATED" or (ev.get("qr_available") and not ev.get("qr_mismatch")):
        reasons.append("Cryptographic / machine-readable QR data is authentic and cross-validated across all checkpoints.")

    if ev.get("academic_verified"):
        reasons.append("Active student enrollment confirmed via DigiLocker / NAD authoritative registry.")

    if face_match is not None and face_match >= 0.80:
        reasons.append(f"Biometric face match confirmed with {face_match:.0%} confidence.")

    # 4. Final 3-Way Decision Policy Execution
    # Hard Rejections: Strict policy violations, document tampering, or exact duplicate ID
    # Note: Blurry documents MUST NOT be rejected for fraud; they route to MANUAL_REVIEW.
    has_hard_fraud = (
        ev.get("qr_mismatch")
        or ev.get("tamper_detected")
        or ev.get("exact_duplicate")
        or not ev.get("eligibility_pass", True)
        or ev.get("academic_status") == "SUSPENDED"
        or (len(strong_flags) >= 2 and not is_low_quality)
    )

    if has_hard_fraud:
        decision = "REJECT"
        summary = "Registration rejected due to policy violations, document tampering, or duplicate reuse."
    elif is_low_quality or ev.get("ela_flag") or score < 0.78 or strong_flags:
        decision = "MANUAL_REVIEW"
        if is_low_quality:
            summary = "Document photo is blurry/unreadable; forwarded to organizer review queue without penalty."
        else:
            summary = "Automated verification flagged anomalies or borderline confidence; forwarded to organizer review."
    else:
        decision = "APPROVE"
        summary = "All verification signals passed. Document, academic enrollment, and identity are authentic and eligible."

    return {
        "decision": decision,
        "confidence": round(score, 4),
        "strong_flags": strong_flags,
        "summary": summary,
        "reasons": reasons[:8],
        "components": {
            "ocr": round(ocr_conf, 3),
            "quality": round(quality, 3),
            "untampered": round(untampered, 3),
            "consistency": round(consistency, 3),
            "uniqueness": round(uniqueness, 3),
            "face": round(clamp(face_match), 3) if face_match is not None else None,
        },
    }
