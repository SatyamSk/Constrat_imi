-- ============================================================
-- 007 — Subscriptions, usage quotas, admin role bootstrap
--
-- Adds:
--   - public.subscriptions       (per-user tier: 'free' | 'pro')
--   - public.usage_events        (each metered action, used for quota checks)
--   - public.user_quotas         (view: today/this-month counts per user)
--   - quota helper SQL functions
--   - sets satyamkumarsk676@gmail.com as admin
-- ============================================================

-- 1. SUBSCRIPTIONS ------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                 TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
  provider             TEXT DEFAULT '',                    -- 'stripe' | 'razorpay' | ''
  provider_customer_id TEXT DEFAULT '',
  provider_sub_id      TEXT DEFAULT '',
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscription" ON public.subscriptions;
CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Default free row for everyone who signs up
CREATE OR REPLACE FUNCTION public.handle_new_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_profile_created_default_sub ON public.profiles;
CREATE TRIGGER on_profile_created_default_sub
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_subscription();

-- Back-fill for existing users
INSERT INTO public.subscriptions (user_id, tier, status)
SELECT id, 'free', 'active' FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;


-- 2. USAGE EVENTS -------------------------------------------
-- One row per metered action. We tally these for quota checks.
CREATE TABLE IF NOT EXISTS public.usage_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('gd_brief', 'photo_analysis')),
  ref_id     TEXT DEFAULT '',                  -- e.g. news.id or case.id
  used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_user_kind_date
  ON public.usage_events (user_id, kind, used_at DESC);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own usage" ON public.usage_events;
CREATE POLICY "Users read own usage"
  ON public.usage_events FOR SELECT
  USING (auth.uid() = user_id);

-- Only the service role inserts (via API). Block client writes.
DROP POLICY IF EXISTS "Service inserts usage" ON public.usage_events;
CREATE POLICY "Service inserts usage"
  ON public.usage_events FOR INSERT
  WITH CHECK (false);


-- 3. QUOTA POLICY (single source of truth) ------------------
-- Returns (allowed BOOLEAN, used INT, limit INT, tier TEXT) for a user+kind.
CREATE OR REPLACE FUNCTION public.check_quota(
  p_user_id UUID,
  p_kind    TEXT
) RETURNS TABLE (allowed BOOLEAN, used INT, "limit" INT, tier TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tier         TEXT;
  v_window_start TIMESTAMPTZ;
  v_used         INT;
  v_limit        INT;
BEGIN
  -- Get tier (default free if no row).
  SELECT s.tier INTO v_tier
    FROM public.subscriptions s
   WHERE s.user_id = p_user_id;
  v_tier := COALESCE(v_tier, 'free');

  -- Quota table (per-day rolling 24h).
  v_window_start := NOW() - INTERVAL '24 hours';

  IF p_kind = 'gd_brief' THEN
    v_limit := CASE WHEN v_tier = 'pro' THEN 25 ELSE 3 END;
  ELSIF p_kind = 'photo_analysis' THEN
    -- Free: 5/day. Pro: effectively unlimited (we use 1000 as a soft ceiling).
    v_limit := CASE WHEN v_tier = 'pro' THEN 1000 ELSE 5 END;
  ELSE
    v_limit := 0;
  END IF;

  SELECT COUNT(*) INTO v_used
    FROM public.usage_events u
   WHERE u.user_id = p_user_id
     AND u.kind   = p_kind
     AND u.used_at > v_window_start;

  RETURN QUERY SELECT (v_used < v_limit), v_used, v_limit, v_tier;
END $$;

GRANT EXECUTE ON FUNCTION public.check_quota(UUID, TEXT)
  TO anon, authenticated, service_role;


-- 4. ADMIN BOOTSTRAP ----------------------------------------
-- Promote the operator's account whenever it appears in the profiles table.
DO $$
BEGIN
  UPDATE public.profiles
     SET role = 'admin'
   WHERE email = 'satyamkumarsk676@gmail.com';
END $$;

-- Also catch the case where the admin signs up *after* this migration runs.
CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email = 'satyamkumarsk676@gmail.com' THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ensure_admin_on_profile_write ON public.profiles;
CREATE TRIGGER ensure_admin_on_profile_write
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_admin_role();


-- 5. NEWS table comment -------------------------------------
-- The aggregator now uses a 3-tier fallback to ensure each article has an
-- image: (1) RSS metadata → (2) OG-image scrape → (3) web image search.
-- See api/news_aggregator.py.
COMMENT ON COLUMN public.news.image_url
  IS 'Best image we could find for the article. RSS → OG → web search fallback.';


-- 6. COMPETITIONS: extra columns for AI aggregator -----------
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS image_url    TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS category     TEXT    DEFAULT 'Case Competition',
  ADD COLUMN IF NOT EXISTS location     TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS host         TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS registration_open DATE,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'competitions_url_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX competitions_url_unique_idx
      ON public.competitions (url) WHERE url <> '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_competitions_deadline
  ON public.competitions (deadline_date);

-- Loosen the RLS so the AI aggregator (service role) can insert without a
-- created_by user; readers can still GET freely.
DROP POLICY IF EXISTS "Members manage competitions" ON public.competitions;
CREATE POLICY "Authenticated members manage own competitions"
  ON public.competitions FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (
      created_by = auth.uid()
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );
