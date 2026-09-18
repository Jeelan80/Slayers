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
    
    # Tamper score (from ELA, QR contradiction, and 8-check tampering suite)
    tamper = clamp(max(ev.get("tamper_score", 0.0), ev.get("tampering_score", 0.0)))
    if ev.get("tampering_risk") == "HIGH":
        tamper = max(tamper, 0.85)
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

    if ev.get("tampering_risk") == "HIGH" and "DOCUMENT_TAMPERING_DETECTED" not in strong_flags:
        strong_flags.append("DOCUMENT_TAMPERING_DETECTED")
        reasons.append("Forensic analysis detected document tampering (pixel or text anomalies).")

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

    if ev.get("tampering_risk") == "MEDIUM":
        reasons.append("Document forensic scanner detected subtle typography or compression anomalies (Risk: MEDIUM).")

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
    has_hard_fraud = (
        ev.get("qr_mismatch")
        or ev.get("tamper_detected")
        or ev.get("tampering_risk") == "HIGH"
        or ev.get("exact_duplicate")
        or not ev.get("eligibility_pass", True)
        or ev.get("academic_status") == "SUSPENDED"
        or (len(strong_flags) >= 2 and not is_low_quality)
    )

    if has_hard_fraud:
        decision = "REJECT"
        summary = "Registration rejected due to policy violations, document tampering, or duplicate reuse."
    elif is_low_quality or ev.get("ela_flag") or ev.get("tampering_risk") == "MEDIUM" or score < 0.78 or strong_flags:
        decision = "MANUAL_REVIEW"
        if is_low_quality:
            summary = "Document photo is blurry/unreadable; forwarded to organizer review queue without penalty."
        elif ev.get("tampering_risk") == "MEDIUM":
            summary = "Forensic inspection detected borderline anomalies; forwarded to manual organizer queue."
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


