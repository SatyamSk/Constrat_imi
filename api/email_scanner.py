"""
Email Scanner — READ-ONLY IMAP EXAMINE mode.
Scans user's own inbox for PlaceComm emails. Zero footprint on placement systems.
"""
import os, json, imaplib, email
from email.header import decode_header
from http.server import BaseHTTPRequestHandler
from datetime import datetime
from urllib.request import Request, urlopen

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("VITE_SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
IMAP_HOST = os.environ.get("IMAP_HOST", "imap.gmail.com")
IMAP_EMAIL = os.environ.get("IMAP_EMAIL", "")
IMAP_PASSWORD = os.environ.get("IMAP_PASSWORD", "")

def scan_inbox():
    if not IMAP_EMAIL or not IMAP_PASSWORD:
        return []
    mail = imaplib.IMAP4_SSL(IMAP_HOST)
    mail.login(IMAP_EMAIL, IMAP_PASSWORD)
    mail.examine("INBOX")  # READ-ONLY mode
    _, mids = mail.search(None, '(FROM "placement" SINCE "01-May-2026")')
    results = []
    if mids[0]:
        for mid in mids[0].split()[-10:]:
            _, data = mail.fetch(mid, "(RFC822)")
            msg = email.message_from_bytes(data[0][1])
            subj = msg.get("Subject", "")
            if subj:
                d = decode_header(subj)
                subj = d[0][0].decode(d[0][1] or "utf-8", errors="ignore") if isinstance(d[0][0], bytes) else str(d[0][0])
            frm = msg.get("From", "")
            if "imi.edu" not in frm.lower():
                continue
            body = ""
            if msg.is_multipart():
                for p in msg.walk():
                    if p.get_content_type() == "text/plain":
                        pl = p.get_payload(decode=True)
                        if pl: body = pl.decode("utf-8", errors="ignore")[:1500]
                        break
            else:
                pl = msg.get_payload(decode=True)
                if pl: body = pl.decode("utf-8", errors="ignore")[:1500]
            results.append({"subject": subj, "from": frm, "body": body})
    mail.close()
    mail.logout()
    return results

def extract_deadlines(emails_data):
    if not OPENAI_KEY or not emails_data:
        return []
    texts = "\n---\n".join([f"Subject: {e['subject']}\nBody: {e['body'][:400]}" for e in emails_data])
    prompt = f"Extract deadlines from these PlaceComm emails. Return JSON array with title, description, deadline_date (YYYY-MM-DD), batch, relevance, urgency fields. Return [] if none.\n\n{texts}"
    data = json.dumps({"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "temperature": 0.2, "max_tokens": 1500}).encode()
    req = Request("https://api.openai.com/v1/chat/completions", data=data, headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"})
    try:
        resp = urlopen(req, timeout=30)
        content = json.loads(resp.read().decode())["choices"][0]["message"]["content"].strip()
        if "```" in content: content = content.split("```")[1].lstrip("json\n")
        return json.loads(content)
    except: return []

def save_deadlines(dls):
    if not SUPABASE_URL or not SUPABASE_KEY: return
    for dl in dls:
        data = json.dumps({"title": dl.get("title",""), "description": dl.get("description",""), "deadline_date": dl.get("deadline_date",""), "source": "PlaceComm", "batch": dl.get("batch","All"), "relevance": dl.get("relevance","All"), "urgency": dl.get("urgency","medium")}).encode()
        req = Request(f"{SUPABASE_URL}/rest/v1/deadlines", data=data, method="POST", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"})
        try: urlopen(req)
        except: pass

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            emails_data = scan_inbox()
            dls = extract_deadlines(emails_data)
            save_deadlines(dls)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "emails_scanned": len(emails_data), "deadlines": len(dls), "mode": "READ-ONLY"}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
