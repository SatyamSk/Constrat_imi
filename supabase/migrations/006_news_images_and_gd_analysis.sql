-- ============================================================
-- 006 — News: image_url + GD analysis (macro/micro framing)
--
-- Run after migration 005. Adds the columns the new news_aggregator.py
-- writes to and the news.tsx UI reads from.
-- ============================================================

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS gd_analysis JSONB DEFAULT '{}'::JSONB;

-- Optional but helpful: dedupe by URL going forward, so re-running the cron
-- doesn't pile up the same article. We keep the constraint partial because
-- legacy rows may have url=''.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'news_url_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX news_url_unique_idx
      ON public.news (url)
      WHERE url <> '';
  END IF;
END $$;

-- Speed up the "newest 60 articles" query the front page does.
CREATE INDEX IF NOT EXISTS idx_news_published_at_desc
  ON public.news (published_at DESC);

-- gd_analysis schema, by convention (not enforced):
-- {
--   "macro_angle":      "1-2 sentences on the broader economic/policy/global frame",
--   "micro_angle":      "1-2 sentences on impact for a specific company/consumer/sector",
--   "arguments_for":    ["...", "...", "..."],
--   "arguments_against":["...", "...", "..."],
--   "stakeholders":     [{"name":"...", "impact":"..."}, ...],
--   "frameworks":       ["Porter's 5 Forces", "Value Chain", ...],
--   "key_stats":        ["18% YoY revenue growth", "Rs 2,048 Cr deal value", ...],
--   "related_concepts": ["Quick commerce", "D2C economics", ...]
-- }
