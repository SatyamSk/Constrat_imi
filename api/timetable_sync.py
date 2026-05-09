"""
Timetable Sync — Vercel Python Serverless Function
READ-ONLY access to Google Sheet. No modifications. No notifications to sheet owner.
Runs every 2 hours via Vercel Cron.
"""
import os
import json
import csv
import io
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from datetime import datetime

SHEET_ID = os.environ.get("TIMETABLE_SHEET_ID", "1e3UMC2TIHujnTBZLbfAJl4pxz3IRWiQ8")
GID = os.environ.get("TIMETABLE_GID", "619368696")
SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("VITE_SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def fetch_sheet_csv():
    """
    Fetch the Google Sheet as CSV using the public export URL.
    This is a READ-ONLY operation — identical to opening the sheet in a browser.
    Google does NOT notify sheet owners of CSV export requests.
    """
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    response = urlopen(req, timeout=30)
    return response.read().decode("utf-8")


def parse_timetable(csv_text):
    """Parse the CSV into structured timetable entries."""
    reader = csv.reader(io.StringIO(csv_text))
    rows = list(reader)
    
    if len(rows) < 2:
        return []
    
    # Try to detect header row and structure
    entries = []
    headers = [h.strip().lower() for h in rows[0]]
    
    for row in rows[1:]:
        if len(row) < 3:
            continue
        
        entry = {}
        for i, header in enumerate(headers):
            if i < len(row):
                entry[header] = row[i].strip()
        
        # Map common column names
        entries.append({
            "section": entry.get("section", entry.get("sec", "")),
            "day": entry.get("day", entry.get("date", "")),
            "slot": entry.get("slot", entry.get("time", entry.get("period", ""))),
            "course": entry.get("course", entry.get("subject", entry.get("name", ""))),
            "faculty": entry.get("faculty", entry.get("professor", entry.get("prof", ""))),
            "room": entry.get("room", entry.get("venue", entry.get("location", ""))),
        })
    
    return [e for e in entries if e["course"]]  # Filter empty entries


def upsert_to_supabase(entries):
    """Upsert timetable entries to Supabase. Detect changes for alerts."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"status": "skipped", "reason": "Supabase not configured"}
    
    import urllib.request
    
    # First, fetch existing entries
    fetch_url = f"{SUPABASE_URL}/rest/v1/timetable?select=*"
    req = urllib.request.Request(fetch_url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    
    try:
        resp = urllib.request.urlopen(req)
        existing = json.loads(resp.read().decode())
    except Exception:
        existing = []
    
    # Build lookup of existing entries
    existing_lookup = {}
    for e in existing:
        key = f"{e['section']}-{e['day']}-{e['slot']}"
        existing_lookup[key] = e
    
    changes = []
    now = datetime.utcnow().isoformat()
    
    for entry in entries:
        key = f"{entry['section']}-{entry['day']}-{entry['slot']}"
        old = existing_lookup.get(key)
        
        if old:
            # Check for changes
            if old["course"] != entry["course"]:
                changes.append({
                    "section": entry["section"],
                    "change_type": "course_change",
                    "title": f"Course changed for {entry['day']} {entry['slot']}",
                    "body": f"{old['course']} → {entry['course']}",
                    "detected_at": now,
                })
            if old["room"] != entry["room"] and entry["room"]:
                changes.append({
                    "section": entry["section"],
                    "change_type": "venue",
                    "title": f"Venue changed: {entry['course']}",
                    "body": f"{old['room']} → {entry['room']}",
                    "detected_at": now,
                })
            if old["faculty"] != entry["faculty"] and entry["faculty"]:
                changes.append({
                    "section": entry["section"],
                    "change_type": "faculty",
                    "title": f"Faculty change: {entry['course']}",
                    "body": f"{old['faculty']} → {entry['faculty']}",
                    "detected_at": now,
                })
    
    # Upsert all entries (delete old, insert new)
    if entries:
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
    
    # Insert alerts
    if changes:
        alert_url = f"{SUPABASE_URL}/rest/v1/timetable_alerts"
        alert_data = json.dumps(changes).encode()
        alert_req = urllib.request.Request(alert_url, data=alert_data, method="POST", headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        })
        try:
            urllib.request.urlopen(alert_req)
        except Exception:
            pass
    
    return {
        "status": "ok",
        "entries_synced": len(entries),
        "changes_detected": len(changes),
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            csv_text = fetch_sheet_csv()
            entries = parse_timetable(csv_text)
            result = upsert_to_supabase(entries)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
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
            }).encode())
