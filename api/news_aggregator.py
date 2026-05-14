"""
News Aggregator — Vercel Python Serverless Function
Fetches RSS feeds, extracts thumbnails, generates GD-prep macro/micro analysis
with GPT, inserts to Supabase.

Cron schedule (see vercel.json):  0 5 * * *   (05:00 UTC ≈ 10:30 IST)

Env required:
  OPENAI_API_KEY                  Server-side OpenAI key
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY       Bypasses RLS for inserts
"""
from __future__ import annotations

import json
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import urljoin
from urllib.request import Request, urlopen

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("VITE_SUPABASE_URL")
    or ""
).rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Business-relevant RSS feeds
RSS_FEEDS = [
    {"url": "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
     "source": "Economic Times", "country": "IN"},
    {"url": "https://www.livemint.com/rss/companies",
     "source": "Mint", "country": "IN"},
    {"url": "https://www.business-standard.com/rss/latest.rss",
     "source": "Business Standard", "country": "IN"},
    {"url": "https://feeds.reuters.com/reuters/businessNews",
     "source": "Reuters", "country": "GLOBAL"},
]

TOPICS = [
    "Markets & Economy",
    "Policy & Regulation",
    "Startups & VC",
    "FMCG & Retail",
    "Consulting Industry",
    "Global Business",
    "India Focus",
    "Technology",
]

# Per-feed item cap (keeps cron cheap)
MAX_ITEMS_PER_FEED = 6

UA_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; ConstratBot/1.0; +https://constrat.app)"
    )
}

# Namespaces commonly used in RSS for media
NS = {
    "media": "http://search.yahoo.com/mrss/",
    "content": "http://purl.org/rss/1.0/modules/content/",
}


# ---------------------------------------------------------------------------
# Image extraction
# ---------------------------------------------------------------------------

IMG_TAG_RE = re.compile(r'<img[^>]+src=[\'"]([^\'"]+)[\'"]', re.IGNORECASE)
OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property=[\'"]og:image[\'"][^>]+content=[\'"]([^\'"]+)[\'"]',
    re.IGNORECASE,
)
OG_IMAGE_RE_ALT = re.compile(
    r'<meta[^>]+content=[\'"]([^\'"]+)[\'"][^>]+property=[\'"]og:image[\'"]',
    re.IGNORECASE,
)
TWITTER_IMAGE_RE = re.compile(
    r'<meta[^>]+name=[\'"]twitter:image[\'"][^>]+content=[\'"]([^\'"]+)[\'"]',
    re.IGNORECASE,
)


def _image_from_item(item) -> str:
    """Pull a thumbnail URL out of an RSS <item>, trying common patterns."""
    # <enclosure url="..." type="image/*"/>
    enc = item.find("enclosure")
    if enc is not None:
        url = enc.attrib.get("url", "")
        if url and "image" in enc.attrib.get("type", "image/jpeg"):
            return url

    # <media:thumbnail url="..."/>
    thumb = item.find("media:thumbnail", NS)
    if thumb is not None:
        url = thumb.attrib.get("url", "")
        if url:
            return url

    # <media:content url="..." medium="image"/>
    for mc in item.findall("media:content", NS):
        if mc.attrib.get("medium", "image") == "image":
            url = mc.attrib.get("url", "")
            if url:
                return url

    # First <img> tucked inside the description HTML
    desc_el = item.find("description")
    if desc_el is not None and desc_el.text:
        m = IMG_TAG_RE.search(desc_el.text)
        if m:
            return m.group(1)

    # <content:encoded> HTML body
    content_el = item.find("content:encoded", NS)
    if content_el is not None and content_el.text:
        m = IMG_TAG_RE.search(content_el.text)
        if m:
            return m.group(1)

    return ""


def _image_from_og(article_url: str) -> str:
    """Fallback: fetch the article and grab og:image / twitter:image."""
    if not article_url:
        return ""
    try:
        req = Request(article_url, headers=UA_HEADERS)
        # Limit body read to ~256KB — og tags are always in <head>.
        with urlopen(req, timeout=10) as resp:
            head = resp.read(262144).decode("utf-8", errors="ignore")
        for rx in (OG_IMAGE_RE, OG_IMAGE_RE_ALT, TWITTER_IMAGE_RE):
            m = rx.search(head)
            if m:
                url = m.group(1).strip()
                # Resolve relative URLs
                if url.startswith("//"):
                    return "https:" + url
                if url.startswith("/"):
                    return urljoin(article_url, url)
                return url
    except Exception:
        return ""
    return ""


