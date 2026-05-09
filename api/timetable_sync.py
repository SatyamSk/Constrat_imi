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
    """Fallback: fetch via direct CSV export (only works for public sheets)."""
    import csv
    import io
    
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    response = urlopen(req, timeout=30)
    csv_text = response.read().decode("utf-8")
    
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    if len(rows) < 2:
        return []
    
    headers = [h.strip().lower() for h in rows[0]]
    entries = []
    for row in rows[1:]:
        if len(row) < 3:
            continue
        entry = {}
        for i, header in enumerate(headers):
            if i < len(row):
                entry[header] = row[i].strip()
        entries.append({
            "section": entry.get("section", entry.get("sec", "")),
            "day": entry.get("day", entry.get("date", "")),
            "slot": entry.get("slot", entry.get("time", entry.get("period", ""))),
            "course": entry.get("course", entry.get("subject", entry.get("name", ""))),
            "faculty": entry.get("faculty", entry.get("professor", entry.get("prof", ""))),
            "room": entry.get("room", entry.get("venue", entry.get("location", ""))),
        })
    
    return [e for e in entries if e["course"]]


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
