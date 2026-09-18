# VeriForge Backend Server & Environment Survey Report

**Date**: 2026-09-18  
**Investigator**: `explorer_survey_1` (Backend Server & Environment Explorer)  
**Target Application**: VeriForge Backend (FastAPI + SQLite3 + OpenCV/PyZbar/PIL)  
**Root Path**: `H:\Projects\Hackingly\team-slayers-hackingly\backend`  

---

## 1. Executive Summary

VeriForge's backend is a production-ready FastAPI application located in `backend/app/main.py`. It provides a multi-gate multimodal identity and eligibility verification engine designed for hackathons and academic events (Hackingly PS-003). 

Key architectural highlights:
- **Zero Heavy External Dependencies Required for Demo**: Uses an offline, high-accuracy `LOCAL_DEMO` fallback engine for OCR and facial recognition when AWS Textract and Rekognition credentials are not provided.
- **Python Runtime**: Fully compatible and tested on **Python 3.13.1** (`C:\Python313\python.exe`). All runtime packages (`fastapi`, `uvicorn`, `python-multipart`, `pillow`, `opencv-python`, `numpy`, `pyzbar`, `qrcode`, `httpx`, `pytest`) are installed and verified.
- **Database Architecture**: Serverless SQLite3 database stored by default at `backend/data/veriforge.db`, featuring automatic zero-migration schema initialization, HMAC-SHA-256 fingerprinting, and audit logging.
- **End-to-End Verification Status**: 100% of the test suite (19 unit/integration tests in `tests/test_verification.py` and 5 multi-scenario tests in `scripts/smoke_test.py`) pass without errors.
- **Live Server Test**: Tested live on `http://127.0.0.1:8000` via Uvicorn; `GET /api/health` responded with `HTTP 200 OK` in < 20ms and `POST /api/verify` successfully passed genuine collegiate ID verification with 94.4% confidence (`APPROVE`).

---

## 2. Python Environment, Dependencies & Entry Points

### 2.1 Python Runtime
- **System Binary**: `C:\Python313\python.exe` (Python 3.13.1, 64-bit on Windows)
- **Launcher**: `py.exe` and `python.exe` both resolve to Python 3.13.1
- **Package Installer / Runner**: `uv.exe` is also installed at `C:\Users\jeela\.local\bin\uv.exe`
- **Virtual Environment**: No isolated `.venv` folder is present or required; all project dependencies are already present in the primary Python 3.13 site-packages.

### 2.2 Dependency Audit (`backend/requirements.txt` vs Installed)

| Package | `requirements.txt` Spec | Installed Version | Status / Role |
| :--- | :--- | :--- | :--- |
| `fastapi` | `>=0.115.0,<1` | `0.141.1` | Core REST API framework |
| `uvicorn[standard]` | `>=0.30.0,<1` | `0.52.4` | ASGI Web Server |
| `python-multipart` | `>=0.0.9` | `0.0.32` | Form-data / file upload parsing |
| `pillow` | `>=10.0.0` | `11.3.0` | Image processing & ELA calculations |
| `opencv-python` / `headless` | `>=4.8.0` | `4.12.0.88` | Laplacian blur, QR detection, Haar cascade |
| `numpy` | `>=1.26.0` | `2.2.6` | Numerical arrays for image forensics |
| `python-dateutil` | `>=2.9.0` | `2.9.0.post0` | Flexible ISO / formatted date parsing |
| `qrcode` | `>=7.4` | `8.2` | Synthetic QR card generation |
| `pyzbar` | `>=0.1.9` | `0.1.9` | Primary barcode/QR decoder |
| `httpx` | `>=0.27.0` | `0.28.1` | Fast async HTTP client & test client |
| `pytest` | `>=8.0.0` | `9.1.1` | Test framework |
| `boto3` | `>=1.34.0` | *Not installed* | **Optional AWS client**. Code conditionally imports `boto3` inside functions only when `AWS_TEXTRACT_ENABLED=true` or `AWS_REKOGNITION_ENABLED=true`. Defaults to offline fallback. |

### 2.3 Application Entry Points
1. **FastAPI Application**:
   - File: `H:\Projects\Hackingly\team-slayers-hackingly\backend\app\main.py`
   - Instance: `app = FastAPI(...)` (line 36)
   - Module Path from `backend/`: `app.main:app`
   - Module Path from Root: `app.main:app --app-dir backend`
2. **Synthetic Card Generator**:
   - File: `H:\Projects\Hackingly\team-slayers-hackingly\backend\scripts\generate_demo_samples.py`
   - Generates test ID images with machine QR codes into `app/static/samples/` and `static/demos/`.
3. **Integration Smoke Test**:
   - File: `H:\Projects\Hackingly\team-slayers-hackingly\backend\scripts\smoke_test.py`
   - Exercises health, samples, DigiLocker academic registry, DB reset, 4 attack vectors, Sybil reuse, and organizer review.
