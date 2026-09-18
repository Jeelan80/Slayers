"""
Aadhaar Secure QR & Cryptographic Ground Truth Extraction Service.
Directly implements the logic and routines from Aadhar-card/main.py.

Includes:
- PyMuPDF (fitz) rendering with password handling
- Multi-attempt CV preprocessing (grayscale, adaptive threshold, 1.5x upscale, denoising)
- pyaadhaar Secure QR (numeric payload) & Old XML QR decoding
- Embedded JP2 photo extraction and conversion to JPEG / base64
- RSA 2048-bit PKCS#1 v1.5 digital signature verification against UIDAI public certificate
- ISO date of birth and ground truth normalization
"""

import base64
import glob
import io
import json
import os
from pathlib import Path
import sys
from typing import Any, Dict, Optional, Tuple, Union

import cv2
import numpy as np
from PIL import Image
from pyzbar.pyzbar import decode as zbar_decode

try:
    from pyaadhaar.decode import AadhaarOldQr, AadhaarSecureQr
    from pyaadhaar.utils import isSecureQr
    PYAADHAAR_AVAILABLE = True
except ImportError:
    AadhaarOldQr = None
    AadhaarSecureQr = None
    isSecureQr = None
    PYAADHAAR_AVAILABLE = False

CERTS_DIR = Path(__file__).resolve().parent.parent / "certs"


# ---------------------------------------------------------------------------
# Step 1: Extract QR payload from an image (OpenCV ndarray)
# ---------------------------------------------------------------------------

def extract_qr_from_image(img: np.ndarray) -> Optional[str]:
    """
    Tries several preprocessing strategies on the image to locate and decode QR code.
    Returns the decoded QR text payload or None.
    """
    if img is None or img.size == 0:
        return None

    # Handle single-channel vs multi-channel
    if len(img.shape) == 2:
        gray = img
    elif img.shape[2] == 4:
        gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    attempts = [gray]

    # 1. Adaptive threshold – helps with uneven lighting/glare
    try:
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2
        )
        attempts.append(thresh)
    except Exception:
        pass

    # 2. Upscale – helps if the QR region is rendered small
    try:
        upscaled = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        attempts.append(upscaled)
    except Exception:
        pass

    # 3. Denoise – for noisy or compressed card scans
    try:
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        attempts.append(denoised)
    except Exception:
        pass

    for variant in attempts:
        try:
            results = zbar_decode(variant)
            if results:
                for result in results:
                    data_str = result.data.decode("utf-8", errors="ignore")
                    if data_str:
                        return data_str
        except Exception:
            continue

    return None


# ---------------------------------------------------------------------------
# Step 2: Extract QR payload from PDF or Image file / bytes
# ---------------------------------------------------------------------------

def extract_qr_from_pdf(doc_or_path: Union[str, bytes], password: Optional[str] = None, dpi: int = 300) -> Optional[str]:
    """
    Renders pages of a PDF document at high DPI and attempts to extract the QR payload.
    Accepts either file path or raw PDF bytes.
    """
    try:
        import fitz
    except ImportError:
        # PyMuPDF is optional; if missing, return None
        return None

    if isinstance(doc_or_path, (bytes, bytearray)):
        doc = fitz.open(stream=doc_or_path, filetype="pdf")
    else:
        if not os.path.exists(doc_or_path):
            raise FileNotFoundError(f"PDF file not found: {doc_or_path}")
        doc = fitz.open(doc_or_path)

    if doc.is_encrypted:
        if password:
            if not doc.authenticate(password):
                raise ValueError("Incorrect password for protected PDF.")
        else:
            raise ValueError(
                "The PDF is password-protected. Provide the password via the password field."
            )

    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=dpi)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.h, pix.w, pix.n))

        if pix.n == 4:
            img_bgr = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        elif pix.n == 3:
            img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = img

        payload = extract_qr_from_image(img_bgr)
        if payload:
            return payload

    return None


