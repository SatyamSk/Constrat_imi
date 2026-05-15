"""
News Aggregator — fetches articles, finds the canonical article URL, and an
image. Articles are NEVER dropped just because we couldn't find an image — the
UI falls back to a gradient placeholder.

Cron: vercel.json runs /api/news_aggregator daily at 05:00 UTC.

Env required:
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  CRON_SECRET                  (optional, recommended)
"""
from __future__ import annotations

import json
import os
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import quote_plus, urljoin, urlparse, urlunparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

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
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

NS = {
    "media":   "http://search.yahoo.com/mrss/",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc":      "http://purl.org/dc/elements/1.1/",
}

# ---------------------------------------------------------------------------
# Regex pool
# ---------------------------------------------------------------------------

IMG_TAG_RE = re.compile(r'<img[^>]+(?:data-src|src)=[\'"]([^\'"]+)[\'"]', re.I)
OG_IMAGE_RES = [
    re.compile(r'<meta[^>]+property=[\'"]og:image[\'"][^>]+content=[\'"]([^\'"]+)[\'"]', re.I),
    re.compile(r'<meta[^>]+content=[\'"]([^\'"]+)[\'"][^>]+property=[\'"]og:image[\'"]', re.I),
    re.compile(r'<meta[^>]+property=[\'"]og:image:secure_url[\'"][^>]+content=[\'"]([^\'"]+)[\'"]', re.I),
    re.compile(r'<meta[^>]+name=[\'"]twitter:image[\'"][^>]+content=[\'"]([^\'"]+)[\'"]', re.I),
    re.compile(r'<meta[^>]+content=[\'"]([^\'"]+)[\'"][^>]+name=[\'"]twitter:image[\'"]', re.I),
]
CANONICAL_RE = re.compile(r'<link[^>]+rel=[\'"]canonical[\'"][^>]+href=[\'"]([^\'"]+)[\'"]', re.I)
CANONICAL_RE_ALT = re.compile(r'<link[^>]+href=[\'"]([^\'"]+)[\'"][^>]+rel=[\'"]canonical[\'"]', re.I)
JSON_LD_IMG_RE = re.compile(r'"image"\s*:\s*"([^"]+)"', re.I)
JSON_LD_IMG_LIST_RE = re.compile(r'"image"\s*:\s*\[\s*"([^"]+)"', re.I)


# ---------------------------------------------------------------------------
# HTTP with redirect tracking
# ---------------------------------------------------------------------------

class _TrackingRedirectHandler(HTTPRedirectHandler):
    """Records the final URL after redirects so we can use it as canonical."""
    def __init__(self):
        super().__init__()
        self.final_url = None

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.final_url = newurl
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def http_get(url: str, timeout: int = 10, max_bytes: int = 524_288):
    """Fetch URL with redirect tracking. Returns (final_url, body_text)."""
    handler = _TrackingRedirectHandler()
    opener = build_opener(handler)
    req = Request(url, headers=UA_HEADERS)
    try:
        with opener.open(req, timeout=timeout) as resp:
            body = resp.read(max_bytes).decode("utf-8", errors="ignore")
            final = handler.final_url or resp.geturl() or url
            return final, body
    except Exception as e:
        # eslint -- print so it shows in vercel logs
        print(f"[news] http_get failed for {url[:80]}: {e}")
        return url, ""


# ---------------------------------------------------------------------------
# URL helpers
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


# Tracking / aggregator domains where the RSS <link> is just a redirect shim.
# We treat ANY redirect as fine; this list is for "definitely needs resolving"
# detection if we want to skip OG scrapes on shim URLs.
_TRACKER_HOSTS = {
    "news.google.com",
    "feedproxy.google.com",
    "feeds.feedburner.com",
    "click.linksynergy.com",
    "redirect.viglink.com",
    "trib.al",
    "bit.ly",
    "ow.ly",
}


