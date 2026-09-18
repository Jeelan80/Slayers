import hashlib
import json
import os
from pathlib import Path
from typing import Dict, Any
from .models import VerificationOutput

OUTPUT_DIR = Path(__file__).resolve().parent / "output"

class PANStorage:
    """
    Persistence layer for saving structured PAN verification JSON records.
    """

    @staticmethod
    def compute_sha256(image_path: str) -> str:
        sha256 = hashlib.sha256()
        with open(image_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    @classmethod
    def save_output(cls, output: VerificationOutput, output_dir: Path = OUTPUT_DIR) -> str:
        """
        Saves VerificationOutput as structured JSON into output_dir/<image_hash>.json
        Returns the absolute filepath of the saved file.
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        target_path = output_dir / f"{output.image_hash}.json"
        temp_path = output_dir / f"{output.image_hash}.json.tmp"
        
        # Serialize to formatted JSON
        data = output.model_dump()
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        os.replace(temp_path, target_path)
        return str(target_path)
