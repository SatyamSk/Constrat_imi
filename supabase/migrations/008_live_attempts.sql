-- ============================================================
-- 008 — Live attempts heartbeat + global counters
--
-- Powers the "1,247 solving right now" indicators on the home page
-- and case attempt screen.
-- ============================================================

-- Heartbeats from clients while a user is actively attempting a case.
-- Each client POSTs every 30s; rows older than 90s are considered stale.
CREATE TABLE IF NOT EXISTS public.case_attempt_heartbeats (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id    UUID,                                      -- null = freeform/practice
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, case_id)
);

CREATE INDEX IF NOT EXISTS idx_heartbeat_last_seen
  ON public.case_attempt_heartbeats (last_seen DESC);

ALTER TABLE public.case_attempt_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users upsert own heartbeat" ON public.case_attempt_heartbeats;
CREATE POLICY "users upsert own heartbeat"
  ON public.case_attempt_heartbeats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "anyone reads heartbeat count" ON public.case_attempt_heartbeats;
CREATE POLICY "anyone reads heartbeat count"
  ON public.case_attempt_heartbeats FOR SELECT
  USING (true);


-- RPC: how many users are currently active in the last 90 seconds?
-- Optionally scoped to a single case.
CREATE OR REPLACE FUNCTION public.live_attempt_count(p_case_id UUID DEFAULT NULL)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INT
  FROM public.case_attempt_heartbeats
  WHERE last_seen > NOW() - INTERVAL '90 seconds'
    AND (p_case_id IS NULL OR case_id = p_case_id);
$$;

GRANT EXECUTE ON FUNCTION public.live_attempt_count(UUID)
  TO anon, authenticated, service_role;


-- Convenience view: today's site-wide stats for the homepage ticker.
CREATE OR REPLACE VIEW public.site_pulse AS
SELECT
  (SELECT COUNT(*) FROM public.case_submissions)        AS cases_solved_total,
  (SELECT COUNT(DISTINCT user_id)
     FROM public.user_statistics
    WHERE current_streak >= 3)                          AS active_streaks,
  (SELECT COUNT(*) FROM public.case_decks)              AS cases_in_bank,
  (SELECT COUNT(*) FROM public.case_attempt_heartbeats
    WHERE last_seen > NOW() - INTERVAL '90 seconds')    AS solving_right_now;

GRANT SELECT ON public.site_pulse TO anon, authenticated;
