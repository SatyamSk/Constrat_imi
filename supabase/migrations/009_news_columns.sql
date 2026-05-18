-- ============================================================
-- 009 — Add missing columns to news table
--
-- The frontend and aggregator expect `image_url` and `gd_analysis`
-- but the original 000_NUCLEAR_RESET.sql didn't include them.
-- ============================================================

-- Add image_url for article thumbnails
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- Add gd_analysis for AI-generated GD prep briefs
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS gd_analysis JSONB DEFAULT '{}'::JSONB;

-- Ensure service_role can INSERT (the news aggregator uses service_role key)
-- The existing "Members manage news" policy requires auth.uid() which
-- doesn't exist for service_role API calls.
DROP POLICY IF EXISTS "Service role insert news" ON public.news;
CREATE POLICY "Service role insert news"
  ON public.news FOR INSERT
  WITH CHECK (true);

-- Also allow service_role to UPDATE (for GD brief generation)
DROP POLICY IF EXISTS "Service role update news" ON public.news;
CREATE POLICY "Service role update news"
  ON public.news FOR UPDATE
  USING (true);

-- Create a partial unique index on url to prevent duplicate articles
-- (only when url is not empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_url_unique
  ON public.news(url)
  WHERE url IS NOT NULL AND url != '';
