"""
Academic Verification Service (Mock DigiLocker / National Academic Depository / Institutional APIs).
Simulates authoritative academic registry verification for student eligibility checks.
"""

from datetime import datetime, timezone
from difflib import SequenceMatcher
import re
from typing import Any, Dict, Optional


STATUS_ACTIVE = "ACTIVE"
STATUS_GRADUATED = "GRADUATED"
STATUS_SUSPENDED = "SUSPENDED"
STATUS_NOT_FOUND = "NOT_FOUND"

VALID_STATUSES = {STATUS_ACTIVE, STATUS_GRADUATED, STATUS_SUSPENDED, STATUS_NOT_FOUND}


def _normalize_id(val: Optional[str]) -> str:
    if not val:
        return ""
    return re.sub(r"[^A-Z0-9]", "", val.upper())


def _normalize_str(val: Optional[str]) -> str:
    if not val:
        return ""
    return re.sub(r"[^a-z0-9]", "", val.lower())


# Canonical mock database representing National Academic Depository (NAD) records
MOCK_ACADEMIC_REGISTRY: Dict[str, Dict[str, Any]] = {
    "ABC20261023": {
        "name": "Rahul Kumar",
        "institution": "ABC Institute of Technology",
        "status": STATUS_ACTIVE,
        "program": "B.Tech Computer Science & Engineering",
        "batch": "2023-2027",
        "semester": 5,
        "nad_id": "NAD-IN-2023-991823",
        "cgpa": 8.92,
        "active_backlogs": 0,
        "issuer": "DigiLocker / National Academic Depository",
    },
    "TECH2024098": {
        "name": "Priya Patel",
        "institution": "National Institute of Technology Karnataka",
        "status": STATUS_ACTIVE,
        "program": "B.Tech Information Technology",
        "batch": "2022-2026",
        "semester": 7,
        "nad_id": "NAD-IN-2022-441209",
        "cgpa": 9.15,
        "active_backlogs": 0,
        "issuer": "DigiLocker / National Academic Depository",
    },
    "BLUR2026007": {
        "name": "Rahul Kumar",
        "institution": "ABC Institute of Technology",
        "status": STATUS_ACTIVE,
        "program": "B.Tech Computer Science & Engineering",
        "batch": "2023-2027",
        "semester": 5,
        "nad_id": "NAD-IN-2023-991824",
        "cgpa": 8.50,
        "active_backlogs": 0,
        "issuer": "DigiLocker / National Academic Depository",
    },
    "ALUM2021004": {
        "name": "Amitabh Roy",
        "institution": "Indian Institute of Technology Bombay",
        "status": STATUS_GRADUATED,
        "program": "B.Tech Electrical Engineering",
        "batch": "2019-2023",
        "semester": 8,
        "nad_id": "NAD-IN-2019-110293",
        "cgpa": 8.70,
        "active_backlogs": 0,
        "issuer": "DigiLocker / National Academic Depository",
    },
    "SUSP2025771": {
        "name": "Dev Sharma",
        "institution": "Delhi Technical University",
        "status": STATUS_SUSPENDED,
        "program": "B.Tech Mechanical Engineering",
        "batch": "2024-2028",
        "semester": 3,
        "nad_id": "NAD-IN-2024-551184",
        "cgpa": 5.40,
        "active_backlogs": 4,
        "issuer": "Institutional ERP Portal",
    },
}


