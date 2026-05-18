-- ============================================================
-- 009 — Analytics RPCs + leaderboard deltas
-- Run AFTER 008. Idempotent (CREATE OR REPLACE everywhere).
-- ============================================================

-- ── Percentile of user's overall average score, vs everyone ──
CREATE OR REPLACE FUNCTION public.user_percentile_overall(p_user_id UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH per_user AS (
    SELECT user_id, AVG(score)::NUMERIC AS avg_score
    FROM public.case_submissions
    GROUP BY user_id
    HAVING COUNT(*) >= 1
  ),
  ranked AS (
    SELECT user_id,
           PERCENT_RANK() OVER (ORDER BY avg_score) AS p
    FROM per_user
  )
  SELECT COALESCE(
    (SELECT ROUND(p * 100)::INT FROM ranked WHERE user_id = p_user_id),
    0
  );
$$;

-- ── Same, scoped to a recent window in days ──
CREATE OR REPLACE FUNCTION public.user_percentile_window(
  p_user_id UUID,
  p_days INT
)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH per_user AS (
    SELECT user_id, AVG(score)::NUMERIC AS avg_score
    FROM public.case_submissions
    WHERE submitted_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY user_id
    HAVING COUNT(*) >= 1
  ),
  ranked AS (
    SELECT user_id,
           PERCENT_RANK() OVER (ORDER BY avg_score) AS p
    FROM per_user
  )
  SELECT COALESCE(
    (SELECT ROUND(p * 100)::INT FROM ranked WHERE user_id = p_user_id),
    0
  );
$$;

-- ── Score accumulated in a recent window ──
CREATE OR REPLACE FUNCTION public.user_points_window(
  p_user_id UUID,
  p_days INT
)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(score)::INT, 0)
  FROM public.case_submissions
  WHERE user_id = p_user_id
    AND submitted_at >= NOW() - (p_days || ' days')::INTERVAL;
$$;

-- ── Dimension averages for the radar — CASE submissions ──
CREATE OR REPLACE FUNCTION public.user_case_dimensions(
  p_user_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE(
  framework NUMERIC,
  clarity NUMERIC,
  approach NUMERIC,
  execution NUMERIC,
  n INT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(AVG(COALESCE(
      (ai_analysis->>'framework_score')::NUMERIC,
      (ai_analysis->>'framework')::NUMERIC
    )), 0) AS framework,
    COALESCE(AVG((ai_analysis->>'clarity')::NUMERIC), 0)    AS clarity,
    COALESCE(AVG((ai_analysis->>'approach')::NUMERIC), 0)   AS approach,
    COALESCE(AVG((ai_analysis->>'execution')::NUMERIC), 0)  AS execution,
    COUNT(*)::INT                                            AS n
  FROM public.case_submissions
  WHERE user_id = p_user_id
    AND submitted_at >= NOW() - (p_days || ' days')::INTERVAL;
$$;

-- ── Dimension averages for the radar — GUESTIMATE submissions ──
-- Different dimensions: methodology, accuracy, reasoning, presentation
CREATE OR REPLACE FUNCTION public.user_guess_dimensions(
  p_user_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE(
  methodology NUMERIC,
  accuracy NUMERIC,
  reasoning NUMERIC,
  presentation NUMERIC,
  n INT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    COALESCE(AVG((ai_analysis->>'methodology')::NUMERIC),  0) AS methodology,
    COALESCE(AVG((ai_analysis->>'accuracy')::NUMERIC),     0) AS accuracy,
    COALESCE(AVG((ai_analysis->>'reasoning')::NUMERIC),    0) AS reasoning,
    COALESCE(AVG((ai_analysis->>'presentation')::NUMERIC), 0) AS presentation,
    COUNT(*)::INT                                              AS n
  FROM public.guestimate_submissions
  WHERE user_id = p_user_id
    AND submitted_at >= NOW() - (p_days || ' days')::INTERVAL;
$$;

GRANT EXECUTE ON FUNCTION public.user_percentile_overall(UUID)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_percentile_window(UUID, INT)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_points_window(UUID, INT)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_case_dimensions(UUID, INT)    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_guess_dimensions(UUID, INT)   TO anon, authenticated;


-- ── Leaderboard with daily/weekly/monthly score deltas ──
CREATE OR REPLACE VIEW public.leaderboard_with_deltas AS
SELECT
  p.id                                                   AS user_id,
  COALESCE(NULLIF(TRIM(p.full_name), ''), p.email)       AS display_name,
  p.avatar_url,
  p.batch                                                AS college,
  COALESCE(us.total_score, 0)                            AS total_score,
  COALESCE(us.current_streak, 0)                         AS current_streak,
  COALESCE(us.cases_solved, 0)                           AS cases_solved,
  COALESCE((
    SELECT SUM(score)::INT FROM public.case_submissions cs
    WHERE cs.user_id = p.id AND cs.submitted_at >= NOW() - INTERVAL '1 day'
  ), 0)                                                  AS points_today,
  COALESCE((
    SELECT SUM(score)::INT FROM public.case_submissions cs
    WHERE cs.user_id = p.id AND cs.submitted_at >= NOW() - INTERVAL '7 days'
  ), 0)                                                  AS points_week,
  COALESCE((
    SELECT SUM(score)::INT FROM public.case_submissions cs
    WHERE cs.user_id = p.id AND cs.submitted_at >= NOW() - INTERVAL '30 days'
  ), 0)                                                  AS points_month
FROM public.profiles p
LEFT JOIN public.user_statistics us ON us.user_id = p.id
WHERE COALESCE(us.total_score, 0) > 0;

GRANT SELECT ON public.leaderboard_with_deltas TO anon, authenticated;