def extract_qr_payload(file_or_bytes: Union[str, bytes], password: Optional[str] = None) -> Optional[str]:
    """
    Auto-detects file type (PDF vs Image) and extracts raw QR payload.
    """
    if isinstance(file_or_bytes, (bytes, bytearray)):
        if file_or_bytes[:4] == b"%PDF":
            return extract_qr_from_pdf(file_or_bytes, password=password)
        else:
            np_arr = np.frombuffer(file_or_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if img is None:
                raise FileNotFoundError("Could not read image from bytes")
            return extract_qr_from_image(img)
    else:
        ext = os.path.splitext(file_or_bytes)[1].lower()
        if ext == ".pdf":
            return extract_qr_from_pdf(file_or_bytes, password=password)
        else:
            img = cv2.imread(file_or_bytes)
            if img is None:
                raise FileNotFoundError(f"Could not read image at {file_or_bytes}")
            return extract_qr_from_image(img)


# ---------------------------------------------------------------------------
# Step 3: Parse the payload into structured fields using pyaadhaar
# ---------------------------------------------------------------------------

def parse_qr_payload(qr_string: str) -> dict:
    """
    Parses Secure QR (numeric string) or Old XML QR using pyaadhaar.
    """
    if isSecureQr(qr_string):
        qr = AadhaarSecureQr(int(qr_string))
        data = qr.decodeddata()
        version = data.get("version", "v1")
        data["_qr_type"] = f"secure_qr_{version}".lower()
        data["_has_photo"] = qr.isImage()
        data["_qr_object"] = qr
        return data
    else:
        qr = AadhaarOldQr(qr_string)
        data = qr.decodeddata()
        data["_qr_type"] = "old_qr_xml"
        data["_has_photo"] = False
        data["_qr_object"] = qr
        return data


# ---------------------------------------------------------------------------
# Step 4: Save the embedded photo (if present in Secure QR)
# ---------------------------------------------------------------------------

def save_embedded_photo(qr_object, out_path: Optional[str] = None) -> Tuple[Optional[str], Optional[bytes]]:
    """
    Extracts embedded JP2 photo from AadhaarSecureQr and saves it as JPEG/PNG.
    Returns (out_path, jpeg_bytes).
    """
    try:
        if hasattr(qr_object, "isImage") and qr_object.isImage():
            img = qr_object.image()
            if img is not None:
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=95)
                raw_bytes = buf.getvalue()

                if out_path:
                    with open(out_path, "wb") as f:
                        f.write(raw_bytes)

                return out_path, raw_bytes
    except Exception as e:
        print(f"[warn] could not extract embedded photo: {e}", file=sys.stderr)
    return None, None


# ---------------------------------------------------------------------------
# Step 5: Cryptographic Signature Verification using UIDAI Public Certificate
# ---------------------------------------------------------------------------

def find_cert_file(cert_path: Optional[str] = None) -> Optional[str]:
    """Finds specified certificate or looks for .cer / .crt / .pem in certs directory."""
    if cert_path and os.path.exists(cert_path):
        return cert_path
    
    search_dirs = [str(CERTS_DIR), "."]
    for d in search_dirs:
        cers = glob.glob(os.path.join(d, "*.cer")) + glob.glob(os.path.join(d, "*.crt")) + glob.glob(os.path.join(d, "*.pem"))
        if cers:
            for c in cers:
                cl = c.lower()
                if "sign" in cl or "offline" in cl:
                    return c
            return cers[0]
    return None


def verify_signature(qr_object, cert_path: Optional[str] = None) -> dict:
    """
    Verifies the RSA 2048-bit digital signature of the Secure QR code
    against the UIDAI public certificate using SHA-256 and PKCS#1 v1.5.
    """
    resolved_cert = find_cert_file(cert_path)
    if not resolved_cert:
        return {
            "verified": False,
            "status": "CERT_NOT_FOUND",
            "certificate": None,
            "message": "No certificate found. Place UIDAI's public certificate (.cer) in the backend/app/certs directory."
        }

    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding

        with open(resolved_cert, "rb") as f:
            cert_bytes = f.read()

        try:
            cert = x509.load_der_x509_certificate(cert_bytes)
        except Exception:
            cert = x509.load_pem_x509_certificate(cert_bytes)

        pubkey = cert.public_key()
        signed_data = qr_object.signedData()
        signature = qr_object.signature()

        # Check key usage
        is_enc_only = False
        try:
            ku = cert.extensions.get_extension_for_oid(x509.oid.ExtensionOID.KEY_USAGE).value
            if ku.key_encipherment and not ku.digital_signature:
                is_enc_only = True
        except Exception:
            pass

        # Attempt verification
        try:
            pubkey.verify(signature, signed_data, padding.PKCS1v15(), hashes.SHA256())
            return {
                "verified": True,
                "status": "VALID",
                "certificate": os.path.basename(resolved_cert),
                "message": "Cryptographic signature verified. Data is 100% genuine and signed by UIDAI."
            }
        except Exception as sig_err:
            if is_enc_only:
                diag = (
                    f"'{os.path.basename(resolved_cert)}' is an Authentication Encryption Certificate "
                    "(Key Usage: Key Encipherment), not the UIDAI Signer Certificate (Key Usage: Digital Signature). "
                    "For full validation, use the UIDAI Offline Signer Certificate."
                )
            else:
                diag = f"Signature mismatch: {sig_err}"

            return {
                "verified": False,
                "status": "INVALID_OR_MISMATCHED_CERT",
                "certificate": os.path.basename(resolved_cert),
                "message": diag
            }

    except Exception as e:
        return {
            "verified": False,
            "status": "ERROR",
            "certificate": os.path.basename(resolved_cert) if resolved_cert else None,
            "message": str(e)
        }


