"""
Typed Pydantic Data Models for PAN Verifier Module.
Complies with SCOPE.md and ORIGINAL_REQUEST.md interface contracts.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class FieldValidation(BaseModel):
    regex_matched: bool = False
    pan_type: Optional[str] = None
    surname_initial: Optional[str] = None
    surname_match: Optional[bool] = None
    token_count: Optional[int] = None
    alphabetic_only: Optional[bool] = None
    format: Optional[str] = None
    parsed_iso: Optional[str] = None
    valid_calendar_date: Optional[bool] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class FieldResult(BaseModel):
    value: Optional[str] = None
    confidence: float = 0.0
    bounding_box: Optional[List[int]] = None  # [ymin, xmin, ymax, xmax]
    is_valid: bool = False
    validation_note: Optional[str] = None
    raw_text: Optional[str] = None
    method: Optional[str] = None  # "ANCHOR_SPATIAL", "LINE_SEQUENTIAL", "REGEX_TOPOLOGICAL"
    validation: Optional[Dict[str, Any]] = None


class ExtractedData(BaseModel):
    pan_number: FieldResult
    name: FieldResult
    fathers_name: FieldResult
    dob: FieldResult


class QRResult(BaseModel):
    detected: bool = False
    payload: Optional[str] = None
    raw_payload: Optional[str] = None
    decoded_fields: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.0
    status: Optional[str] = None  # "DECODED", "DETECTED_NOT_DECODED", "NOT_DETECTED"
    polygon: Optional[List[Any]] = None
    cross_validation: Optional[Dict[str, bool]] = None


class VerificationOutput(BaseModel):
    image_hash: str
    image_path: Optional[str] = None
    image_name: Optional[str] = None
    timestamp: str
    fields: Dict[str, FieldResult]
    qr_data: QRResult
    overall_confidence: float
    status: str  # "VALID", "MANUAL_REVIEW", "REJECT"
    forensic_summary: Optional[str] = ""
    reasons: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


# Backwards compatibility alias
PANVerificationOutput = VerificationOutput
