import cv2
import numpy as np
from typing import Tuple, Optional, List, Any
from .models import QRResult

class QRScanner:
    """
    OpenCV-based QR detection and decoding module with multi-scale contrast passes.
    Supports detecting QR presence and extracting decoded payload when available.
    """

    def __init__(self):
        self.detector = cv2.QRCodeDetector()

    def scan(self, image: np.ndarray) -> QRResult:
        h, w = image.shape[:2]
        
        # Candidate regions: Full image, and Right 50% (standard Indian PAN layout for QR)
        candidates = [
            image[:, int(w * 0.45):],
            image,
        ]

        # Multi-scale passes
        for cand in candidates:
            for scale in [1.0, 1.5, 2.0, 2.5]:
                scaled = cv2.resize(cand, None, fx=scale, fy=scale) if scale != 1.0 else cand
                
                # First try full decode
                val, points, _ = self.detector.detectAndDecode(scaled)
                if val and val.strip():
                    pts = points[0].tolist() if points is not None and hasattr(points, 'tolist') else None
                    return QRResult(
                        detected=True,
                        payload=val.strip(),
                        raw_payload=val.strip(),
                        confidence=1.0,
                        status="DECODED",
                        polygon=pts
                    )
                
                # If decode didn't yield text, check structural detection
                has_qr, pts_detect = self.detector.detect(scaled)
                if has_qr and pts_detect is not None and len(pts_detect) > 0:
                    pts = pts_detect[0].tolist() if hasattr(pts_detect, 'tolist') else None
                    return QRResult(
                        detected=True,
                        payload=None,
                        raw_payload=None,
                        confidence=0.85,
                        status="DETECTED_NOT_DECODED",
                        polygon=pts
                    )

        return QRResult(
            detected=False,
            payload=None,
            raw_payload=None,
            confidence=0.0,
            status="NOT_DETECTED"
        )

