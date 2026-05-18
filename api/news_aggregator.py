"""
News Aggregator — fetches RSS feeds, extracts exact article URLs and
high-quality thumbnail images, filters by MBA/consulting relevance via GPT,
and upserts to Supabase.

Uses feedparser + requests + BeautifulSoup for robust extraction.

Cron: vercel.json runs /api/news_aggregator twice daily (05:00 & 14:00 UTC).
Admin can also trigger manually from /admin → News tab.

Env required:
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY                 (for GPT relevance filtering)
  CRON_SECRET                    (optional, recommended)
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, urlparse, urlunparse

import feedparser
import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SUPABASE_URL = (
    os.environ.get("SUPABASE_URL")
    or os.environ.get("VITE_SUPABASE_URL")
    or ""
).rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
CRON_SECRET = os.environ.get("CRON_SECRET", "")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# ---------------------------------------------------------------------------
# RSS Feed Sources — business, macro/micro economics, consulting
# ---------------------------------------------------------------------------

RSS_FEEDS = [
    # Indian business
    {"url": "https://economictimes.indiatimes.com/rssfeedsdefault.cms",
     "source": "Economic Times", "country": "IN"},
    {"url": "https://www.livemint.com/rss/companies",
     "source": "Mint", "country": "IN"},
    {"url": "https://www.business-standard.com/rss/latest.rss",
     "source": "Business Standard", "country": "IN"},
    {"url": "https://www.thehindubusinessline.com/feeder/default.rss",
     "source": "Hindu Business Line", "country": "IN"},
    # Global business
    {"url": "https://feeds.reuters.com/reuters/businessNews",
     "source": "Reuters", "country": "GLOBAL"},
    {"url": "https://feeds.reuters.com/reuters/topNews",
     "source": "Reuters Top", "country": "GLOBAL"},
    {"url": "https://news.google.com/rss/search?q=consulting+business+strategy&hl=en-IN&gl=IN&ceid=IN:en",
     "source": "Google News", "country": "GLOBAL"},
    {"url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
     "source": "NY Times", "country": "GLOBAL"},
]

MAX_ITEMS_PER_FEED = 15

# ---------------------------------------------------------------------------
# HTML / URL helpers
# ---------------------------------------------------------------------------

HTML_RE = re.compile(r"<[^>]+>")


def _strip_html(s: str) -> str:
    return HTML_RE.sub("", s or "").strip()


def _strip_tracking_params(url: str) -> str:
    """Drop ?utm_*=... and similar marketing junk from a URL."""
    try:
        parts = urlparse(url)
        if not parts.query:
            return url
        kept = [
            kv for kv in parts.query.split("&")
            if kv and not kv.lower().startswith(
                ("utm_", "fbclid", "gclid", "mc_cid", "mc_eid", "ref=",
                 "source=", "from=", "_branch", "share_id")
            )
        ]
        new_query = "&".join(kept)
        return urlunparse(parts._replace(query=new_query))
    except Exception:
        return url


# ---------------------------------------------------------------------------
# Thumbnail extraction from RSS entry (feedparser)
# ---------------------------------------------------------------------------

def extract_thumbnail(entry) -> str:
    """Extract image URL from RSS entry using multiple strategies."""

    # 1. media:content
    if hasattr(entry, "media_content"):
        for media in entry.media_content:
            url = media.get("url", "")
            if url:
                return url

    # 2. media:thumbnail
    if hasattr(entry, "media_thumbnail"):
        for thumb in entry.media_thumbnail:
            url = thumb.get("url", "")
            if url:
                return url

    # 3. enclosure (RSS 2.0)
    if hasattr(entry, "links"):
        for link in entry.links:
            if "image" in link.get("type", "") and link.get("href"):
                return link["href"]

    # 4. Image embedded in summary/description HTML
    summary = getattr(entry, "summary", "") or ""
    if summary:
        soup = BeautifulSoup(summary, "html.parser")
        img = soup.find("img")
        if img and img.get("src"):
            src = img["src"]
            if src.startswith(("http://", "https://")):
                return src

    # 5. content:encoded
    content = ""
    if hasattr(entry, "content"):
        for c in entry.content:
            content += c.get("value", "")
    if content:
        soup = BeautifulSoup(content, "html.parser")
        img = soup.find("img")
        if img and img.get("src"):
            src = img["src"]
            if src.startswith(("http://", "https://")):
                return src

    return ""


# ---------------------------------------------------------------------------
# OG image extraction from article page
# ---------------------------------------------------------------------------

def get_og_image(article_url: str) -> str:
    """Fetch the article page and extract og:image or twitter:image."""
    if not article_url:
        return ""
    try:
        resp = requests.get(article_url, headers=HEADERS, timeout=8,
                            allow_redirects=True)
        soup = BeautifulSoup(resp.text, "html.parser")

        # og:image
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"]

        # og:image:secure_url
        og_sec = soup.find("meta", property="og:image:secure_url")
        if og_sec and og_sec.get("content"):
            return og_sec["content"]

        # twitter:image
        twitter = soup.find("meta", attrs={"name": "twitter:image"})
        if twitter and twitter.get("content"):
            return twitter["content"]

        # JSON-LD image
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                ld = json.loads(script.string or "")
                img = ld.get("image")
                if isinstance(img, str) and img.startswith("http"):
                    return img
                if isinstance(img, list) and img:
                    return img[0] if isinstance(img[0], str) else img[0].get("url", "")
                if isinstance(img, dict):
                    return img.get("url", "")
            except Exception:
                continue

        # First large <img> on page (skip logos/icons)
        for img in soup.find_all("img", src=True):
            src = img["src"]
            low = src.lower()
            if any(x in low for x in ("logo", "favicon", "icon", "sprite", "1x1", "pixel", "avatar")):
                continue
            # Check for width/height hints
            w = img.get("width", "")
            h = img.get("height", "")
            if w and str(w).isdigit() and int(w) < 200:
                continue
            if h and str(h).isdigit() and int(h) < 100:
                continue
            if src.startswith(("http://", "https://")):
                return src
            if src.startswith("/"):
                return urljoin(article_url, src)

    except Exception as e:
        print(f"[news] og_image failed for {article_url[:60]}: {e}")

    return ""


# ---------------------------------------------------------------------------
# Resolve canonical URL from article page
# ---------------------------------------------------------------------------

def get_canonical_url(article_url: str, soup: BeautifulSoup = None) -> str:
    """Get the canonical URL from the page, or return the original."""
    if not article_url:
        return article_url
    try:
        if soup is None:
            resp = requests.get(article_url, headers=HEADERS, timeout=8,
                                allow_redirects=True)
            # The final URL after redirects IS the canonical
            final_url = resp.url
            soup = BeautifulSoup(resp.text, "html.parser")
        else:
            final_url = article_url

        # <link rel="canonical">
        canon = soup.find("link", rel="canonical")
        if canon and canon.get("href"):
            href = canon["href"]
            if href.startswith(("http://", "https://")):
                return _strip_tracking_params(href)

        # og:url
        og_url = soup.find("meta", property="og:url")
        if og_url and og_url.get("content"):
            content = og_url["content"]
            if content.startswith(("http://", "https://")):
                return _strip_tracking_params(content)

        return _strip_tracking_params(final_url)
    except Exception:
        return _strip_tracking_params(article_url)


# ---------------------------------------------------------------------------
# Process a single RSS entry — extract everything
# ---------------------------------------------------------------------------

def process_article(source: str, country: str, entry) -> dict | None:
    """Process one RSS entry: extract title, exact URL, thumbnail, summary."""
    try:
        title = getattr(entry, "title", "")
        if not title:
            return None

        article_url = getattr(entry, "link", "")
        if not article_url:
            return None

        # Get thumbnail from RSS
        thumbnail = extract_thumbnail(entry)

        # If no thumbnail from RSS, scrape the article page for og:image
        soup = None
        if not thumbnail and article_url:
            try:
                resp = requests.get(article_url, headers=HEADERS, timeout=8,
                                    allow_redirects=True)
                article_url = resp.url  # Follow redirects to real URL
                soup = BeautifulSoup(resp.text, "html.parser")

                # Extract OG image from parsed page
                og = soup.find("meta", property="og:image")
                if og and og.get("content"):
                    thumbnail = og["content"]

                if not thumbnail:
                    og_sec = soup.find("meta", property="og:image:secure_url")
                    if og_sec and og_sec.get("content"):
                        thumbnail = og_sec["content"]

                if not thumbnail:
                    twitter = soup.find("meta", attrs={"name": "twitter:image"})
                    if twitter and twitter.get("content"):
                        thumbnail = twitter["content"]

                # JSON-LD fallback
                if not thumbnail:
                    for script in soup.find_all("script", type="application/ld+json"):
                        try:
                            ld = json.loads(script.string or "")
                            img = ld.get("image")
                            if isinstance(img, str) and img.startswith("http"):
                                thumbnail = img
                                break
                            if isinstance(img, list) and img:
                                thumbnail = img[0] if isinstance(img[0], str) else img[0].get("url", "")
                                break
                        except Exception:
                            continue
            except Exception as e:
                print(f"[news] scrape failed {article_url[:60]}: {e}")

        # Resolve canonical URL
        if soup:
            canon = soup.find("link", rel="canonical")
            if canon and canon.get("href", "").startswith("http"):
                article_url = canon["href"]
            else:
                og_url = soup.find("meta", property="og:url")
                if og_url and og_url.get("content", "").startswith("http"):
                    article_url = og_url["content"]

        article_url = _strip_tracking_params(article_url)

        # Clean summary
        summary = _strip_html(
            getattr(entry, "summary", "")
            or getattr(entry, "description", "")
        )[:300]

        published = getattr(entry, "published", "") or ""

        return {
            "title": title.strip()[:500],
            "url": article_url,
            "description": summary,
            "published": published,
            "image_url": thumbnail or "",
            "_source": source,
            "_country": country,
        }

    except Exception as e:
        print(f"[news] process_article error: {e}")
        return None


# ---------------------------------------------------------------------------
# Fetch all RSS feeds
# ---------------------------------------------------------------------------

def fetch_all_feeds() -> list[dict]:
    """Fetch all RSS feeds and process articles with thread pooling."""
    all_articles = []
    seen_urls = set()
    seen_titles = set()

    for feed_cfg in RSS_FEEDS:
        source = feed_cfg["source"]
        country = feed_cfg["country"]
        rss_url = feed_cfg["url"]
        print(f"[news] Fetching {source}: {rss_url[:80]}")

        try:
            feed = feedparser.parse(rss_url)
            entries = feed.entries[:MAX_ITEMS_PER_FEED]

            # Process articles in parallel (5 threads per feed)
            with ThreadPoolExecutor(max_workers=5) as executor:
                results = list(executor.map(
                    lambda e: process_article(source, country, e),
                    entries,
                ))

            for article in results:
                if not article:
                    continue
                # Deduplicate by URL and title
                url_key = article["url"].rstrip("/").lower()
                title_key = article["title"].lower().strip()
                if url_key in seen_urls or title_key in seen_titles:
                    continue
                seen_urls.add(url_key)
                seen_titles.add(title_key)
                all_articles.append(article)

        except Exception as e:
            print(f"[news] Feed error {source}: {e}")

    print(f"[news] Total unique articles: {len(all_articles)}")
    return all_articles


# ---------------------------------------------------------------------------
# GPT relevance filter — scores headlines for MBA/consulting relevance
# ---------------------------------------------------------------------------

def gpt_filter_articles(articles: list[dict]) -> list[dict]:
    """
    Send a batch of headlines to GPT-4o-mini. Each gets a relevance score
    0-10 for MBA/consulting/business prep. Only articles scoring >= 5 kept.
    Falls back to keeping all articles if OpenAI errors.
    """
    if not OPENAI_KEY or not articles:
        return articles

    headlines = []
    for i, a in enumerate(articles):
        headlines.append(f"{i+1}. {a['title'][:200]}")

    prompt = (
        "You are a news curator for an MBA consulting prep platform (Constrat). "
        "Score each headline 0-10 for relevance to: business strategy, consulting "
        "case interviews, group discussions, market analysis, macroeconomics, "
        "microeconomics, industry trends, or MBA career prep.\n\n"
        "Headlines:\n" + "\n".join(headlines) + "\n\n"
        "Return ONLY a JSON array: [{\"index\": 1, \"score\": 8, \"topic\": \"Markets & Economy\"}, ...]\n"
        "Topics must be one of: Markets & Economy, Policy & Regulation, Startups & VC, "
        "FMCG & Retail, Consulting Industry, Global Business, India Focus, Technology\n"
        "No explanation, no markdown fences."
    )

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 2000,
            },
            timeout=45,
        )
        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Strip markdown fences
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        scores = json.loads(content)
        score_map = {}
        topic_map = {}
        for s in scores:
            if isinstance(s, dict):
                score_map[s.get("index")] = s.get("score", 5)
                topic_map[s.get("index")] = s.get("topic", "India Focus")

        filtered = []
        for i, a in enumerate(articles):
            relevance = score_map.get(i + 1, 5)
            if relevance >= 5:
                a["_relevance"] = relevance
                a["_topic"] = topic_map.get(i + 1, "India Focus")
                filtered.append(a)

        print(f"[news] GPT filter: {len(articles)} -> {len(filtered)} articles (>= 5 relevance)")
        return filtered

    except Exception as e:
        print(f"[news] GPT filter failed, keeping all: {e}")
        return articles


# ---------------------------------------------------------------------------
# Supabase upsert
# ---------------------------------------------------------------------------

def upsert_news(article: dict) -> bool:
    if not (SUPABASE_URL and SUPABASE_KEY):
        return False
    if not article.get("url"):
        return False

    payload = {
        "title": article["title"][:500],
        "source": article.get("_source", ""),
        "topic": article.get("_topic", "India Focus"),
        "summary_points": [],
        "url": article["url"],
        "ai_summary": article.get("description", "")[:300],
        "country": article.get("_country", "IN"),
        "read_time": "2 min",
        "published_at": datetime.now(timezone.utc).isoformat(),
        "image_url": article.get("image_url", ""),
        "gd_analysis": {},
    }

    try:
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/news?on_conflict=url",
            json=payload,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            timeout=15,
        )
        return resp.status_code < 300
    except Exception as e:
        print(f"[news] upsert error: {e}")
        return False


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Optional auth check
        if CRON_SECRET:
            auth = self.headers.get("Authorization", "")
            if auth != f"Bearer {CRON_SECRET}":
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "unauthorized"}).encode())
                return

        try:
            # 1. Fetch all RSS feeds
            all_articles = fetch_all_feeds()
            total_raw = len(all_articles)

            # 2. GPT relevance filter + topic categorization
            all_articles = gpt_filter_articles(all_articles)

            # 3. Upsert to Supabase
            kept = 0
            no_image = 0
            for article in all_articles:
                if not article.get("image_url"):
                    no_image += 1
                if upsert_news(article):
                    kept += 1

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "articles_raw": total_raw,
                "articles_filtered": len(all_articles),
                "articles_kept": kept,
                "articles_without_image": no_image,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": str(e),
            }).encode())
