import os
from typing import Any, Dict, Optional
from ..config import settings

QUERIES = [
    ("What is the full name?", "NAME"),
    ("What is the date of birth or DOB?", "DOB"),
    ("What is the ID number or document number?", "ID_NUMBER"),
    ("What is the institution or organization name?", "INSTITUTION"),
    ("What is the document or ID type?", "ID_TYPE"),
]


def extract_with_textract(image_bytes: bytes) -> Dict[str, Any]:
    """Execute AWS Textract AnalyzeDocument with Queries feature."""
    import boto3
    
    kwargs = {"region_name": settings.AWS_REGION}
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        
    client = boto3.client("textract", **kwargs)
    response = client.analyze_document(
        Document={"Bytes": image_bytes},
        FeatureTypes=["QUERIES"],
        QueriesConfig={
            "Queries": [{"Text": q, "Alias": alias} for q, alias in QUERIES]
        },
    )
    
    query_blocks = {b.get("Id"): b for b in response.get("Blocks", []) if b.get("BlockType") == "QUERY"}
    result_blocks = {b.get("Id"): b for b in response.get("Blocks", []) if b.get("BlockType") == "QUERY_RESULT"}
    out: Dict[str, Any] = {alias: {"value": None, "confidence": 0.0} for _, alias in QUERIES}
    
    for qid, qblock in query_blocks.items():
        alias = (qblock.get("Query") or {}).get("Alias")
        if not alias:
            continue
        for rel in qblock.get("Relationships", []):
            if rel.get("Type") != "ANSWER":
                continue
            for answer_id in rel.get("Ids", []):
                rb = result_blocks.get(answer_id)
                if rb:
                    out[alias] = {
                        "value": rb.get("Text"),
                        "confidence": float(rb.get("Confidence", 0.0)) / 100.0,
                    }
                    break
    return out


def extract_fields(image_bytes: bytes, fallback: Dict[str, Optional[str]]) -> Dict[str, Any]:
    """
    Extract fields from document.
    Uses AWS Textract when enabled; otherwise falls back to local demo parser.
    """
    if settings.AWS_TEXTRACT_ENABLED:
        try:
            extracted = extract_with_textract(image_bytes)
            return {
                **extracted,
                "mode": "AWS_TEXTRACT_QUERIES",
            }
        except Exception as exc:
            # Graceful degradation to local fallback
            return {
                "NAME": {"value": fallback.get("name"), "confidence": 0.94},
                "DOB": {"value": fallback.get("dob"), "confidence": 0.96},
                "ID_NUMBER": {"value": fallback.get("id_number"), "confidence": 0.93},
                "INSTITUTION": {"value": fallback.get("institution"), "confidence": 0.92},
                "ID_TYPE": {"value": fallback.get("id_type", "COLLEGE_ID"), "confidence": 0.95},
                "mode": "LOCAL_FALLBACK",
                "warning": f"AWS Textract fallback engaged: {type(exc).__name__}",
            }
            
    # Default offline / hackathon demo mode
    return {
        "NAME": {"value": fallback.get("name"), "confidence": 0.96},
        "DOB": {"value": fallback.get("dob"), "confidence": 0.98},
        "ID_NUMBER": {"value": fallback.get("id_number"), "confidence": 0.95},
        "INSTITUTION": {"value": fallback.get("institution"), "confidence": 0.93},
        "ID_TYPE": {"value": fallback.get("id_type", "COLLEGE_ID"), "confidence": 0.97},
        "mode": "LOCAL_DEMO",
    }
