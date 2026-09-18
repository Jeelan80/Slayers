import cv2
import numpy as np
from typing import Tuple, Dict

class PANPreprocessor:
    """
    Forensic image pre-processing pipeline for Indian PAN cards:
    - Auto-rotation and landscape normalization
    - CLAHE adaptive contrast optimization
    - Bilateral noise filtering preserving edge sharpness
    - Multi-scale thresholding (Otsu + Adaptive Gaussian)
    """

    @staticmethod
    def auto_orient_and_load(image_path: str) -> np.ndarray:
        img = cv2.imread(image_path)
        if img is None:
            raise FileNotFoundError(f"Could not load image at {image_path}")
        
        h, w = img.shape[:2]
        # PAN cards are standard landscape (ID-1 format ~ 85.6mm x 54mm, ratio ~1.58)
        if h > w:
            # If vertical/portrait, rotate 90 degrees clockwise to check landscape
            rot_cw = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
            return rot_cw
        return img

    @staticmethod
    def get_enhanced_variants(image: np.ndarray) -> Dict[str, np.ndarray]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 1. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced_clahe = clahe.apply(gray)
        
        # 2. Bilateral Filter for noise smoothing while keeping sharp character edges
        bilateral = cv2.bilateralFilter(enhanced_clahe, 9, 75, 75)
        
        # 3. Otsu Binarization
        _, otsu = cv2.threshold(bilateral, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # 4. Adaptive Gaussian Thresholding
        adaptive = cv2.adaptiveThreshold(
            bilateral, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 6
        )

        return {
            "bgr": image,
            "gray": gray,
            "clahe": enhanced_clahe,
            "bilateral": bilateral,
            "otsu": otsu,
            "adaptive": adaptive,
        }
