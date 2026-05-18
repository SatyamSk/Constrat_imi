"""
Competitions Aggregator — keeps `public.competitions` populated with
upcoming case competitions (India + global) using GPT to surface
recurring contests with realistic windows.

Cron: weekly. See vercel.json.

The model returns a list of currently-recurring case competitions; we ground
its output to "this year" and dedupe against existing rows by `url`.

Env required:
  OPENAI_API_KEY
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  CRON_SECRET                  (optional)
"""
import json
import os
from datetime import date, datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.request import Request, urlopen

OPENAI_KEY    = os.environ.get("OPENAI_API_KEY", "")
SUPABASE_URL  = (os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL") or "").rstrip("/")
SUPABASE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
CRON_SECRET   = os.environ.get("CRON_SECRET", "")

SYSTEM = """You are a curator of business-school case competitions.
Return ONLY JSON. The user gives you today's date.

For TODAY, list 12-18 well-known, currently active or upcoming case
competitions globally that an Indian B-school student might enter
(MBA/PGDM/PGP). Include flagship Indian + global competitions.

Schema:
{
  "competitions": [
    {
      "name":              "<official competition name>",
      "host":              "<sponsor/company>",
      "organizer":         "<host institution or platform e.g. IIM A, HBS, Unstop>",
      "category":          "<one of: Case Competition | Consulting | Strategy | Marketing | Finance | Operations | Social Impact | Product | Sustainability>",
      "location":          "<city / Online / Hybrid>",
      "prize":             "<short prize line, e.g. 'INR 5L + PPI' or 'USD 10K'>",
      "registration_open": "<YYYY-MM-DD or empty>",
      "deadline_date":     "<YYYY-MM-DD, must be >= today>",
      "url":               "<official or aggregator URL>",
      "tag":               "<Live | Opening Soon | Closed>",
      "description":       "<1-2 sentence positioning>"
    }
  ]
}

Rules:
- All deadlines must be >= today and <= today + 120 days.
- If you only know a competition runs annually, place its deadline in the
  next plausible window for the current year/season.
- url is mandatory and must be the real official site if you know it.
- 'tag' = "Opening Soon" if registration opens > 7 days from today.
- Mix Indian and global. Include at least 5 Indian competitions."""


def _json(handler, status, body):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode())


def call_openai(today_iso):
    payload = {
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Today is {today_iso}."},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.4,
        "max_tokens": 2500,
    }
    req = Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENAI_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urlopen(req, timeout=60) as r:
        resp = json.loads(r.read().decode("utf-8"))
    parsed = json.loads(resp["choices"][0]["message"]["content"])
    return parsed.get("competitions", [])


def upsert(comp):
    if not (SUPABASE_URL and SUPABASE_KEY):
        return False
    if not comp.get("url") or not comp.get("name"):
        return False

    # Coerce dates / drop empties so PostgREST doesn't reject the row.
    payload = {
        "name":         comp.get("name", "")[:300],
        "host":         comp.get("host", "")[:200],
        "organizer":    comp.get("organizer", "")[:200] or "Unstop",
        "category":     comp.get("category", "Case Competition")[:80],
        "location":     comp.get("location", "")[:120],
        "prize":        comp.get("prize", "")[:200],
        "deadline_date":     comp.get("deadline_date") or None,
        "registration_open": comp.get("registration_open") or None,
        "url":          comp.get("url", "")[:500],
        "tag":          comp.get("tag") if comp.get("tag") in ("Live", "Opening Soon", "Closed") else "Live",
        "description":  comp.get("description", "")[:1000],
        "image_url":    comp.get("image_url", ""),
        "updated_at":   datetime.now(timezone.utc).isoformat(),
    }
    # Drop None values; PostgREST will keep defaults / NULL columns alone.
    payload = {k: v for k, v in payload.items() if v not in (None, "")}

    req = Request(
        f"{SUPABASE_URL}/rest/v1/competitions?on_conflict=url",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        urlopen(req, timeout=15)
        return True
    except Exception as e:
        print(f"[competitions] upsert error: {e}")
        return False


class handler(BaseHTTPRequestHandler):
    def do_GET(self):

        if not OPENAI_KEY:
            return _json(self, 500, {"error": "openai_not_configured"})

        try:
            today = date.today().isoformat()
            comps = call_openai(today)
            kept = 0
            for c in comps:
                # Filter out competitions whose deadline is already past.
                dl = c.get("deadline_date") or ""
                if dl and dl < today:
                    continue
                if upsert(c):
                    kept += 1
            return _json(self, 200, {
                "success": True,
                "kept": kept,
                "raw": len(comps),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            return _json(self, 500, {"error": str(e)})
