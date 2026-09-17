# VeriForge — Hackingly PS-003 AI Identity & Eligibility Verification

**AI Build Challenge — Bengaluru · 18 September 2026**  
**Industry Partner:** Hackingly · Presented by Masters' Union Ventures  

VeriForge is a streamlined, high-efficiency verification layer designed to extend Hackingly's registration flow. It transforms raw ID document photos into verified eligibility decisions (`APPROVE`, `MANUAL_REVIEW`, or `REJECT`) with auditable evidence, tamper screening, duplicate ID prevention, and biometric face verification.

---

## 🏗️ Repository Architecture

VeriForge is strictly partitioned into two simple, decoupled applications:

```text
Slayers/
├── backend/                  # FastAPI + Python 3.12 application
│   ├── app/
│   │   ├── main.py           # Verification API endpoints, CORS, file upload handling
│   │   ├── config.py         # App settings & AWS / Supabase environment configs
│   │   ├── db.py             # SQLite audit database & registration repository
│   │   └── services/
│   │       ├── ocr.py        # AWS Textract Queries + robust local fallback
│   │       ├── forensics.py  # Blur (Laplacian var), ELA JPEG anomaly, QR decoding, pHash
│   │       ├── duplicate.py  # HMAC-SHA256 ID fingerprinting & image reuse detection
│   │       ├── face.py       # Rekognition CompareFaces & biometric verification
│   │       └── decision.py   # Multi-gate evidence fusion & policy decision engine
│   ├── static/demos/         # Pre-generated benchmark synthetic ID cards
│   ├── scripts/
│   │   ├── generate_demo_assets.py  # Generates test cards with valid QR payloads
│   │   └── smoke_test.py            # Automated end-to-end integration test suite
│   └── requirements.txt
│
├── frontend/                 # Next.js 16 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx      # Verification Lab, Organizer Queue & Architecture View
│   │   │   └── layout.tsx    # Dark theme layout and metadata
│   │   └── lib/
│   │       └── supabase.ts   # Supabase client & TypeScript data models
│   └── .env.local            # Supabase credentials & API URL
│
├── .env.example              # Reference environment variables
└── README.md
```

---

## ⚡ Quick Start

### 1. Backend Setup (FastAPI + Python)

```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Regenerate synthetic demo assets
python scripts/generate_demo_assets.py

# Start the backend server (runs on port 8000)
uvicorn app.main:app --reload --port 8000
```

Backend OpenAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)  
Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Frontend Setup (Next.js + TypeScript)

```bash
cd frontend

# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Smoke Tests

Run the full end-to-end test suite verifying all 5 core scenarios:

```bash
PYTHONPATH=backend backend/.venv/bin/python3 backend/scripts/smoke_test.py
```

Expected output:
- `valid` ➔ `APPROVE` (Confidence > 95%)
- `edited` ➔ `REJECT` (Catches QR payload mismatch & ELA anomaly)
- `blurry` ➔ `MANUAL_REVIEW` (Flags unreadable image without false fraud rejection)
- `underage` ➔ `REJECT` (Participant age < 18)
- `duplicate` ➔ `REJECT` (Flags `EXACT_ID_DUPLICATE` & `NAME_MISMATCH`)
- `manual_review` ➔ `APPROVED` (Organizer override with audit notes)

---

## 🛡️ Multi-Gate Evidence Matrix

1. **AWS Textract OCR**: Extracts Name, Date of Birth, ID Number, ID Type, and Institution.
2. **Age Eligibility**: Compares calculated age against the event's minimum age requirement.
3. **Image Sharpness & Blur**: Evaluates Laplacian variance to catch low-quality uploads.
4. **ELA Forensic Screen**: Analyzes JPEG recompression error levels to flag digital splicing.
5. **QR Code Cross-Check**: Decodes machine-readable QR payloads and compares against printed fields.
6. **Name Consistency**: Uses fuzzy token matching between registration and document.
7. **Duplicate Prevention**: Computes HMAC-SHA256 of normalized IDs and checks visual pHash reuse.
8. **Biometric Face Match**: Compares selfie with document portrait (AWS Rekognition / local detector).

---

## ☁️ Supabase Cloud Integration

Configured in `frontend/.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL=https://rodczqujbkduouvsynze.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_hnd2oxY1TeqdnGUAEZ-qzQ_PuBpmqQ5`

Cloud table `veriforge_registrations` is provisioned with Row Level Security (RLS) for real-time audit sync.