def verify_student_enrollment(
    institution: str,
    roll_number: str,
    name: str,
) -> Dict[str, Any]:
    """
    Verify student enrollment against mock DigiLocker / NAD / Institutional API.
    
    Returns:
        Dict containing:
        - status: "ACTIVE" | "GRADUATED" | "SUSPENDED" | "NOT_FOUND"
        - verified: bool (True only when status is ACTIVE)
        - institution: str
        - roll_number: str
        - name: str
        - trust_score: float (0.0 to 1.0)
        - provider: str
        - remarks: str
        - record: Optional[Dict] details
        - timestamp: ISO 8601 UTC timestamp
    """
    norm_roll = _normalize_id(roll_number)
    norm_name = _normalize_str(name)
    norm_inst = _normalize_str(institution)

    timestamp = datetime.now(timezone.utc).isoformat()
    base_response = {
        "institution": institution or "",
        "roll_number": roll_number or "",
        "name": name or "",
        "provider": "DigiLocker / NAD Academic Federation API",
        "timestamp": timestamp,
    }

    # Edge cases: missing roll number or name
    if not norm_roll or not norm_name:
        return {
            **base_response,
            "status": STATUS_NOT_FOUND,
            "verified": False,
            "trust_score": 0.0,
            "remarks": "Incomplete academic credentials provided (missing roll number or student name).",
            "record": None,
        }

    # 1. Exact match in canonical registry
    if norm_roll in MOCK_ACADEMIC_REGISTRY:
        rec = MOCK_ACADEMIC_REGISTRY[norm_roll]
        expected_name = _normalize_str(rec["name"])
        sim = SequenceMatcher(None, norm_name, expected_name).ratio()
        
        # Check name consistency against registry record
        if sim < 0.60:
            return {
                **base_response,
                "status": STATUS_NOT_FOUND,
                "verified": False,
                "trust_score": 0.0,
                "remarks": f"Roll number {roll_number} exists in NAD registry, but belongs to a different student ({rec['name']}). Impostor risk flagged.",
                "record": None,
            }
            
        status = rec["status"]
        verified = (status == STATUS_ACTIVE)
        trust_scores = {
            STATUS_ACTIVE: 0.98,
            STATUS_GRADUATED: 0.45,
            STATUS_SUSPENDED: 0.10,
        }
        remarks_map = {
            STATUS_ACTIVE: f"Authoritative student enrollment confirmed for {rec['name']} at {rec['institution']}.",
            STATUS_GRADUATED: f"Student {rec['name']} graduated in {rec['batch']} and is no longer an active student.",
            STATUS_SUSPENDED: f"Student {rec['name']} enrollment is currently suspended by institution disciplinary committee.",
        }
        return {
            **base_response,
            "status": status,
            "verified": verified,
            "trust_score": trust_scores.get(status, 0.50),
            "remarks": remarks_map.get(status, f"Enrollment status: {status}"),
            "record": rec,
        }

    # 2. Rule-based simulation for hackathon demo cases
    upper_roll = norm_roll.upper()
    if "SUSP" in upper_roll or "SUSPEND" in upper_roll:
        return {
            **base_response,
            "status": STATUS_SUSPENDED,
            "verified": False,
            "trust_score": 0.15,
            "remarks": f"Academic standing lookup returned SUSPENDED status for roll number {roll_number}.",
            "record": {
                "name": name,
                "institution": institution,
                "status": STATUS_SUSPENDED,
                "issuer": "Institutional ERP Federation",
            },
        }

    if "ALUM" in upper_roll or "GRAD" in upper_roll:
        return {
            **base_response,
            "status": STATUS_GRADUATED,
            "verified": False,
            "trust_score": 0.40,
            "remarks": f"Student has completed degree and graduated; not an active collegiate enrolled student.",
            "record": {
                "name": name,
                "institution": institution,
                "status": STATUS_GRADUATED,
                "issuer": "National Academic Depository (NAD)",
            },
        }

    if "FAKE" in upper_roll or "NOTFOUND" in upper_roll or "404" in upper_roll or "NONE" in upper_roll:
        return {
            **base_response,
            "status": STATUS_NOT_FOUND,
            "verified": False,
            "trust_score": 0.0,
            "remarks": f"Roll number {roll_number} not found in institutional database or DigiLocker NAD repository.",
            "record": None,
        }

    # School or secondary education indicators without college registration
    if "SCH" in upper_roll or "school" in norm_inst or "publicschool" in norm_inst:
        return {
            **base_response,
            "status": STATUS_NOT_FOUND,
            "verified": False,
            "trust_score": 0.10,
            "remarks": "Institutional affiliation identified as secondary school; higher education NAD record not found.",
            "record": None,
        }

    # 3. Dynamic authoritative verification heuristic for realistic college IDs
    if len(norm_roll) >= 5 and len(norm_inst) >= 4 and len(norm_name) >= 3:
        simulated_record = {
            "name": name,
            "institution": institution,
            "status": STATUS_ACTIVE,
            "program": "Undergraduate Degree Program",
            "batch": "2023-2027",
            "semester": 5,
            "nad_id": f"NAD-IN-SIM-{norm_roll[:8]}",
            "cgpa": 8.45,
            "active_backlogs": 0,
            "issuer": "National Academic Depository (NAD)",
        }
        return {
            **base_response,
            "status": STATUS_ACTIVE,
            "verified": True,
            "trust_score": 0.95,
            "remarks": f"Active student enrollment verified via DigiLocker / NAD directory for {institution}.",
            "record": simulated_record,
        }

    return {
        **base_response,
        "status": STATUS_NOT_FOUND,
        "verified": False,
        "trust_score": 0.0,
        "remarks": f"Roll number {roll_number} could not be matched with institution '{institution}' in NAD registry.",
        "record": None,
    }


