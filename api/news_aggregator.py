"""
News Aggregator — Vercel Python Serverless Function
Fetches RSS feeds, uses GPT to summarize, inserts to Supabase.
Runs every 4 hours via Vercel Cron.
"""
import os
import json
import xml.etree.ElementTree as ET
from http.server import BaseHTTPRequestHandler
from urllib.request import urlopen, Request
from datetime import datetime

OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("VITE_SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Business-relevant RSS feeds
RSS_FEEDS = [
    {"url": "https://economictimes.indiatimes.com/rssfeedstopstories.cms", "source": "Economic Times", "country": "IN"},
    {"url": "https://www.livemint.com/rss/companies", "source": "Mint", "country": "IN"},
    {"url": "https://feeds.reuters.com/reuters/businessNews", "source": "Reuters", "country": "GLOBAL"},
    {"url": "https://www.business-standard.com/rss/latest.rss", "source": "Business Standard", "country": "IN"},
]

TOPICS = ["Markets & Economy", "Policy & Regulation", "Startups & VC", "FMCG & Retail",
          "Consulting Industry", "Global Business", "India Focus", "Technology"]


def fetch_rss(feed_url):
    """Fetch and parse RSS feed."""
    try:
        req = Request(feed_url, headers={"User-Agent": "Mozilla/5.0"})
        response = urlopen(req, timeout=15)
        xml_text = response.read().decode("utf-8", errors="ignore")
        root = ET.fromstring(xml_text)
        
        items = []
        for item in root.iter("item"):
            title_el = item.find("title")
            link_el = item.find("link")
            desc_el = item.find("description")
            pub_el = item.find("pubDate")
            
            if title_el is not None and title_el.text:
                items.append({
                    "title": title_el.text.strip(),
                    "url": link_el.text.strip() if link_el is not None and link_el.text else "",
                    "description": desc_el.text.strip()[:500] if desc_el is not None and desc_el.text else "",
                    "published": pub_el.text.strip() if pub_el is not None and pub_el.text else "",
                })
        
        return items[:5]  # Top 5 per feed
    except Exception as e:
        print(f"RSS fetch error for {feed_url}: {e}")
        return []


def summarize_with_gpt(articles):
    """Use GPT to create concise summaries and classify topics."""
    if not OPENAI_KEY or not articles:
        return articles
    
    import urllib.request
    
    titles = "\n".join([f"- {a['title']}" for a in articles[:10]])
    
    prompt = f"""You are a business news analyst for MBA students preparing for consulting interviews and GDs.
For each of the following news headlines, provide:
1. A 1-line "why it matters for MBA students" summary
2. Classify into one of: {', '.join(TOPICS)}

Headlines:
{titles}

Respond in JSON format:
[{{"title": "...", "summary": "...", "topic": "..."}}]
Only return valid JSON, no other text."""

    data = json.dumps({
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 1500,
    }).encode()
    
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=data,
        headers={
            "Authorization": f"Bearer {OPENAI_KEY}",
            "Content-Type": "application/json",
        },
    )
    
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read().decode())
        content = result["choices"][0]["message"]["content"].strip()
        
        # Extract JSON
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        summaries = json.loads(content)
        
        # Merge summaries back
        summary_lookup = {s["title"]: s for s in summaries}
        for article in articles:
            match = summary_lookup.get(article["title"], {})
            article["ai_summary"] = match.get("summary", "")
            article["topic"] = match.get("topic", "India Focus")
        
    except Exception as e:
        print(f"GPT summary error: {e}")
        for article in articles:
            article["ai_summary"] = ""
            article["topic"] = "India Focus"
    
    return articles


def save_to_supabase(articles, source, country):
    """Insert news articles to Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    
    import urllib.request
    
    now = datetime.utcnow().isoformat()
    
    for article in articles:
        data = json.dumps({
            "title": article["title"],
            "source": source,
            "topic": article.get("topic", "India Focus"),
            "summary_points": json.dumps([article.get("ai_summary", "")]),
            "url": article.get("url", ""),
            "ai_summary": article.get("ai_summary", ""),
            "country": country,
            "read_time": "2 min",
            "published_at": now,
        }).encode()
        
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/news",
            data=data,
            method="POST",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
        )
        
        try:
            urllib.request.urlopen(req)
        except Exception as e:
            print(f"Supabase insert error: {e}")


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            total_articles = 0
            
            for feed in RSS_FEEDS:
                articles = fetch_rss(feed["url"])
                articles = summarize_with_gpt(articles)
                save_to_supabase(articles, feed["source"], feed["country"])
                total_articles += len(articles)
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "articles_processed": total_articles,
                "timestamp": datetime.utcnow().isoformat(),
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
