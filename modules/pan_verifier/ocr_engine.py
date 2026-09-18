import shutil
import cv2
import numpy as np
import pytesseract
from typing import Dict, List, Any

class OCREngine:
    """
    Robust OCR extraction interface utilizing Tesseract 5.5+
    Extracts word tokens with confidence scores and normalized bounding boxes.
    """

    def __init__(self):
        tess_bin = shutil.which("tesseract") or "/usr/local/bin/tesseract"
        pytesseract.pytesseract.tesseract_cmd = tess_bin

    def extract_tokens(self, image: np.ndarray, psm: int = 3) -> List[Dict[str, Any]]:
        data = pytesseract.image_to_data(
            image,
            config=f"--psm {psm} --oem 1",
            output_type=pytesseract.Output.DICT
        )
        tokens = []
        n_boxes = len(data["text"])
        h, w = image.shape[:2]

        for i in range(n_boxes):
            word = data["text"][i].strip()
            conf = float(data["conf"][i])
            if not word or conf < 0:
                continue

            tokens.append({
                "text": word,
                "confidence": conf / 100.0,
                "bbox": [
                    data["top"][i],
                    data["left"][i],
                    data["top"][i] + data["height"][i],
                    data["left"][i] + data["width"][i]
                ],
                "line_num": data["line_num"][i],
                "block_num": data["block_num"][i],
            })

        return tokens

    def image_to_string(self, image: np.ndarray, psm: int = 3, config: str = "") -> str:
        return pytesseract.image_to_string(image, config=f"--psm {psm} {config}")

    def extract_all(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Runs dual-pass OCR:
        1. Full image token parsing (PSM 3) for global bounding boxes.
        2. Demographic column parsing (PSM 6 on left 65%) for reliable line-sequential layout.
        """
        h, w = image.shape[:2]
        full_tokens = self.extract_tokens(image, psm=3)
        full_text = self.image_to_string(image, psm=3)
        
        # Demographic column (standard ID-1 PAN card puts Name, Father, DOB, PAN on left 65%)
        left_col = image[:, :int(w * 0.65)]
        left_text = self.image_to_string(left_col, psm=6)
        
        return {
            "full_text": full_text,
            "demographic_text": left_text,
            "tokens": full_tokens,
        }

