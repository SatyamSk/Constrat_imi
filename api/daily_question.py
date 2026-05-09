"""Daily Question Generator — GPT-powered, runs at 7AM IST."""
import os, json
from http.server import BaseHTTPRequestHandler
from datetime import datetime
from urllib.request import Request, urlopen

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("VITE_SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

TYPES = ["GUESTIMATE", "CASE", "INTERVIEW Q", "GD TOPIC"]
FUNCTIONS = ["Marketing", "Finance", "Operations", "Consulting", "HR", "Strategy"]

def generate_question():
    if not OPENAI_KEY:
        return None
    prompt = f"""Generate 1 unique daily practice question for MBA students preparing for consulting placements.
Pick one type from: {', '.join(TYPES)}
Pick one function from: {', '.join(FUNCTIONS)}
Pick difficulty: Easy, Medium, or Hard

Return JSON: {{"type": "...", "question": "...", "function": "...", "difficulty": "...", "source": "AI Generated"}}
Make questions India-specific, practical, and interview-realistic. Only return valid JSON."""
    
    data = json.dumps({"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "temperature": 0.9, "max_tokens": 500}).encode()
    req = Request("https://api.openai.com/v1/chat/completions", data=data, headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"})
    resp = urlopen(req, timeout=30)
    content = json.loads(resp.read().decode())["choices"][0]["message"]["content"].strip()
    if "```" in content: content = content.split("```")[1].lstrip("json\n")
    return json.loads(content)

def save_question(q):
    if not SUPABASE_URL or not SUPABASE_KEY or not q:
        return
    q["date_assigned"] = datetime.utcnow().strftime("%Y-%m-%d")
    data = json.dumps(q).encode()
    req = Request(f"{SUPABASE_URL}/rest/v1/practice_questions", data=data, method="POST", headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"})
    urlopen(req)

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            q = generate_question()
            if q: save_question(q)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "question": q}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
