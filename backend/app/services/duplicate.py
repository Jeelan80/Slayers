import hashlib
import hmac
from typing import Any, Dict, Optional
from ..config import settings
from ..db import find_by_id_fingerprint, list_phashes
from .forensics import phash_distance

SECRET = settings.ID_HASH_SECRET.encode()


def normalize_id(value: Optional[str]) -> str:
    if not value:
        return ""
    return "".join(ch for ch in value.upper() if ch.isalnum())


def mask_id(value: Optional[str]) -> str:
    if not value:
        return ""
    cleaned = value.strip()
    if len(cleaned) <= 4:
        return "***"
    return cleaned[:2] + ("*" * (len(cleaned) - 4)) + cleaned[-2:]


def fingerprint_id(value: Optional[str]) -> Optional[str]:
    n = normalize_id(value)
    if not n:
        return None
    return hmac.new(SECRET, n.encode(), hashlib.sha256).hexdigest()


def duplicate_evidence(id_number: Optional[str], phash: Optional[str]) -> Dict[str, Any]:
    id_fp = fingerprint_id(id_number)
    exact = find_by_id_fingerprint(id_fp) if id_fp else None
    
    candidates = []
    if phash:
        for row in list_phashes():
            try:
                dist = phash_distance(phash, row["phash"])
            except Exception:
                continue
            if dist <= 5 and (not exact or row["id"] != exact["id"]):
                candidates.append({
                    "registration_id": row["id"],
                    "name": row["name"],
                    "distance": dist,
                })
    candidates.sort(key=lambda x: x["distance"])
    
    return {
        "id_fingerprint": id_fp,
        "exact_duplicate": exact is not None,
        "exact_match": {
            "registration_id": exact["id"],
            "name": exact["name"],
            "created_at": exact["created_at"],
        } if exact else None,
        "phash_possible_reuse": bool(candidates),
        "phash_matches": candidates[:3],
    }
