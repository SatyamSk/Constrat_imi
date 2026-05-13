"""
Case Submission Analyzer — GPT-4o (vision-capable) scoring.

POST /api/analyze_case
Headers:
  Authorization: Bearer <supabase-jwt>          (required)
  Content-Type:  application/json

Body:
{
  "case_id":      "<uuid of case_decks row, optional but recommended>",
  "case_prompt":  "<text of the case prompt the user is solving>",
  "title":        "<optional human title for this submission>",
  "answer_text":  "<typed answer, optional if image_url provided>",
  "image_url":    "<public URL or signed URL of a photo of the handwritten answer, optional>"
}

Response 200:
{
  "submission_id": "<uuid>",
  "score":         87,
  "framework":     "Profitability Tree",
  "clarity":       82,
  "approach":      90,
  "execution":     85,
  "feedback":      "...",
  "strengths":     ["...", "..."],
  "improvements":  ["...", "..."]
}

Env required:
  OPENAI_API_KEY                  (server-side OpenAI secret)
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY       (server-side, bypasses RLS for ranking updates)
  SUPABASE_ANON_KEY (optional)    (used to verify the user's JWT)
"""
import os
import json
import re
from http.server import BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("VITE_SUPABASE_URL")
    or ""
).rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY", os.environ.get("VITE_SUPABASE_ANON_KEY", "")
)

SYSTEM_PROMPT = """You are a senior consulting-case evaluator at a top MBB firm.
You evaluate the candidate's case answer (which may be typed or handwritten in an
attached image) against the given case prompt.

Score four dimensions on 0-100:
  - framework  : Did they use a recognised structure (Profitability Tree, 4Ps,
                 SWOT, Porter's 5 Forces, 3Cs, Value Chain, Ansoff, MECE issue
                 tree, etc.)? Is it appropriate for the prompt?
  - clarity    : Structure, readability, logical flow, signposting.
  - approach   : Analytical depth, hypothesis-driven thinking, MECE breakdown.
  - execution  : Concrete recommendations, numbers/estimates, prioritisation.

Then compute overall_score = round(framework*0.25 + clarity*0.20 + approach*0.35 + execution*0.20).

Be strict but fair. A blank or off-topic answer should score 0-15.
A well-structured, MBB-quality answer scores 80+.

Return STRICT JSON only, matching this schema exactly:
{
  "framework":      "<name of detected framework or 'Unstructured'>",
  "framework_score": 0-100,
  "clarity":        0-100,
  "approach":       0-100,
  "execution":      0-100,
  "overall_score":  0-100,
  "feedback":       "<2-4 sentence overall feedback>",
  "strengths":      ["...", "...", "..."],
  "improvements":   ["...", "...", "..."]
}
"""


def _json_response(handler, status, body):
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode("utf-8"))


def _verify_user(jwt: str):
    """
    Verify the Supabase JWT by hitting /auth/v1/user. Returns the user dict on
    success, or None on failure. This avoids us shipping a JWKS verifier here.
    """
    if not (SUPABASE_URL and SUPABASE_ANON_KEY and jwt):
        return None
    req = Request(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {jwt}",
        },
    )
    try:
        resp = urlopen(req, timeout=10)
        return json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError):
        return None


def _ensure_profile(user: dict):
    """
    Upsert a profile row for the authenticated user. Uses the service role
    key so it bypasses RLS. This handles the case where auth.users exists
    but public.profiles was wiped (e.g. nuclear reset).
    """
    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        return
    uid = user.get("id", "")
    email = user.get("email", "")
    name = (user.get("user_metadata") or {}).get("full_name", "")
    payload = {
        "id": uid,
        "email": email,
        "full_name": name or email.split("@")[0],
        "role": "member",
    }
    try:
        req = Request(
            f"{SUPABASE_URL}/rest/v1/profiles",
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            },
        )
        urlopen(req, timeout=10)
    except Exception:
        pass  # best-effort; profile may already exist


