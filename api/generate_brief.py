"""
GD Brief Generator — on-demand, quota-gated.

POST /api/generate_brief
Headers:
  Authorization: Bearer <supabase-jwt>
Body:
  { "news_id": "<uuid>" }

Response 200:
  { "gd_analysis": {...} }       <-- the JSON now living on news.gd_analysis

Response 402:
  { "error": "quota_exceeded", "used": 3, "limit": 3, "tier": "free" }

Quotas (from public.check_quota):
  free → 3 briefs / rolling 24h
  pro  → 25 briefs / rolling 24h
"""
import os
import json
from http.server import BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError

OPENAI_KEY        = os.environ.get("OPENAI_API_KEY", "")
SUPABASE_URL      = (os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL") or "").rstrip("/")
SUPABASE_SERVICE  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON     = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY", "")

GD_SYSTEM_PROMPT = """You are a senior B-school case-prep coach. Given one news
headline + 1-paragraph context, produce a tight Group Discussion / Personal
Interview prep brief.

Return STRICT JSON with this exact schema:
{
  "topic":            "<one of: Markets & Economy | Policy & Regulation | Startups & VC | FMCG & Retail | Consulting Industry | Global Business | India Focus | Technology>",
  "ai_summary":       "<2-line summary aimed at MBA students, plain text, no markdown>",
  "macro_angle":      "<1-2 sentences: economy-wide / policy / global implication>",
  "micro_angle":      "<1-2 sentences: impact on a specific company, sector or consumer>",
  "arguments_for":    ["<short, GD-ready bullet>", "<...>", "<...>"],
  "arguments_against":["<short, GD-ready bullet>", "<...>", "<...>"],
  "stakeholders": [
    {"name":"<entity>", "impact":"<benefits|hurts and why, 1 line>"},
    {"name":"<entity>", "impact":"<...>"},
    {"name":"<entity>", "impact":"<...>"}
  ],
  "frameworks":       ["<applicable consulting framework>", "<...>"],
  "key_stats":        ["<concrete number with unit/context>", "<...>"],
  "related_concepts": ["<economic/business concept>", "<...>"]
}

Rules:
- Lists 2-4 items each. Stakeholders exactly 3.
- Never invent statistics not in the source.
- Be India-aware where the story is Indian.
- Output ONLY the JSON object."""


def _json(handler, status, body):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode("utf-8"))


def _verify_user(jwt):
    if not (SUPABASE_URL and SUPABASE_ANON and jwt):
        return None
    try:
        req = Request(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_ANON, "Authorization": f"Bearer {jwt}"},
        )
        with urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception:
        return None


def _check_quota(user_id, kind):
    """Returns dict with allowed/used/limit/tier from the SQL function."""
    req = Request(
        f"{SUPABASE_URL}/rest/v1/rpc/check_quota",
        data=json.dumps({"p_user_id": user_id, "p_kind": kind}).encode("utf-8"),
        method="POST",
        headers={
            "apikey": SUPABASE_SERVICE,
            "Authorization": f"Bearer {SUPABASE_SERVICE}",
            "Content-Type": "application/json",
        },
    )
    with urlopen(req, timeout=10) as r:
        rows = json.loads(r.read().decode("utf-8"))
    # PostgREST returns a list of rows for set-returning fns.
    return rows[0] if isinstance(rows, list) and rows else {}


def _log_usage(user_id, kind, ref_id=""):
    req = Request(
        f"{SUPABASE_URL}/rest/v1/usage_events",
        data=json.dumps({
            "user_id": user_id, "kind": kind, "ref_id": ref_id,
        }).encode("utf-8"),
        method="POST",
        headers={
            "apikey": SUPABASE_SERVICE,
            "Authorization": f"Bearer {SUPABASE_SERVICE}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    try:
        urlopen(req, timeout=10)
    except Exception as e:
        print(f"[brief] usage log failed: {e}")


def _fetch_news(news_id):
    req = Request(
        f"{SUPABASE_URL}/rest/v1/news?id=eq.{news_id}&select=id,title,ai_summary,gd_analysis",
        headers={"apikey": SUPABASE_SERVICE, "Authorization": f"Bearer {SUPABASE_SERVICE}"},
    )
    with urlopen(req, timeout=10) as r:
        rows = json.loads(r.read().decode("utf-8"))
    return rows[0] if rows else None


def _update_news(news_id, gd):
    payload = json.dumps({"gd_analysis": gd}).encode("utf-8")
    req = Request(
        f"{SUPABASE_URL}/rest/v1/news?id=eq.{news_id}",
        data=payload, method="PATCH",
        headers={
            "apikey": SUPABASE_SERVICE,
            "Authorization": f"Bearer {SUPABASE_SERVICE}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    urlopen(req, timeout=10)


def _call_openai(title, summary):
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": GD_SYSTEM_PROMPT},
            {"role": "user", "content": f"Headline: {title}\n\nContext: {summary or '(none)'}"},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 900,
    }
    req = Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
    )
    with urlopen(req, timeout=30) as r:
        completion = json.loads(r.read().decode("utf-8"))
    return json.loads(completion["choices"][0]["message"]["content"])


def _has_brief_content(g):
    if not isinstance(g, dict):
        return False
    return bool(
        g.get("macro_angle") or g.get("micro_angle")
        or g.get("arguments_for") or g.get("arguments_against")
        or g.get("stakeholders") or g.get("frameworks")
        or g.get("key_stats") or g.get("related_concepts")
    )


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            auth = self.headers.get("Authorization", "")
            if not auth.lower().startswith("bearer "):
                return _json(self, 401, {"error": "missing_auth"})
            user = _verify_user(auth.split(" ", 1)[1].strip())
            if not user or "id" not in user:
                return _json(self, 401, {"error": "invalid_session"})

            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads((self.rfile.read(length) if length else b"{}").decode("utf-8") or "{}")
            news_id = body.get("news_id", "").strip()
            if not news_id:
                return _json(self, 400, {"error": "news_id required"})

            row = _fetch_news(news_id)
            if not row:
                return _json(self, 404, {"error": "news_not_found"})

            # Cache hit: brief already generated by another user. Free!
            if _has_brief_content(row.get("gd_analysis")):
                return _json(self, 200, {
                    "gd_analysis": row["gd_analysis"],
                    "cached": True,
                })

            # Quota check.
            quota = _check_quota(user["id"], "gd_brief")
            if not quota.get("allowed", False):
                return _json(self, 402, {
                    "error": "quota_exceeded",
                    "used":  quota.get("used", 0),
                    "limit": quota.get("limit", 0),
                    "tier":  quota.get("tier", "free"),
                })

            if not OPENAI_KEY:
                return _json(self, 500, {"error": "openai_not_configured"})

            gd = _call_openai(row["title"], row.get("ai_summary", ""))
            _update_news(news_id, gd)
            _log_usage(user["id"], "gd_brief", news_id)

            return _json(self, 200, {
                "gd_analysis": gd,
                "cached": False,
                "used":  quota.get("used", 0) + 1,
                "limit": quota.get("limit", 0),
                "tier":  quota.get("tier", "free"),
            })
        except HTTPError as e:
            return _json(self, 502, {"error": f"upstream {e.code}",
                                     "detail": e.read().decode("utf-8", "replace")[:400]})
        except Exception as e:
            return _json(self, 500, {"error": str(e)})
