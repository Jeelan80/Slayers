from typing import Any, Dict, List


def clamp(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def decide(ev: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fuses multiple evidence signals into an auditable eligibility decision:
    APPROVE | MANUAL_REVIEW | REJECT
    """
    ocr_conf = clamp(ev.get("ocr_confidence", 0.70))
    authenticity = clamp(ev.get("authenticity_score", 0.50))
    dup_risk = clamp(ev.get("duplicate_risk", 0.0))
    name_match = ev.get("name_match")
    face_match = ev.get("face_match")

    # Weighted confidence calculation
    # Base weights: OCR (30%), Authenticity (30%), Unique ID (25%), Face (15%)
    terms = [(0.30, ocr_conf), (0.30, authenticity), (0.25, 1.0 - dup_risk)]
    if face_match is not None:
        terms.append((0.15, clamp(face_match)))
    else:
        # Re-distribute missing face weight proportionally
        base_sum = 0.30 + 0.30 + 0.25
        terms = [(w + 0.15 * (w / base_sum), v) for w, v in terms]

    total_w = sum(w for w, _ in terms)
    score = sum(w * v for w, v in terms) / total_w if total_w > 0 else 0.0

    strong_flags: List[str] = []
    reasons: List[str] = []

    # Hard vetoes and critical failures
    if ev.get("exact_duplicate"):
        strong_flags.append("EXACT_ID_DUPLICATE")
        reasons.append("ID number has already been registered in the system.")

    if ev.get("qr_mismatch"):
        strong_flags.append("QR_OCR_MISMATCH")
        reasons.append("Machine-readable QR code data contradicts printed document text (probable forgery).")

    if not ev.get("eligibility_pass", True):
        strong_flags.append("INELIGIBLE_AGE")
        reasons.append("Participant's date of birth does not satisfy the minimum event age requirement.")

    if name_match is not None and name_match < 0.50:
        strong_flags.append("NAME_MISMATCH")
        reasons.append(f"Registration name differs significantly from extracted document name ({name_match:.0%} match).")

    if face_match is not None and face_match < 0.45:
        strong_flags.append("FACE_MISMATCH")
        reasons.append("Biometric face match between selfie and document photo is below acceptable threshold.")

    # Quality and warning signals
    if ev.get("quality_flag") == "LOW_QUALITY":
        reasons.append("Document image is too blurry or low-resolution for reliable verification.")
    elif ev.get("quality_flag") == "BORDERLINE_QUALITY":
        reasons.append("Document image sharpness is borderline; manual inspection advised.")

    if ev.get("ela_flag"):
        reasons.append("Forensic Error Level Analysis detected localized digital compression anomalies.")

    if ev.get("phash_possible_reuse"):
        reasons.append("Document image is visually nearly identical (pHash) to another registration.")

    # Positive evidence confirmations
    if ev.get("eligibility_pass", True):
        reasons.append("Date of birth meets the configured event age criteria.")

    if name_match is not None and name_match >= 0.85:
        reasons.append(f"Registration name matches document ({name_match:.0%} similarity).")

    if not ev.get("exact_duplicate") and not ev.get("phash_possible_reuse"):
        reasons.append("Document and ID number are unique across registered participants.")

    if ev.get("qr_available") and not ev.get("qr_mismatch"):
        reasons.append("Cryptographic / machine-readable QR data is authentic and consistent.")

    if face_match is not None and face_match >= 0.80:
        reasons.append(f"Biometric face match confirmed with {face_match:.0%} confidence.")

    # Final Decision Mapping
    # 1. Hard Rejection criteria:
    # - Multiple strong flags
    # - Exact duplicate ID reused
    # - QR/OCR mismatch (forged card)
    # - Failed age requirement
    if ev.get("qr_mismatch") or not ev.get("eligibility_pass", True) or len(strong_flags) >= 2 or ev.get("exact_duplicate"):
        decision = "REJECT"
    # 2. Borderline / Review criteria:
    # - Unreadable image
    # - Single name mismatch or face mismatch
    # - Forensic anomaly
    # - Low confidence
    elif ev.get("quality_flag") == "LOW_QUALITY" or ev.get("ela_flag") or score < 0.78 or strong_flags:
        decision = "MANUAL_REVIEW"
    # 3. Clean approval:
    else:
        decision = "APPROVE"

    if decision == "APPROVE":
        summary = "All verification signals passed. Document and identity are authentic and eligible."
    elif decision == "REJECT":
        summary = "Registration rejected due to policy violations, document tampering, or duplicate reuse."
    else:
        summary = "Automated verification flagged anomalies or low quality; forwarded to manual organizer queue."

    return {
        "decision": decision,
        "confidence": round(score, 4),
        "strong_flags": strong_flags,
        "summary": summary,
        "reasons": reasons[:8],
    }