def _call_openai(case_prompt: str, answer_text: str, image_url: str):
    if not OPENAI_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")

    user_content = [
        {
            "type": "text",
            "text": (
                f"Case prompt:\n\"\"\"{case_prompt or '(no prompt provided)'}\"\"\"\n\n"
                f"Candidate's typed answer (may be empty if they uploaded an image):\n"
                f"\"\"\"{answer_text or '(none)'}\"\"\"\n\n"
                "Now score the answer per the system instructions."
            ),
        }
    ]
    if image_url:
        user_content.append({"type": "image_url", "image_url": {"url": image_url}})

    payload = {
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_tokens": 1500,
    }

    req = Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {OPENAI_KEY}",
            "Content-Type": "application/json",
        },
    )
    resp = urlopen(req, timeout=60)
    completion = json.loads(resp.read().decode("utf-8"))
    raw = completion["choices"][0]["message"]["content"]
    return json.loads(raw)


def _insert_submission(user_id: str, body: dict, analysis: dict):
    if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        raise RuntimeError("Supabase service role not configured")

    raw_case_id = body.get("case_id") or ""
    # Only accept valid UUIDs — fallback data uses "1", "2" etc. which aren't UUIDs
    case_id = raw_case_id if re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', raw_case_id, re.I) else None
    payload = {
        "user_id": user_id,
        "title": body.get("title")
        or f"Case Submission ({case_id or 'freeform'})",
        "answer": body.get("answer_text") or "(submitted as image)",
        "image_url": body.get("image_url") or "",
        "score": int(analysis.get("overall_score", 0)),
        "feedback": analysis.get("feedback", ""),
        "ai_analysis": {
            "framework": analysis.get("framework", "Unstructured"),
            "framework_score": int(analysis.get("framework_score", 0)),
            "clarity": int(analysis.get("clarity", 0)),
            "approach": int(analysis.get("approach", 0)),
            "execution": int(analysis.get("execution", 0)),
            "strengths": analysis.get("strengths", []),
            "improvements": analysis.get("improvements", []),
        },
    }
    if case_id:
        payload["case_id"] = case_id

    req = Request(
        f"{SUPABASE_URL}/rest/v1/case_submissions",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    resp = urlopen(req, timeout=15)
    rows = json.loads(resp.read().decode("utf-8"))
    return rows[0] if isinstance(rows, list) and rows else None


def _refresh_rankings(case_id):
    """
    Recompute case_rankings for a single case via the SQL RPC defined in
    migration 005. Best-effort: if the RPC isn't installed yet we silently skip.
    """
    if not case_id or not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
        return
    try:
        req = Request(
            f"{SUPABASE_URL}/rest/v1/rpc/refresh_case_rankings",
            data=json.dumps({"p_case_id": case_id}).encode("utf-8"),
            method="POST",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                "Content-Type": "application/json",
            },
        )
        urlopen(req, timeout=10)
    except Exception:
        pass


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers", "Authorization, Content-Type"
        )
        self.end_headers()

    def do_POST(self):
        try:
            auth_header = self.headers.get("Authorization", "")
            if not auth_header.lower().startswith("bearer "):
                return _json_response(
                    self, 401, {"error": "Missing Authorization bearer token"}
                )
            jwt = auth_header.split(" ", 1)[1].strip()
            user = _verify_user(jwt)
            if not user or "id" not in user:
                return _json_response(self, 401, {"error": "Invalid or expired session"})

            # Ensure profile exists (handles nuclear reset / first-time edge case)
            _ensure_profile(user)

            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length else b"{}"
            body = json.loads(raw.decode("utf-8") or "{}")

            if not (body.get("answer_text") or body.get("image_url")):
                return _json_response(
                    self,
                    400,
                    {"error": "Provide answer_text or image_url"},
                )

            analysis = _call_openai(
                case_prompt=body.get("case_prompt", ""),
                answer_text=body.get("answer_text", ""),
                image_url=body.get("image_url", ""),
            )

            submission = _insert_submission(user["id"], body, analysis)
            if not submission:
                return _json_response(self, 500, {"error": "Failed to save submission"})

            _refresh_rankings(body.get("case_id"))

            return _json_response(
                self,
                200,
                {
                    "submission_id": submission["id"],
                    "score": submission["score"],
                    **analysis,
                },
            )
        except HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:500]
            return _json_response(
                self,
                502,
                {"error": f"Upstream error ({e.code}): {detail}"},
            )
        except Exception as e:
            return _json_response(self, 500, {"error": str(e)})