4. **Pytest Verification Suite**:
   - File: `H:\Projects\Hackingly\team-slayers-hackingly\backend\tests\test_verification.py`
   - 19 automated tests covering unit forensics, QR 3-way cross-validation, and API endpoints.

---

## 3. Server Launch & Network Configuration

### 3.1 Launch Commands

#### Running from `backend/` directory (Recommended):
```powershell
cd H:\Projects\Hackingly\team-slayers-hackingly\backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Running from Project Root:
```powershell
cd H:\Projects\Hackingly\team-slayers-hackingly
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

### 3.2 Network Binding & CORS
- **Host**: `0.0.0.0` (binds to all network interfaces, allowing local connections via `http://localhost:8000`, `http://127.0.0.1:8000`, and local LAN).
- **Port**: `8000`.
- **CORS Configuration** (`backend/app/main.py:43-49`):
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
  Permits unrestricted cross-origin requests from the Next.js frontend running on `http://localhost:3000`.

### 3.3 Static File Mounts
- `/static/samples` mounts `backend/app/static/samples/` (serves benchmark ID images).
- `/static/demos` mounts `backend/static/demos/` (serves demo scenario cards).

---

## 4. Health Endpoint (`GET /api/health`)

### 4.1 Implementation
Defined in `backend/app/main.py`, lines 89–97:
```python
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "aws_textract_enabled": settings.AWS_TEXTRACT_ENABLED,
        "aws_rekognition_enabled": settings.AWS_REKOGNITION_ENABLED,
    }
```

### 4.2 Exact Response Structure
- **HTTP Status**: `200 OK`
- **Content-Type**: `application/json`
- **JSON Payload**:
  ```json
  {
    "status": "ok",
    "service": "VeriForge",
    "version": "0.1.0",
    "aws_textract_enabled": false,
    "aws_rekognition_enabled": false
  }
  ```

### 4.3 Acceptance Criteria
The health check is considered **PASSED** if:
1. HTTP status code is `200`.
2. The `status` field equals `"ok"`.
3. The `service` field equals `"VeriForge"`.

---

## 5. Database Architecture, Schema & Seeding

### 5.1 Configuration
- **Engine**: Embedded SQLite3 (`sqlite3` standard library).
- **Configuration Source**: `backend/app/config.py` line 13:
  ```python
  DATABASE_PATH: str = os.getenv("DATABASE_PATH", str(BASE_DIR / "data" / "veriforge.db"))
  ```
- **Physical File**: `H:\Projects\Hackingly\team-slayers-hackingly\backend\data\veriforge.db`.
- **Auto-Initialization**: `DB_FILE.parent.mkdir(parents=True, exist_ok=True)` ensures the directory exists before any connection.

### 5.2 Schema & Tables (`backend/app/db.py`)
Schema creation is fully idempotent via `CREATE TABLE IF NOT EXISTS` executed during `get_conn()`:

#### 1. `registrations` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Unique registration record ID |
| `name` | `TEXT NOT NULL` | Applicant name |
| `dob` | `TEXT` | Extracted / verified Date of Birth |
| `institution` | `TEXT` | Extracted / entered college or institution |
| `id_type` | `TEXT` | Document type (e.g., `COLLEGE_ID`) |
| `id_number_masked` | `TEXT` | Masked ID string (e.g. `AB****23`) |
| `id_fingerprint` | `TEXT` | HMAC-SHA-256 fingerprint for Sybil detection |
| `phash` | `TEXT` | 64-bit hex perceptual hash of ID card |
| `decision` | `TEXT` | `APPROVE`, `MANUAL_REVIEW`, or `REJECT` |
| `confidence` | `REAL` | Calibrated fusion confidence score (0.0 – 1.0) |
| `summary` | `TEXT` | Human-readable eligibility verdict |
| `reasons_json` | `TEXT` | JSON list of decision factors |
| `checks_json` | `TEXT` | Full structured multi-gate checks dictionary |
| `extracted_json` | `TEXT` | Extracted OCR fields dictionary |
| `status` | `TEXT DEFAULT 'PENDING'` | Organizer review state (`PENDING`, `APPROVED`, `REJECTED`) |
| `reviewer_notes` | `TEXT` | Manual auditor review notes |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | Submission timestamp |

Indexes:
- `idx_reg_id_fingerprint ON registrations(id_fingerprint)`
- `idx_reg_created_at ON registrations(created_at)`

#### 2. `audit_events` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Audit log record ID |
| `case_id` | `INTEGER` | Reference to `registrations.id` |
| `action` | `TEXT NOT NULL` | Event type (`REGISTRATION_EVALUATED`, `MANUAL_REVIEW_UPDATE`) |
| `details_json` | `TEXT` | JSON payload of event metadata |
| `created_at` | `TEXT DEFAULT CURRENT_TIMESTAMP` | Event timestamp |