def verify_college_email(
    email: Optional[str],
    usn_candidates: Optional[list] = None,
    student_name: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Correlates official student email with USN / Register Number and College domain:
      - Validates if domain is an institutional domain (.edu, .ac.in, .edu.in, etc.)
      - Checks if email username prefix matches the student's USN/Roll number
      - Checks if email contains student name tokens
    """
    if not email or "@" not in email:
        return None

    email = email.strip().lower()
    prefix, domain = email.split("@", 1)

    institutional_tlds = [".edu", ".ac.in", ".edu.in", ".res.in", ".ernet.in", ".org.in"]
    is_institutional = any(domain.endswith(tld) for tld in institutional_tlds)

    cleaned_candidates = []
    if usn_candidates:
        for cand in usn_candidates:
            if cand:
                c_clean = re.sub(r"[^a-zA-Z0-9]", "", str(cand)).lower()
                if len(c_clean) >= 3:
                    cleaned_candidates.append(c_clean)

    prefix_clean = re.sub(r"[^a-zA-Z0-9]", "", prefix)

    matched_usn = None
    usn_match_type = None
    match_score = 0.0

    for cand in cleaned_candidates:
        if prefix_clean == cand:
            matched_usn = cand
            usn_match_type = "EXACT_USN_PREFIX_MATCH"
            match_score = 100.0
            break
        elif cand in prefix_clean:
            matched_usn = cand
            usn_match_type = "SUBSTRING_USN_IN_EMAIL"
            match_score = 90.0
            break
        elif prefix_clean in cand and len(prefix_clean) >= 4:
            matched_usn = cand
            usn_match_type = "PARTIAL_USN_PREFIX"
            match_score = 75.0
            break

    name_in_email = False
    matched_name_part = None
    if student_name and not matched_usn:
        name_parts = [p.lower() for p in re.findall(r"[a-zA-Z]+", student_name) if len(p) >= 3]
        for part in name_parts:
            if part in prefix_clean:
                name_in_email = True
                matched_name_part = part
                match_score = max(match_score, 70.0)
                break

    # STRICT ANTI-IMPOSTOR SECURITY POLICY:
    # A valid college email MUST:
    # 1. Belong to an authoritative institutional domain (.edu, .ac.in, etc.)
    # 2. Correlate directly with either the decoded USN / Register Number from the card OR the verified student name.
    # An applicant cannot provide an arbitrary institutional email belonging to another student or an old alumni account.
    is_verified = is_institutional and ((matched_usn is not None) or name_in_email)
    impostor_suspected = is_institutional and not is_verified

    rejection_reason = None
    if not is_institutional:
        rejection_reason = f"Domain '{domain}' is not a recognized institutional or collegiate domain (.edu, .ac.in, .edu.in)."
    elif impostor_suspected:
        detected_hint = f" (expected register number e.g. {cleaned_candidates[0].upper()})" if cleaned_candidates else ""
        rejection_reason = (
            f"Impostor Mismatch: Email prefix '{prefix}' does not correlate with any register number "
            f"or student name found on the uploaded ID card{detected_hint}."
        )

    return {
        "email_address": email,
        "username_prefix": prefix,
        "domain": domain,
        "is_institutional_domain": is_institutional,
        "usn_matched": matched_usn,
        "usn_match_type": usn_match_type,
        "name_found_in_email": name_in_email,
        "matched_name_part": matched_name_part,
        "email_correlation_score": match_score if is_verified else 0.0,
        "is_email_verified_to_student": is_verified,
        "impostor_suspected": impostor_suspected,
        "rejection_reason": rejection_reason,
    }
