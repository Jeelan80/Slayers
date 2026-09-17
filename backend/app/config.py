import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "VeriForge"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(BASE_DIR / "data" / "veriforge.db"))
    ID_HASH_SECRET: str = os.getenv("ID_HASH_SECRET", "veriforge-secret-key-ps003-bengaluru")
    
    # AWS configuration for Textract & Rekognition
    AWS_TEXTRACT_ENABLED: bool = os.getenv("AWS_TEXTRACT_ENABLED", "false").lower() == "true"
    AWS_REKOGNITION_ENABLED: bool = os.getenv("AWS_REKOGNITION_ENABLED", "false").lower() == "true"
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
    AWS_ACCESS_KEY_ID: str | None = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY: str | None = os.getenv("AWS_SECRET_ACCESS_KEY")
    
    # Demo Assets Directory
    DEMO_ASSETS_DIR: str = str(BASE_DIR / "static" / "demos")

settings = Settings()