def decide_student_pipeline(ev: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dedicated decision policy for the multi-tier Student Verification Pipeline:
    Aadhaar Ground Truth + Student ID + MediaPipe Blink + InsightFace Biometrics + 8-Check Tampering.

    Enforces:
    - Tampering Hard Veto: HIGH risk tampering triggers immediate REJECTION.
    - Threshold: >= 70% (0.70) composite match concludes student eligibility.
    - If < 70% or MEDIUM tampering risk: triggers official college email verification fallback (OTP).
    """
    is_student = ev.get("is_student", True)
    name_match = clamp(ev.get("name_match", 0.0))
    biometric_score = clamp(ev.get("biometric_score", 0.0))
    blink_passed = ev.get("blink_passed", True)
    quality_score = clamp(ev.get("quality_score", 0.90))
    academic_trust = clamp(ev.get("academic_trust_score", 0.80))
    email_otp_verified = ev.get("email_otp_verified", False)
    email_correlation_score = clamp(ev.get("email_correlation_score", 0.0) / 100.0)
    college_doc_verified = ev.get("college_doc_verified", False)
    college_doc_score = clamp(ev.get("college_doc_score", 0.0))
    college_doc_type = ev.get("college_doc_type", "FEE_RECEIPT")
    tampering_risk = ev.get("tampering_risk", "LOW")
    tamper_detected = ev.get("tamper_detected", False)
    tampering_score = clamp(ev.get("tampering_score", 0.0))

    # 1. Calculate Composite Student Confidence
    if is_student:
        composite = (
            0.35 * name_match
            + 0.40 * biometric_score
            + 0.15 * academic_trust
            + 0.10 * quality_score
        )
        # Factor in tampering penalty if present
        if tampering_risk == "MEDIUM":
            composite = max(0.40, composite - 0.15)
        elif tampering_risk == "HIGH" or tamper_detected:
            composite = min(0.30, composite * 0.40)
    else:
        composite = (
            0.60 * biometric_score
            + 0.25 * quality_score
            + 0.15 * (1.0 if blink_passed else 0.4)
        )

    composite = clamp(composite)
    reasons: List[str] = []
    strong_flags: List[str] = []

    # Check for hard tampering veto
    if tampering_risk == "HIGH" or tamper_detected:
        strong_flags.append("DOCUMENT_TAMPERING_DETECTED")
        reasons.append("Forensic analysis detected document tampering (pixel or text anomalies on College ID).")
    elif tampering_risk == "MEDIUM":
        reasons.append("Borderline document integrity: subtle forensic anomalies detected (Risk: MEDIUM).")

    if name_match >= 0.70:
        reasons.append(f"Aadhaar Ground Truth name matches Student ID ({name_match:.0%}).")
    elif is_student:
        reasons.append(f"Discrepancy between Aadhaar name and Student ID ({name_match:.0%}).")
        strong_flags.append("NAME_DISCREPANCY")

    if biometric_score >= 0.70:
        reasons.append(f"Triangulated biometrics passed with {biometric_score:.0%} confidence.")
    else:
        reasons.append(f"Biometric similarity ({biometric_score:.0%}) below optimal confidence.")

    if not blink_passed:
        reasons.append("MediaPipe dynamic blink liveness was not confirmed.")
        strong_flags.append("LIVENESS_FAILED")
    else:
        reasons.append("MediaPipe Eye Aspect Ratio (EAR) dynamic blink confirmed.")

    if email_otp_verified:
        reasons.append("Institutional university email successfully verified via one-time code.")

    if college_doc_verified:
        reasons.append(f"Official institutional document ({college_doc_type.replace('_', ' ').title()}) verified against Ground Truth.")

    # 2. Decision Logic
    THRESHOLD = 0.70

    if tampering_risk == "HIGH" or tamper_detected:
        decision = "REJECT"
        status = "REJECTED_DOCUMENT_TAMPERED"
        summary = "Student verification rejected due to detected document tampering on College ID card."
    elif not is_student:
        decision = "APPROVE" if composite >= THRESHOLD and blink_passed else "MANUAL_REVIEW"
        summary = "Citizen identity verified against Aadhaar and live biometrics."
        status = "VERIFIED_CITIZEN"
    elif composite >= THRESHOLD and blink_passed and tampering_risk == "LOW":
        decision = "APPROVE"
        summary = f"Student eligibility verified ({composite:.0%} confidence >= 70% threshold). All biometrics and credentials match."
        status = "VERIFIED_STUDENT"
    elif email_otp_verified:
        decision = "APPROVE"
        composite = max(composite, 0.85)
        summary = "Student eligibility verified via confirmed official university email challenge."
        status = "VERIFIED_STUDENT_EMAIL_BACKED"
    elif college_doc_verified:
        decision = "APPROVE"
        composite = max(composite, 0.88)
        summary = f"Student eligibility verified via authenticated institutional document ({college_doc_type.replace('_', ' ').title()})."
        status = "VERIFIED_STUDENT_DOCUMENT_BACKED"
    else:
        decision = "EMAIL_FALLBACK_REQUIRED"
        if tampering_risk == "MEDIUM":
            summary = "Borderline credential integrity detected (Risk: MEDIUM). Verification via college email or fee receipt / bonafide required."
        else:
            summary = f"Confidence score ({composite:.0%}) is below 70% threshold. Please verify via official college email or institutional document."
        status = "PENDING_EMAIL_VERIFICATION"

    return {
        "decision": decision,
        "student_status": status,
        "confidence": round(composite, 4),
        "threshold": THRESHOLD,
        "passed_threshold": composite >= THRESHOLD and decision == "APPROVE",
        "summary": summary,
        "reasons": reasons,
        "strong_flags": strong_flags,
        "tampering_risk": tampering_risk,
        "tamper_detected": tamper_detected,
        "components": {
            "name_match": round(name_match, 3),
            "biometric_score": round(biometric_score, 3),
            "academic_trust": round(academic_trust, 3),
            "quality": round(quality_score, 3),
            "tampering_score": round(tampering_score, 3),
            "email_correlation": round(email_correlation_score, 3),
            "college_doc_score": round(college_doc_score, 3),
        },
    }
