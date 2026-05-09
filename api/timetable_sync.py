"""
Timetable Sync — Vercel Python Serverless Function
Fetches timetable data via Google Apps Script proxy (deployed by user).
Falls back to direct CSV export if Apps Script URL not configured.
READ-ONLY. No modifications. No notifications.
"""
import os
import json
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from datetime import datetime

# Apps Script URL (deployed by user from their college Google account)
APPS_SCRIPT_URL = os.environ.get("TIMETABLE_APPS_SCRIPT_URL", "")

# Fallback: direct CSV export (only works for public sheets)
SHEET_ID = os.environ.get("TIMETABLE_SHEET_ID", "1e3UMC2TIHujnTBZLbfAJl4pxz3IRWiQ8")
GID = os.environ.get("TIMETABLE_GID", "619368696")

SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("VITE_SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def fetch_via_apps_script():
    """Fetch timetable via Google Apps Script proxy (works with private sheets)."""
    req = Request(APPS_SCRIPT_URL, headers={"User-Agent": "Mozilla/5.0"})
    response = urlopen(req, timeout=30)
    data = json.loads(response.read().decode("utf-8"))
    
    if not data.get("success"):
        raise Exception(data.get("error", "Apps Script returned error"))
    
    entries = []
    for row in data.get("rows", []):
        entry = {
            "section": row.get("section", row.get("sec", "")),
            "day": row.get("day", row.get("date", "")),
            "slot": row.get("slot", row.get("time", row.get("period", ""))),
            "course": row.get("course", row.get("subject", row.get("name", ""))),
            "faculty": row.get("faculty", row.get("professor", row.get("prof", ""))),
            "room": row.get("room", row.get("venue", row.get("location", ""))),
        }
        if entry["course"]:
            entries.append(entry)
    
    return entries


def fetch_via_csv():
    """Fetch from public mirror sheet with IMI timetable format."""
    import csv
    import io
    import re
    
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    response = urlopen(req, timeout=30)
    csv_text = response.read().decode("utf-8")
    
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    if len(rows) < 5:
        return []
    
    # Find the header row (contains "Date" or "Sec")
    header_idx = 0
    for i, row in enumerate(rows):
        joined = ",".join(row).lower()
        if "date" in joined and ("sec" in joined or "session" in joined):
            header_idx = i
            break
    
    headers = [h.strip().lower() for h in rows[header_idx]]
    
    # Find column indexes
    date_col = next((i for i, h in enumerate(headers) if "date" in h), 0)
    day_col = next((i for i, h in enumerate(headers) if "day" in h), 1)
    sec_col = next((i for i, h in enumerate(headers) if "sec" in h), 2)
    venue_col = next((i for i, h in enumerate(headers) if "venue" in h), 3)
    
    # Session columns (contain "session")
    session_cols = [(i, h) for i, h in enumerate(headers) if "session" in h]
    if not session_cols:
        # fallback: columns 4+ are sessions
        session_cols = [(i, f"session {i-3}") for i in range(4, min(len(headers), 10))]
    
    # Time slots from the row after headers
    time_row = rows[header_idx + 1] if header_idx + 1 < len(rows) else []
    
    entries = []
    current_date = ""
    current_day = ""
    
    for row in rows[header_idx + 2:]:
        if len(row) < 4:
            continue
        
        # Date/day may be empty (merged cells) - carry forward
        if row[date_col].strip():
            current_date = row[date_col].strip()
        if row[day_col].strip():
            current_day = row[day_col].strip()
        
        section = row[sec_col].strip() if sec_col < len(row) else ""
        venue = row[venue_col].strip() if venue_col < len(row) else ""
        
        if not section:
            continue
        
        for col_idx, col_name in session_cols:
            if col_idx >= len(row):
                continue
            cell = row[col_idx].strip()
            if not cell or cell.lower() in ("", "lunch break", "-", "—"):
                continue
            
            # Extract course and professor from cell
            # Format: "Course Name\n(Prof. Name)" or just "Course Name"
            lines = [l.strip() for l in cell.replace("\r", "").split("\n") if l.strip()]
            course = lines[0] if lines else cell
            faculty = ""
            for line in lines[1:]:
                if "prof" in line.lower() or "dr" in line.lower():
                    faculty = re.sub(r"[()]", "", line).strip()
                    break
            
            # Get time slot
            slot = time_row[col_idx].strip() if col_idx < len(time_row) else col_name
            
            entries.append({
                "section": section,
                "day": f"{current_date} {current_day}".strip(),
                "slot": slot,
                "course": course,
                "faculty": faculty,
                "room": venue,
            })
    
    return entries


def upsert_to_supabase(entries):
    """Upsert timetable entries to Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"status": "skipped", "reason": "Supabase not configured"}
    
    import urllib.request
    now = datetime.utcnow().isoformat()
    
    # Delete existing
    del_url = f"{SUPABASE_URL}/rest/v1/timetable?id=not.is.null"
    del_req = urllib.request.Request(del_url, method="DELETE", headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    try:
        urllib.request.urlopen(del_req)
    except Exception:
        pass
    
    # Insert new
    if entries:
        for entry in entries:
            entry["synced_at"] = now
        
        ins_url = f"{SUPABASE_URL}/rest/v1/timetable"
        ins_data = json.dumps(entries).encode()
        ins_req = urllib.request.Request(ins_url, data=ins_data, method="POST", headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        })
        try:
            urllib.request.urlopen(ins_req)
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    return {"status": "ok", "entries_synced": len(entries)}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Try Apps Script first, fall back to CSV
            if APPS_SCRIPT_URL:
                entries = fetch_via_apps_script()
                method = "apps_script"
            else:
                entries = fetch_via_csv()
                method = "csv_export"
            
            result = upsert_to_supabase(entries)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "method": method,
                "timestamp": datetime.utcnow().isoformat(),
                **result,
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": str(e),
                "hint": "If 401: set TIMETABLE_APPS_SCRIPT_URL env var. Deploy the Google Apps Script from docs/google_apps_script.js"
            }).encode())
