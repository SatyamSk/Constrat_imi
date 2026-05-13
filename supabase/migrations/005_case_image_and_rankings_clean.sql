-- ============================================================
-- 005 — Case image upload, deterministic rankings, global leaderboard
--
-- CLEAN / IDEMPOTENT version — safe to re-run.
-- Drops pre-existing conflicting policies before creating new ones.
-- ============================================================

-- 1. Add image_url to case_submissions ------------------------
ALTER TABLE public.case_submissions
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_case_submissions_case_id
  ON public.case_submissions (case_id);


-- 2. Deterministic per-case ranking ---------------------------
CREATE OR REPLACE FUNCTION public.refresh_case_rankings(p_case_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.case_rankings WHERE case_id = p_case_id;

  INSERT INTO public.case_rankings (case_id, user_id, rank, score)
  SELECT
    p_case_id,
    user_id,
    RANK() OVER (ORDER BY MAX(score) DESC),
    MAX(score)
  FROM public.case_submissions
  WHERE case_id = p_case_id
  GROUP BY user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_case_rankings(UUID)
  TO anon, authenticated, service_role;


-- 3. View: per-case leaderboard with names --------------------
CREATE OR REPLACE VIEW public.case_leaderboard AS
SELECT
  r.case_id,
  r.user_id,
  r.rank,
  r.score,
  COALESCE(p.full_name, p.email, 'Anonymous') AS display_name,
  p.avatar_url
FROM public.case_rankings r
JOIN public.profiles p ON p.id = r.user_id;

GRANT SELECT ON public.case_leaderboard TO anon, authenticated;


-- 4. View: global user ranking --------------------------------
CREATE OR REPLACE VIEW public.global_leaderboard AS
SELECT
  s.user_id,
  COALESCE(p.full_name, p.email, 'Anonymous') AS display_name,
  p.avatar_url,
  s.cases_solved,
  s.guesstimates_completed,
  s.total_score,
  s.current_streak,
  RANK() OVER (ORDER BY s.total_score DESC) AS rank
FROM public.user_statistics s
JOIN public.profiles p ON p.id = s.user_id;

GRANT SELECT ON public.global_leaderboard TO anon, authenticated;


-- 5. Storage: bucket + RLS for case images --------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-images', 'case-images', true)
ON CONFLICT (id) DO NOTHING;

-- *** FIX: Drop ALL potentially conflicting policies first ***
-- Drop the old avatar policies that conflict
DROP POLICY IF EXISTS "Allow authenticated avatar uploads"    ON storage.objects;
DROP POLICY IF EXISTS "Allow public avatar reads"             ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated avatar deletes"    ON storage.objects;
-- Drop the new case-image policies (in case we're re-running)
DROP POLICY IF EXISTS "case-images public read"               ON storage.objects;
DROP POLICY IF EXISTS "case-images user upload own folder"    ON storage.objects;
DROP POLICY IF EXISTS "case-images user delete own"           ON storage.objects;

CREATE POLICY "case-images public read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'case-images');

CREATE POLICY "case-images user upload own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "case-images user delete own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'case-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Re-create the avatar policies cleanly (so avatar uploads keep working)
-- Only create if the avatars bucket exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    -- These were already dropped above, safe to create
    CREATE POLICY "Allow authenticated avatar uploads"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars');

    CREATE POLICY "Allow public avatar reads"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'avatars');

    CREATE POLICY "Allow authenticated avatar deletes"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'avatars');
  END IF;
END $$;


-- 6. Trigger: keep user_statistics in sync on case_submissions
CREATE OR REPLACE FUNCTION public.bump_user_stats_on_case()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_statistics (
    user_id, cases_solved, cases_score, total_score, last_activity_date
  )
  VALUES (
    NEW.user_id,
    1,
    COALESCE(NEW.score, 0),
    COALESCE(NEW.score, 0),
    CURRENT_DATE
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    cases_solved       = user_statistics.cases_solved + 1,
    cases_score        = user_statistics.cases_score + COALESCE(NEW.score, 0),
    total_score        = user_statistics.total_score + COALESCE(NEW.score, 0),
    last_activity_date = CURRENT_DATE,
    updated_at         = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_case_submission_bump_stats ON public.case_submissions;
CREATE TRIGGER on_case_submission_bump_stats
  AFTER INSERT ON public.case_submissions
  FOR EACH ROW EXECUTE FUNCTION public.bump_user_stats_on_case();