def _is_tracker(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower()
        return any(host == t or host.endswith("." + t) for t in _TRACKER_HOSTS)
    except Exception:
        return False


def _strip_tracking_params(url: str) -> str:
    """Drop ?utm_*=... and similar marketing junk from a URL."""
    try:
        parts = urlparse(url)
        if not parts.query:
            return url
        kept = [
            kv for kv in parts.query.split("&")
            if kv and not kv.lower().startswith(
                ("utm_", "fbclid", "gclid", "mc_cid", "mc_eid", "ref=", "ref_src",
                 "source=", "from=", "_branch", "share_id", "share_app_id")
            )
        ]
        new_query = "&".join(kept)
        return urlunparse(parts._replace(query=new_query))
    except Exception:
        return url


# ---------------------------------------------------------------------------
# Image extraction from RSS XML item
# ---------------------------------------------------------------------------

def _image_from_item(item) -> str:
    enc = item.find("enclosure")
    if enc is not None:
        url = enc.attrib.get("url", "")
        if url and "image" in enc.attrib.get("type", "image/jpeg"):
            return _normalise(url)

    thumb = item.find("media:thumbnail", NS)
    if thumb is not None and thumb.attrib.get("url"):
        return _normalise(thumb.attrib["url"])

    for mc in item.findall("media:content", NS):
        if mc.attrib.get("medium", "image") == "image" and mc.attrib.get("url"):
            return _normalise(mc.attrib["url"])

    desc_el = item.find("description")
    if desc_el is not None and desc_el.text:
        m = IMG_TAG_RE.search(desc_el.text)
        if m:
            return _normalise(m.group(1))

    content_el = item.find("content:encoded", NS)
    if content_el is not None and content_el.text:
        m = IMG_TAG_RE.search(content_el.text)
        if m:
            return _normalise(m.group(1))

    return ""


def _image_from_html(html: str, base_url: str) -> str:
    """Pull og:image / twitter:image / JSON-LD image / first big <img>."""
    if not html:
        return ""
    for rx in OG_IMAGE_RES:
        m = rx.search(html)
        if m:
            return _normalise(m.group(1), base_url)
    # JSON-LD
    for rx in (JSON_LD_IMG_LIST_RE, JSON_LD_IMG_RE):
        m = rx.search(html)
        if m:
            return _normalise(m.group(1), base_url)
    # Fall back to the first reasonably large-looking img
    for m in IMG_TAG_RE.finditer(html):
        candidate = _normalise(m.group(1), base_url)
        low = candidate.lower()
        if any(x in low for x in ("logo", "favicon", "sprite", "icon", "1x1", "pixel")):
            continue
        if not candidate.startswith(("http://", "https://")):
            continue
        return candidate
    return ""


def _canonical_from_html(html: str, fallback: str) -> str:
    """Find <link rel='canonical'> or og:url. Falls back to the given URL."""
    if not html:
        return fallback
    for rx in (CANONICAL_RE, CANONICAL_RE_ALT):
        m = rx.search(html)
        if m:
            url = _normalise(m.group(1), fallback)
            if url.startswith(("http://", "https://")):
                return url
    og_url = re.search(
        r'<meta[^>]+property=[\'"]og:url[\'"][^>]+content=[\'"]([^\'"]+)[\'"]', html, re.I
    )
    if og_url:
        return _normalise(og_url.group(1), fallback)
    return fallback


# ---------------------------------------------------------------------------
# Image fallback by web search
# ---------------------------------------------------------------------------

def _validate_image(url: str) -> bool:
    """Cheap sanity check — file extension or HEAD content-type."""
    if not url or len(url) > 1000:
        return False
    if not url.lower().startswith(("http://", "https://")):
        return False
    low = url.lower().rsplit("?", 1)[0]
    if low.endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")):
        return True
    try:
        req = Request(url, headers=UA_HEADERS, method="HEAD")
        from urllib.request import urlopen
        with urlopen(req, timeout=3) as r:
            ct = (r.headers.get("Content-Type") or "").lower()
            return ct.startswith("image/")
    except Exception:
        return False


def _search_image_via_news(title: str) -> str:
    """
    Google News HTML SERP scrape. We pull the article cards' embedded image
    URLs (they're inline base-64 SVG or img src to Google's encrypted CDN).
    These work as hot-linked images and are stable.
    """
    if not title:
        return ""
    try:
        url = (
            "https://news.google.com/search?q="
            + quote_plus(title[:150])
            + "&hl=en-IN&gl=IN&ceid=IN:en"
        )
        _, html = http_get(url, timeout=8)
    except Exception:
        return ""

    # Google News uses <img src="https://news.google.com/api/attachments/..."> or
    # external image URLs from the article publishers.
    # Match both, prefer external publisher images.
    matches = re.findall(r'<img[^>]+src=[\'"]([^\'"]+)[\'"]', html or "")
    if not matches:
        return ""

    # First pass: prefer external publisher CDN images (more reliable than
    # Google's encrypted CDN which sometimes rejects hot-links).
    for m in matches[:30]:
        if not m.startswith(("http://", "https://")):
            continue
        low = m.lower()
        if "googleusercontent" in low or "google.com/api" in low:
            continue
        if any(x in low for x in ("logo", "favicon", "sprite", "icon", "1x1", "pixel", "gstatic")):
            continue
        if _validate_image(m):
            return m

    # Second pass: anything Google-hosted that's clearly an image.
    for m in matches[:30]:
        if not m.startswith(("http://", "https://")):
            continue
        low = m.lower()
        if any(x in low for x in ("logo", "favicon", "sprite", "icon", "1x1", "pixel")):
            continue
        if "googleusercontent" in low and (".jpg" in low or ".jpeg" in low or ".png" in low or ".webp" in low):
            return m

    return ""


def _search_image_wikipedia(title: str) -> str:
    """
    Wikipedia REST API page-image endpoint. Looks up the topic by name and
    returns its lead image. Useful for company/person stories — e.g. an
    article about Reliance Industries will get the Reliance logo.
    """
    if not title:
        return ""
    # Strip news-style decoration so we have a chance of matching a Wikipedia page.
    cleaned = re.sub(r"[^\w\s&-]", " ", title).strip()
    if len(cleaned) < 3:
        return ""

    try:
        from urllib.request import urlopen
        url = (
            "https://en.wikipedia.org/api/rest_v1/page/summary/"
            + quote_plus(cleaned[:120])
        )
        req = Request(url, headers={"User-Agent": UA_HEADERS["User-Agent"]})
        with urlopen(req, timeout=6) as r:
            data = json.loads(r.read().decode("utf-8"))
        # originalimage > thumbnail.
        for key in ("originalimage", "thumbnail"):
            img = data.get(key) or {}
            src = img.get("source") or ""
            if src and src.startswith("https://"):
                return src
    except Exception:
        pass
    return ""


def _search_web_image(title: str, source: str = "") -> str:
    """Tries Google News (best for current events) then Wikipedia (for evergreen)."""
    if not title:
        return ""
    img = _search_image_via_news(f"{title} {source}".strip()[:200])
    if img:
        return img
    # Wikipedia fallback — extract the main subject (first capitalised noun phrase)
    subject = _extract_subject(title)
    return _search_image_wikipedia(subject) if subject else ""


def _extract_subject(title: str) -> str:
    """
    Pull the main subject from a headline for Wikipedia lookup.
    e.g. "Reliance Retail posts 18% revenue growth..." → "Reliance Retail"
    """
    # First chunk of consecutive capitalised words.
    m = re.match(r"^([A-Z][\w&'-]*(?:\s+[A-Z][\w&'-]*){0,3})", title.strip())
    return m.group(1) if m else ""


# ---------------------------------------------------------------------------
# RSS fetching
# ---------------------------------------------------------------------------

def fetch_rss(feed_url: str):
    _, xml_text = http_get(feed_url, timeout=15)
    if not xml_text:
        return []
    try:
        root = ET.fromstring(xml_text)
    except Exception as e:
        print(f"[news] RSS parse error {feed_url}: {e}")
        return []

    items = []
    for item in root.iter("item"):
        title_el = item.find("title")
        link_el = item.find("link")
        desc_el = item.find("description")
        pub_el = item.find("pubDate")
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
# Per-article enrichment: resolve URL + find image
# ---------------------------------------------------------------------------

def enrich_article(article: dict) -> dict:
    """
    1. Resolve any redirects on the article URL so it points at the real piece.
    2. If we don't have an image yet, fetch the article page and grab og:image.
    3. If still no image, search the web by the article title.
    Mutates the dict in place; also returns it.
    """
    url = article.get("url", "")
    if not url:
        return article

    needs_resolve = _is_tracker(url) or not article.get("image_url")

    final_url = url
    html = ""
    if needs_resolve:
        # Single fetch resolves redirects AND gives us the HTML for OG scrape.
        final_url, html = http_get(url, timeout=10, max_bytes=262_144)

    # Prefer canonical URL from the page if available.
    if html:
        final_url = _canonical_from_html(html, final_url)

    article["url"] = _strip_tracking_params(final_url or url)

    # Image: RSS first, then OG, then web search.
    if not article.get("image_url"):
        article["image_url"] = _image_from_html(html, article["url"]) if html else ""

    if not article.get("image_url"):
        # OG scrape via HEAD won't work — fetch the page now if we haven't.
        if not html:
            _, html = http_get(article["url"], timeout=8, max_bytes=262_144)
            article["image_url"] = _image_from_html(html, article["url"])

    if not article.get("image_url"):
        article["image_url"] = _search_web_image(article["title"])

    return article


# ---------------------------------------------------------------------------
# Supabase upsert (dedupe on url)
# ---------------------------------------------------------------------------

def upsert_news(article, source, country) -> bool:
    if not (SUPABASE_URL and SUPABASE_KEY):
        return False
    if not article.get("url"):
        return False

    payload = {
        "title": article["title"][:500],
        "source": source,
        "topic": "India Focus",                # reclassified on first GD brief
        "summary_points": [],
        "url": article["url"],
        "ai_summary": _strip_html(article.get("description", ""))[:300],
        "country": country,
        "read_time": "2 min",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "image_url": article.get("image_url", ""),
        "gd_analysis": {},
    }

    from urllib.request import urlopen
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

        seen, kept, no_image = set(), 0, 0
        try:
            for feed in RSS_FEEDS:
                for it in fetch_rss(feed["url"]):
                    if not it.get("url") or it["url"] in seen:
                        continue
                    seen.add(it["url"])
                    enrich_article(it)
                    if not it.get("image_url"):
                        no_image += 1
                    if upsert_news(it, feed["source"], feed["country"]):
                        kept += 1

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "articles_kept": kept,
                "articles_without_image": no_image,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
