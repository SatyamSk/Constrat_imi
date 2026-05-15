"""
News Aggregator — fetches articles + thumbnails. No images = no article.

GD briefs are NOT generated here anymore — they're generated on-demand by
/api/generate_brief when a user clicks "Generate GD brief" (quota-gated).

Cron: vercel.json runs /api/news_aggregator daily at 05:00 UTC.

Env required:
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  CRON_SECRET                     (optional, recommended)
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

SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("VITE_SUPABASE_URL")
    or ""
).rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
CRON_SECRET = os.environ.get("CRON_SECRET", "")

RSS_FEEDS = [
    {"url": "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
     "source": "Economic Times", "country": "IN"},
    {"url": "https://www.livemint.com/rss/companies",
     "source": "Mint", "country": "IN"},
    {"url": "https://www.business-standard.com/rss/latest.rss",
     "source": "Business Standard", "country": "IN"},
    {"url": "https://feeds.reuters.com/reuters/businessNews",
     "source": "Reuters", "country": "GLOBAL"},
    {"url": "https://www.thehindubusinessline.com/feeder/default.rss",
     "source": "Hindu Business Line", "country": "IN"},
]

MAX_ITEMS_PER_FEED = 8

UA_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; ConstratBot/1.0; +https://constrat.app)"
}

NS = {
    "media":   "http://search.yahoo.com/mrss/",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc":      "http://purl.org/dc/elements/1.1/",
}

IMG_TAG_RE = re.compile(r'<img[^>]+src=[\'"]([^\'"]+)[\'"]', re.IGNORECASE)
OG_IMAGE_RES = [
    re.compile(r'<meta[^>]+property=[\'"]og:image[\'"][^>]+content=[\'"]([^\'"]+)[\'"]', re.I),
    re.compile(r'<meta[^>]+content=[\'"]([^\'"]+)[\'"][^>]+property=[\'"]og:image[\'"]', re.I),
    re.compile(r'<meta[^>]+name=[\'"]twitter:image[\'"][^>]+content=[\'"]([^\'"]+)[\'"]', re.I),
    re.compile(r'<meta[^>]+content=[\'"]([^\'"]+)[\'"][^>]+name=[\'"]twitter:image[\'"]', re.I),
]


# ---------------------------------------------------------------------------
# Image extraction
# ---------------------------------------------------------------------------

def _normalise(url: str, base: str = "") -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("/") and base:
        return urljoin(base, url)
    return url


def _image_from_item(item) -> str:
    # <enclosure url="..." type="image/*"/>
    enc = item.find("enclosure")
    if enc is not None:
        url = enc.attrib.get("url", "")
        if url and "image" in enc.attrib.get("type", "image/jpeg"):
            return _normalise(url)

    # <media:thumbnail url="..."/>
    thumb = item.find("media:thumbnail", NS)
    if thumb is not None and thumb.attrib.get("url"):
        return _normalise(thumb.attrib["url"])

    # <media:content url="..." medium="image"/>
    for mc in item.findall("media:content", NS):
        if mc.attrib.get("medium", "image") == "image" and mc.attrib.get("url"):
            return _normalise(mc.attrib["url"])

    # <itunes:image>, <image>, etc. — first <img> in description / content
    for tag in ("description",):
        el = item.find(tag)
        if el is not None and el.text:
            m = IMG_TAG_RE.search(el.text)
            if m:
                return _normalise(m.group(1))

    content_el = item.find("content:encoded", NS)
    if content_el is not None and content_el.text:
        m = IMG_TAG_RE.search(content_el.text)
        if m:
            return _normalise(m.group(1))

    return ""


def _image_from_og(article_url: str) -> str:
    if not article_url:
        return ""
    try:
        req = Request(article_url, headers=UA_HEADERS)
        with urlopen(req, timeout=10) as resp:
            head = resp.read(262_144).decode("utf-8", errors="ignore")
    except Exception:
        return ""
    for rx in OG_IMAGE_RES:
        m = rx.search(head)
        if m:
            return _normalise(m.group(1), article_url)
    return ""


# ---------------------------------------------------------------------------
# Last-resort fallback: search the web for the article's title and pick an
# image from another news site that's covering the same story.
#
# Strategy: query Bing's image-search HTML SERP (no API key). We pull the
# first few `mediaurl=...` hits, validate each is a working image URL, and
# return the first valid one. If Bing rate-limits, DuckDuckGo is the backup.
# ---------------------------------------------------------------------------

BING_IMG_RE = re.compile(r'mediaurl=([^"&]+)', re.IGNORECASE)
DDG_IMG_RE  = re.compile(r'"image":"(https?://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"', re.IGNORECASE)


def _validate_image_url(url: str) -> bool:
    """HEAD the URL to confirm it returns an image content-type, max 3s."""
    if not url or len(url) > 1000:
        return False
    if not url.lower().startswith(("http://", "https://")):
        return False
    try:
        req = Request(url, headers=UA_HEADERS, method="HEAD")
        with urlopen(req, timeout=3) as r:
            ct = (r.headers.get("Content-Type") or "").lower()
            return ct.startswith("image/")
    except Exception:
        # Some CDNs reject HEAD. As long as it ends in an image extension,
        # accept it — broken URLs will fall through to the gradient on the UI.
        return url.lower().rsplit("?", 1)[0].endswith(
            (".jpg", ".jpeg", ".png", ".webp", ".gif")
        )


def _search_image_bing(query: str) -> str:
    """Bing image search SERP scrape. Returns a hot-linkable image URL or ''."""
    if not query:
        return ""
    try:
        from urllib.parse import quote_plus
        url = f"https://www.bing.com/images/search?q={quote_plus(query)}&form=HDRSC2&safesearch=strict"
        req = Request(url, headers=UA_HEADERS)
        with urlopen(req, timeout=8) as resp:
            html = resp.read(524_288).decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"[news] Bing image search error: {e}")
        return ""

    # First few mediaurl hits are usually the most relevant; try in order.
    from urllib.parse import unquote
    seen = set()
    for m in BING_IMG_RE.finditer(html):
        candidate = unquote(m.group(1))
        if candidate in seen:
            continue
        seen.add(candidate)
        # Skip favicon-y or tracking pixels
        low = candidate.lower()
        if any(x in low for x in ("favicon", "logo", "sprite", "pixel.gif", "1x1.gif")):
            continue
        if _validate_image_url(candidate):
            return candidate
        if len(seen) >= 8:
            break
    return ""


def _search_image_ddg(query: str) -> str:
    """DuckDuckGo image search backup. Two-step (token + JSON endpoint)."""
    if not query:
        return ""
    try:
        from urllib.parse import quote_plus
        # Step 1: get the vqd token
        token_req = Request(
            f"https://duckduckgo.com/?q={quote_plus(query)}&iax=images&ia=images",
            headers=UA_HEADERS,
        )
        with urlopen(token_req, timeout=6) as r:
            token_html = r.read(131_072).decode("utf-8", errors="ignore")
        vqd_m = re.search(r'vqd=([\d-]+)', token_html) or re.search(r'vqd="([\d-]+)"', token_html)
        if not vqd_m:
            return ""
        vqd = vqd_m.group(1)
        # Step 2: image JSON
        json_req = Request(
            f"https://duckduckgo.com/i.js?l=us-en&o=json&q={quote_plus(query)}&vqd={vqd}&f=,,,&p=1",
            headers={**UA_HEADERS, "Referer": "https://duckduckgo.com/"},
        )
        with urlopen(json_req, timeout=6) as r:
            data = json.loads(r.read().decode("utf-8", errors="ignore"))
        for result in (data.get("results") or [])[:8]:
            candidate = result.get("image") or ""
            if _validate_image_url(candidate):
                return candidate
    except Exception as e:
        print(f"[news] DDG image search error: {e}")
    return ""


def _search_web_image(title: str, source: str = "") -> str:
    """Tries Bing → DuckDuckGo. Adds the source name to bias toward relevant hits."""
    if not title:
        return ""
    # Short titles get garbage results; include the source for context.
    query = f"{title} {source}".strip()[:200]
    img = _search_image_bing(query)
    if img:
        return img
    return _search_image_ddg(query)


# ---------------------------------------------------------------------------
# Fetch RSS
# ---------------------------------------------------------------------------

def fetch_rss(feed_url: str):
    try:
        req = Request(feed_url, headers=UA_HEADERS)
        with urlopen(req, timeout=15) as resp:
            xml_text = resp.read().decode("utf-8", errors="ignore")
        root = ET.fromstring(xml_text)
    except Exception as e:
        print(f"[news] RSS error {feed_url}: {e}")
        return []

    items = []
    for item in root.iter("item"):
        title_el = item.find("title")
        link_el  = item.find("link")
        desc_el  = item.find("description")
        pub_el   = item.find("pubDate")
        if title_el is None or not title_el.text:
            continue

        items.append({
            "title": title_el.text.strip()[:500],
            "url": (link_el.text or "").strip() if link_el is not None else "",
            "description": (
                (desc_el.text or "").strip()[:600]
                if desc_el is not None and desc_el.text else ""
            ),
            "published": (pub_el.text or "").strip() if pub_el is not None else "",
            "image_url": _image_from_item(item),
        })
    return items[:MAX_ITEMS_PER_FEED]


# ---------------------------------------------------------------------------
# Upsert (image is mandatory: rows without one are dropped)
# ---------------------------------------------------------------------------

def upsert_news(article, source, country):
    if not (SUPABASE_URL and SUPABASE_KEY):
        return False
    if not article.get("url") or not article.get("image_url"):
        return False

    payload = {
        "title": article["title"][:500],
        "source": source,
        "topic": "India Focus",                # AI will reclassify on-demand
        "summary_points": [],
        "url": article["url"],
        "ai_summary": _strip_html(article.get("description", ""))[:300],
        "country": country,
        "read_time": "2 min",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "image_url": article["image_url"],
        "gd_analysis": {},
    }

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
        return True
    except Exception as e:
        print(f"[news] upsert error: {e}")
        return False


_HTML_RE = re.compile(r"<[^>]+>")
def _strip_html(s: str) -> str:
    return _HTML_RE.sub("", s or "").strip()


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if CRON_SECRET:
            auth = self.headers.get("Authorization", "")
            if auth != f"Bearer {CRON_SECRET}":
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "unauthorized"}).encode())
                return

        seen, kept, web_searched = set(), 0, 0
        try:
            for feed in RSS_FEEDS:
                for it in fetch_rss(feed["url"]):
                    if not it.get("url") or it["url"] in seen:
                        continue
                    seen.add(it["url"])

                    # Image fallback waterfall:
                    #   1. RSS metadata (already in it["image_url"] from fetch_rss)
                    #   2. OG-image scrape of the article URL
                    #   3. Web image search by article title → pull from another site
                    if not it.get("image_url"):
                        it["image_url"] = _image_from_og(it["url"])

                    if not it.get("image_url"):
                        it["image_url"] = _search_web_image(it["title"], feed["source"])
                        if it["image_url"]:
                            web_searched += 1

                    # Save the article either way — the UI shows a gradient
                    # placeholder when image_url is empty, so we never drop
                    # a story just because we couldn't find a picture.
                    if upsert_news(it, feed["source"], feed["country"]):
                        kept += 1

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "articles_kept": kept,
                "images_via_web_search": web_searched,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