# ---------------------------------------------------------------------------
# RSS fetch
# ---------------------------------------------------------------------------

def fetch_rss(feed_url: str):
    try:
        req = Request(feed_url, headers=UA_HEADERS)
        with urlopen(req, timeout=15) as resp:
            xml_text = resp.read().decode("utf-8", errors="ignore")
        root = ET.fromstring(xml_text)
    except Exception as e:
        print(f"[news] RSS fetch error for {feed_url}: {e}")
        return []

    items = []
    for item in root.iter("item"):
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description")
        pub_el = item.find("pubDate")

        if title_el is None or not title_el.text:
            continue

        url = (link_el.text or "").strip() if link_el is not None else ""
        image_url = _image_from_item(item)

        items.append({
            "title": title_el.text.strip(),
            "url": url,
            "description": (
                (desc_el.text or "").strip()[:500]
                if desc_el is not None and desc_el.text else ""
            ),
            "published": (pub_el.text or "").strip() if pub_el is not None else "",
            "image_url": image_url,
        })

    return items[:MAX_ITEMS_PER_FEED]


# ---------------------------------------------------------------------------
# GPT analysis: GD-prep macro/micro framing
# ---------------------------------------------------------------------------

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
- Lists must each have 2-4 items. Stakeholders must have exactly 3.
- Never invent statistics you didn't see in the headline/context. If unsure, leave key_stats empty.
- Be concrete and India-aware where the story is Indian.
- Output ONLY the JSON object, no commentary."""


def gd_brief_for(article) -> dict:
    """One GPT call per article → rich GD-prep JSON."""
    if not OPENAI_KEY:
        return {}

    user_prompt = (
        f"Headline: {article['title']}\n\n"
        f"Context (from RSS description, may be partial): "
        f"{article.get('description', '') or '(none)'}"
    )

    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": GD_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
        "max_tokens": 900,
    }

    try:
        req = Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {OPENAI_KEY}",
                "Content-Type": "application/json",
            },
        )
        with urlopen(req, timeout=30) as resp:
            completion = json.loads(resp.read().decode("utf-8"))
        return json.loads(completion["choices"][0]["message"]["content"])
    except Exception as e:
        print(f"[news] GPT brief error for '{article['title'][:60]}': {e}")
        return {}


# ---------------------------------------------------------------------------
# Supabase write (upsert by URL — see migration 006 unique index)
# ---------------------------------------------------------------------------

def upsert_news(article, source, country):
    if not (SUPABASE_URL and SUPABASE_KEY):
        return
    if not article.get("url"):
        # Without a URL we can't dedupe; skip to avoid duplicate rows.
        return

    brief = article.get("gd_analysis") or {}

    payload = {
        "title": article["title"][:500],
        "source": source,
        "topic": brief.get("topic") or "India Focus",
        "summary_points": brief.get("arguments_for", []),
        "url": article["url"],
        "ai_summary": brief.get("ai_summary", "") or article.get("description", "")[:300],
        "country": country,
        "read_time": "2 min",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "image_url": article.get("image_url", ""),
        "gd_analysis": brief,
    }

    # PostgREST upsert on the unique (url) index.
    req = Request(
        f"{SUPABASE_URL}/rest/v1/news?on_conflict=url",
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
    except Exception as e:
        print(f"[news] upsert error: {e}")


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Optional: if CRON_SECRET is set, require it as a bearer token.
        # Vercel cron sends `Authorization: Bearer $CRON_SECRET` automatically
        # when the env var exists on the project.
        cron_secret = os.environ.get("CRON_SECRET", "")
        if cron_secret:
            auth = self.headers.get("Authorization", "")
            if auth != f"Bearer {cron_secret}":
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "unauthorized"}).encode())
                return

        total = 0
        seen_urls = set()
        try:
            for feed in RSS_FEEDS:
                items = fetch_rss(feed["url"])
                for it in items:
                    if not it.get("url") or it["url"] in seen_urls:
                        continue
                    seen_urls.add(it["url"])

                    # Image fallback to OG if RSS didn't carry one
                    if not it.get("image_url"):
                        it["image_url"] = _image_from_og(it["url"])

                    # GD brief
                    it["gd_analysis"] = gd_brief_for(it)

                    upsert_news(it, feed["source"], feed["country"])
                    total += 1

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "articles_processed": total,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