### 5.3 Data Seeding & Mock Registries
- **Academic Depository (DigiLocker / NAD)**:
  Pre-configured in `backend/app/services/academic.py` via `MOCK_ACADEMIC_REGISTRY`:
  - `ABC20261023`: Rahul Kumar (ABC Institute of Tech) -> `ACTIVE` (Verified)
  - `TECH2024098`: Priya Patel (NIT Karnataka) -> `ACTIVE` (Verified)
  - `BLUR2026007`: Rahul Kumar (ABC Institute of Tech) -> `ACTIVE` (Verified)
  - `ALUM2021004`: Amitabh Roy (IIT Bombay) -> `GRADUATED` (Unverified / Expired)
  - `SUSP2025771`: Dev Sharma (Delhi Tech Univ) -> `SUSPENDED` (Hard Veto Rejection)
- **Demo Benchmark Cards**:
  Generated by `backend/scripts/generate_demo_samples.py`:
  - `genuine_college_id.png`: Valid card with matching QR payload.
  - `duplicate_id.png`: Identical card for testing Sybil duplicate detection.
  - `tampered_dob_id.png`: Card with spliced DOB (`2007-04-14`) vs QR (`2005-03-14`).
  - `blurry_id.png`: Gaussian blurred ID (Laplacian variance < 40) testing quality gating.
- **Database Reset**:
  Endpoint `POST /api/reset` clears both tables cleanly (`DELETE FROM registrations; DELETE FROM audit_events;`).

---

## 6. Complete API Endpoint Catalog

| Method | Endpoint | Description | Request Type | Key Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Service root metadata | URL | None |
| `GET` | `/api/health` | Service liveness & AWS status | URL | None |
| `GET` | `/api/samples` | Pre-generated demo cards & metadata | URL | None |
| `GET` | `/api/academic/verify` | Direct DigiLocker / NAD query | Query Params | `institution`, `roll_number`, `name` |
| `POST` | `/api/verify` | Main ID verification & forensics | `multipart/form-data` | `name`, `dob`, `id_number`, `institution`, `min_age`, `file`, `selfie` |
| `GET` | `/api/registrations` | List recent registrations | Query Params | `limit` (default: 50) |
| `GET` | `/api/registrations/{id}`| Fetch specific registration audit | URL Path | `reg_id` |
| `POST` | `/api/registrations/{id}/review` | Organizer audit status override | `multipart/form-data` | `status` (`APPROVED` \| `REJECTED`), `notes` |
| `POST` | `/api/reset` | Clear registrations and audit events | URL | None |

---

## 7. Verified Live Execution & Test Commands

All commands below have been tested and verified on Windows PowerShell in this environment:

### Step 1: Start Live Server (Background or Dedicated Terminal)
```powershell
cd H:\Projects\Hackingly\team-slayers-hackingly\backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Step 2: Test Health Endpoint
```powershell
curl.exe -i http://localhost:8000/api/health
```
**Observed Response**:
```http
HTTP/1.1 200 OK
content-type: application/json

{"status":"ok","service":"VeriForge","version":"0.1.0","aws_textract_enabled":false,"aws_rekognition_enabled":false}
```

### Step 3: Reset Database
```powershell
curl.exe -s -X POST http://localhost:8000/api/reset
```
**Observed Response**:
```json
{"status":"reset","message":"Demo database cleared successfully"}
```

### Step 4: Verify Genuine ID Card
```powershell
curl.exe -s -X POST http://localhost:8000/api/verify `
  -F "name=Rahul Kumar" `
  -F "dob=2005-03-14" `
  -F "id_number=ABC20261023" `
  -F "institution=ABC Institute of Technology" `
  -F "id_type=COLLEGE_ID" `
  -F "min_age=18" `
  -F "file=@app/static/samples/genuine_college_id.png"
```
**Observed Result**:
- `decision`: `"APPROVE"`
- `confidence`: `0.9437` (94.4%)
- `checks.qr.status`: `"CROSS_VALIDATED"`
- `checks.academic.status`: `"ACTIVE"`

### Step 5: Run Full Pytest Suite (19 Tests)
```powershell
cd H:\Projects\Hackingly\team-slayers-hackingly\backend
python -m pytest tests/ -v
```
**Observed Result**: `19 passed in 7.49s` (100% pass rate).

### Step 6: Run Full Integration Smoke Test
```powershell
cd H:\Projects\Hackingly\team-slayers-hackingly\backend
python scripts/smoke_test.py
```
**Observed Result**: `*** ALL VERIFORGE SMOKE TESTS PASSED! ***`
Covered:
- Valid card -> `APPROVE` (95.4%)
- Spliced DOB card -> `REJECT` (QR_OCR_MISMATCH)
- Gaussian blurry card -> `MANUAL_REVIEW` (False-positive quality gate)
- Underage DOB card -> `REJECT` (INELIGIBLE_AGE)
- Sybil reuse card under new name -> `REJECT` (EXACT_ID_DUPLICATE)
- Manual review override -> updates status to `APPROVED` with audit note.
