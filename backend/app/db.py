import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional
from .config import settings

DB_FILE = Path(settings.DATABASE_PATH)
DB_FILE.parent.mkdir(parents=True, exist_ok=True)

SCHEMA = """
CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    dob TEXT,
    institution TEXT,
    id_type TEXT,
    id_number_masked TEXT,
    id_fingerprint TEXT,
    phash TEXT,
    decision TEXT,
    confidence REAL,
    summary TEXT,
    reasons_json TEXT,
    checks_json TEXT,
    extracted_json TEXT,
    status TEXT DEFAULT 'PENDING',
    reviewer_notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reg_id_fingerprint ON registrations(id_fingerprint);
CREATE INDEX IF NOT EXISTS idx_reg_created_at ON registrations(created_at);

CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    action TEXT NOT NULL,
    details_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""


@contextmanager
def get_conn():
    conn = sqlite3.connect(str(DB_FILE))
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript(SCHEMA)
        yield conn
        conn.commit()
    finally:
        conn.close()


def find_by_id_fingerprint(fp: str) -> Optional[sqlite3.Row]:
    if not fp:
        return None
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM registrations WHERE id_fingerprint = ? ORDER BY id ASC LIMIT 1",
            (fp,),
        ).fetchone()


def list_phashes(limit: int = 500) -> List[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(
            "SELECT id, name, phash FROM registrations WHERE phash IS NOT NULL ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()


def insert_registration(**data) -> int:
    keys = [
        "name", "dob", "institution", "id_type", "id_number_masked",
        "id_fingerprint", "phash", "decision", "confidence",
        "summary", "reasons_json", "checks_json", "extracted_json",
        "status"
    ]
    values = [data.get(k) for k in keys]
    with get_conn() as conn:
        cur = conn.execute(
            f"INSERT INTO registrations ({','.join(keys)}) VALUES ({','.join('?' for _ in keys)})",
            values,
        )
        reg_id = cur.lastrowid
        # Log audit event
        conn.execute(
            "INSERT INTO audit_events (case_id, action, details_json) VALUES (?, ?, ?)",
            (reg_id, "REGISTRATION_EVALUATED", json.dumps({"decision": data.get("decision"), "confidence": data.get("confidence")}))
        )
        return reg_id


def get_registration(reg_id: int) -> Optional[Dict[str, Any]]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM registrations WHERE id = ?", (reg_id,)).fetchone()
        if not row:
            return None
        d = dict(row)
        for json_col in ("reasons_json", "checks_json", "extracted_json"):
            if d.get(json_col):
                try:
                    d[json_col.replace("_json", "")] = json.loads(d[json_col])
                except Exception:
                    pass
        return d


def update_registration_status(reg_id: int, status: str, notes: Optional[str] = None) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE registrations SET status = ?, reviewer_notes = ? WHERE id = ?",
            (status, notes, reg_id),
        )
        if cur.rowcount > 0:
            conn.execute(
                "INSERT INTO audit_events (case_id, action, details_json) VALUES (?, ?, ?)",
                (reg_id, "MANUAL_REVIEW_UPDATE", json.dumps({"status": status, "notes": notes}))
            )
            return True
        return False


def recent_registrations(limit: int = 50) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM registrations ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            for json_col in ("reasons_json", "checks_json", "extracted_json"):
                if d.get(json_col):
                    try:
                        d[json_col.replace("_json", "")] = json.loads(d[json_col])
                    except Exception:
                        pass
            result.append(d)
        return result


def reset_db():
    with get_conn() as conn:
        conn.execute("DELETE FROM registrations")
        conn.execute("DELETE FROM audit_events")