# ---------------------------------------------------------------------------
# Main Routine & Standardized Ground Truth Export for FastAPI
# ---------------------------------------------------------------------------

def parse_aadhaar_ground_truth(
    file_or_bytes: Union[str, bytes],
    password: Optional[str] = None,
    cert_path: Optional[str] = None,
) -> dict:
    """
    Ingests Aadhaar document, extracts QR payload, parses demographic fields,
    verifies cryptographic signature, extracts portrait photo, and outputs
    the standardized Ground Truth report.
    """
    raw_payload = extract_qr_payload(file_or_bytes, password=password)
    if raw_payload is None:
        return {
            "success": False,
            "error": "No QR code detected in document. Ensure the file contains a clear Aadhaar QR code."
        }

    parsed = parse_qr_payload(raw_payload)
    qr_object = parsed.pop("_qr_object")

    _, photo_bytes = save_embedded_photo(qr_object)
    signature_report = verify_signature(qr_object, cert_path=cert_path)

    # Standardize DOB (DD-MM-YYYY -> YYYY-MM-DD)
    raw_dob = parsed.get("dob")
    iso_dob = None
    if raw_dob:
        parts = raw_dob.replace("/", "-").split("-")
        if len(parts) == 3 and len(parts[2]) == 4:
            iso_dob = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
        else:
            iso_dob = raw_dob

    fields = {
        "version": parsed.get("version"),
        "name": parsed.get("name"),
        "dob": raw_dob,
        "dob_iso": iso_dob,
        "gender": parsed.get("gender"),
        "careof": parsed.get("careof"),
        "house": parsed.get("house"),
        "street": parsed.get("street"),
        "landmark": parsed.get("landmark"),
        "location": parsed.get("location"),
        "vtc": parsed.get("vtc"),
        "district": parsed.get("district"),
        "subdistrict": parsed.get("subdistrict"),
        "state": parsed.get("state"),
        "pincode": parsed.get("pincode"),
        "postoffice": parsed.get("postoffice"),
        "aadhaar_last_4_digits": parsed.get("aadhaar_last_4_digit"),
        "last_4_digits_mobile_no": parsed.get("last_4_digits_mobile_no"),
        "email_registered": parsed.get("email"),
        "mobile_registered": parsed.get("mobile"),
    }

    photo_base64 = None
    if photo_bytes:
        photo_base64 = f"data:image/jpeg;base64,{base64.b64encode(photo_bytes).decode('utf-8')}"

    return {
        "success": True,
        "qr_type": parsed.pop("_qr_type", None),
        "has_embedded_photo": parsed.pop("_has_photo", False),
        "photo_base64": photo_base64,
        "signature_verification": signature_report,
        "ground_truth": {
            "name": fields.get("name"),
            "dob": fields.get("dob"),
            "dob_iso": fields.get("dob_iso"),
            "gender": fields.get("gender"),
            "careof": fields.get("careof"),
            "house": fields.get("house"),
            "street": fields.get("street"),
            "landmark": fields.get("landmark"),
            "location": fields.get("location"),
            "vtc": fields.get("vtc"),
            "district": fields.get("district"),
            "state": fields.get("state"),
            "pincode": fields.get("pincode"),
            "aadhaar_last_4": fields.get("aadhaar_last_4_digits"),
            "mobile_last_4": fields.get("last_4_digits_mobile_no")[-4:] if fields.get("last_4_digits_mobile_no") else None,
        },
        "fields": fields,
    }
