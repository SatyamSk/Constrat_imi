-- ============================================================
-- NUCLEAR RESET — Drops EVERYTHING and rebuilds from scratch
-- 
-- Run this ONCE in Supabase SQL Editor to completely reset
-- your database. This will DELETE ALL DATA.
--
-- After this, all tables, views, functions, triggers, policies,
-- storage buckets, and indexes will be recreated clean.
-- ============================================================


-- ████████████████████████████████████████████████████████████
-- STEP 1: DROP EVERYTHING
-- ████████████████████████████████████████████████████████████

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_case_submission_bump_stats ON public.case_submissions;

-- Drop views
DROP VIEW IF EXISTS public.global_leaderboard CASCADE;
DROP VIEW IF EXISTS public.case_leaderboard CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_case_rankings(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.bump_user_stats_on_case() CASCADE;

-- Drop all storage policies (nuke every known policy on storage.objects)
DROP POLICY IF EXISTS "Allow authenticated avatar uploads"    ON storage.objects;
DROP POLICY IF EXISTS "Allow public avatar reads"             ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated avatar deletes"    ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads"           ON storage.objects;
DROP POLICY IF EXISTS "Allow public read"                     ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete"            ON storage.objects;
DROP POLICY IF EXISTS "case-images public read"               ON storage.objects;
DROP POLICY IF EXISTS "case-images user upload own folder"    ON storage.objects;
DROP POLICY IF EXISTS "case-images user delete own"           ON storage.objects;

-- NOTE: Storage buckets/objects can't be deleted via SQL.
-- Go to Supabase Dashboard → Storage to manually delete buckets if needed.
-- The bucket creation below uses ON CONFLICT DO NOTHING so it's safe to re-run.

-- Drop all tables (order matters — dependents first)
DROP TABLE IF EXISTS public.activity_heatmap CASCADE;
DROP TABLE IF EXISTS public.case_rankings CASCADE;
DROP TABLE IF EXISTS public.user_statistics CASCADE;
DROP TABLE IF EXISTS public.user_activity CASCADE;
DROP TABLE IF EXISTS public.guestimate_submissions CASCADE;
DROP TABLE IF EXISTS public.case_submissions CASCADE;
DROP TABLE IF EXISTS public.leaderboard_points CASCADE;
DROP TABLE IF EXISTS public.competitions CASCADE;
DROP TABLE IF EXISTS public.timetable_alerts CASCADE;
DROP TABLE IF EXISTS public.timetable CASCADE;
DROP TABLE IF EXISTS public.deadlines CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.case_decks CASCADE;
DROP TABLE IF EXISTS public.practice_questions CASCADE;
DROP TABLE IF EXISTS public.news CASCADE;
DROP TABLE IF EXISTS public.alumni CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


-- ████████████████████████████████████████████████████████████
-- STEP 2: MIGRATION 001 — Initial Schema
-- ████████████████████████████████████████████████████████████

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  batch TEXT DEFAULT '',
  section TEXT DEFAULT '',
  specialization TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'member', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Auto-create profile on signup (with 'member' role — includes fix from 003)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ALUMNI
CREATE TABLE public.alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  batch TEXT NOT NULL,
  company TEXT DEFAULT '',
  role TEXT DEFAULT '',
  function TEXT DEFAULT '',
  company_type TEXT DEFAULT '',
  designation TEXT DEFAULT '',
  linkedin_url TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  is_current_member BOOLEAN DEFAULT FALSE,
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read alumni" ON public.alumni FOR SELECT USING (true);
CREATE POLICY "Members manage alumni" ON public.alumni FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('member', 'admin'))
);

-- NEWS
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  topic TEXT DEFAULT '',
  summary_points JSONB DEFAULT '[]'::JSONB,
  url TEXT DEFAULT '',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  ai_summary TEXT DEFAULT '',
  country TEXT DEFAULT 'IN',
  read_time TEXT DEFAULT '2 min',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read news" ON public.news FOR SELECT USING (true);
CREATE POLICY "Members manage news" ON public.news FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('member', 'admin'))
);

-- PRACTICE QUESTIONS
CREATE TABLE public.practice_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('GUESTIMATE', 'CASE', 'INTERVIEW Q', 'GD TOPIC')),
  question TEXT NOT NULL,
  function TEXT DEFAULT 'General Mgmt',
  difficulty TEXT DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  source TEXT DEFAULT '',
  date_assigned DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read questions" ON public.practice_questions FOR SELECT USING (true);
CREATE POLICY "Members manage questions" ON public.practice_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('member', 'admin'))
);

-- CASE DECKS
CREATE TABLE public.case_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  source TEXT DEFAULT '',
  file_type TEXT DEFAULT 'PDF',
  file_url TEXT DEFAULT '',
  downloads INTEGER DEFAULT 0,
  added_by UUID REFERENCES public.profiles(id),
  added_date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read decks" ON public.case_decks FOR SELECT USING (true);
CREATE POLICY "Members manage decks" ON public.case_decks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('member', 'admin'))
);

-- EVENTS
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  venue TEXT DEFAULT '',
  type TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_upcoming BOOLEAN DEFAULT TRUE,
  participants INTEGER DEFAULT 0,
  recap TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Members manage events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('member', 'admin'))
);

-- TIMETABLE
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  day TEXT NOT NULL,
  slot TEXT NOT NULL,
  course TEXT NOT NULL,
  faculty TEXT DEFAULT '',
  room TEXT DEFAULT '',
  week_start DATE,
  tags TEXT[] DEFAULT '{}',
  specialization TEXT DEFAULT '',
  year TEXT DEFAULT '1',
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read timetable" ON public.timetable FOR SELECT USING (true);
CREATE POLICY "Service role manage timetable" ON public.timetable FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- TIMETABLE ALERTS
CREATE TABLE public.timetable_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  change_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.timetable_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read alerts" ON public.timetable_alerts FOR SELECT USING (true);

-- DEADLINES
CREATE TABLE public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  deadline_date DATE NOT NULL,
  source TEXT DEFAULT 'Placement',
  batch TEXT DEFAULT 'All',
  relevance TEXT DEFAULT 'All Sections',
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  source_email_subject TEXT DEFAULT '',
  reminded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read deadlines" ON public.deadlines FOR SELECT USING (true);
CREATE POLICY "Members manage deadlines" ON public.deadlines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('member', 'admin'))
);

-- LEADERBOARD POINTS
CREATE TABLE public.leaderboard_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leaderboard_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read points" ON public.leaderboard_points FOR SELECT USING (true);
CREATE POLICY "Authenticated insert points" ON public.leaderboard_points FOR INSERT WITH CHECK (auth.uid() = user_id);

-- COMPETITIONS
CREATE TABLE public.competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organizer TEXT NOT NULL DEFAULT 'Unstop',
  deadline_date DATE,
  prize TEXT DEFAULT '',
  url TEXT DEFAULT '',
  tag TEXT DEFAULT 'Live' CHECK (tag IN ('Live', 'Opening Soon', 'Closed')),
  description TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read competitions" ON public.competitions FOR SELECT USING (true);
CREATE POLICY "Members manage competitions" ON public.competitions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('member', 'admin'))
);

-- Indexes (001)
CREATE INDEX idx_news_published ON public.news(published_at DESC);
CREATE INDEX idx_news_country ON public.news(country);
CREATE INDEX idx_questions_date ON public.practice_questions(date_assigned DESC);
CREATE INDEX idx_timetable_section ON public.timetable(section, day);
CREATE INDEX idx_deadlines_date ON public.deadlines(deadline_date ASC);
CREATE INDEX idx_leaderboard_user ON public.leaderboard_points(user_id);
CREATE INDEX idx_alumni_batch ON public.alumni(batch);


-- ████████████████████████████████████████████████████████████
-- STEP 3: MIGRATION 002 — Case Submissions & Activity
-- ████████████████████████████████████████████████████████████

-- CASE SUBMISSIONS
CREATE TABLE public.case_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.case_decks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  answer TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  feedback TEXT DEFAULT '',
  ai_analysis JSONB DEFAULT '{"framework": "", "clarity": 0, "approach": 0, "execution": 0}'::JSONB,
  image_url TEXT DEFAULT '',  -- from migration 005
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own cases" ON public.case_submissions FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users submit cases" ON public.case_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cases" ON public.case_submissions FOR UPDATE USING (auth.uid() = user_id);

-- GUESTIMATE SUBMISSIONS
CREATE TABLE public.guestimate_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.practice_questions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  answer TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  feedback TEXT DEFAULT '',
  ai_analysis JSONB DEFAULT '{"methodology": "", "accuracy": 0, "reasoning": 0, "presentation": 0}'::JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guestimate_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own guesstimates" ON public.guestimate_submissions FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users submit guesstimates" ON public.guestimate_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own guesstimates" ON public.guestimate_submissions FOR UPDATE USING (auth.uid() = user_id);

-- USER ACTIVITY
CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('CASE_SOLVED', 'GUESTIMATE_COMPLETED', 'QUESTION_ANSWERED', 'LOGGED_IN')),
  activity_date DATE NOT NULL,
  streak INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date, activity_type)
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own activity" ON public.user_activity FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users create activity" ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own activity" ON public.user_activity FOR UPDATE USING (auth.uid() = user_id);  -- from 004

-- USER STATISTICS
CREATE TABLE public.user_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cases_solved INTEGER DEFAULT 0,
  cases_score INTEGER DEFAULT 0,
  guesstimates_completed INTEGER DEFAULT 0,
  guesstimates_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own stats" ON public.user_statistics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own stats" ON public.user_statistics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own stats" ON public.user_statistics FOR INSERT WITH CHECK (auth.uid() = user_id);  -- from 004

-- CASE RANKINGS
CREATE TABLE public.case_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.case_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank INTEGER,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id, user_id)
);

ALTER TABLE public.case_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read rankings" ON public.case_rankings FOR SELECT USING (true);
CREATE POLICY "Admins manage rankings" ON public.case_rankings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ACTIVITY HEATMAP
CREATE TABLE public.activity_heatmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  contribution_level INTEGER DEFAULT 0 CHECK (contribution_level IN (0, 1, 2, 3, 4)),
  activity_count INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

ALTER TABLE public.activity_heatmap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own heatmap" ON public.activity_heatmap FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own heatmap" ON public.activity_heatmap FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own heatmap" ON public.activity_heatmap FOR INSERT WITH CHECK (auth.uid() = user_id);  -- from 004

-- Indexes (002)
CREATE INDEX idx_case_submissions_user ON public.case_submissions(user_id);
CREATE INDEX idx_case_submissions_date ON public.case_submissions(submitted_at DESC);
CREATE INDEX idx_case_submissions_case_id ON public.case_submissions(case_id);  -- from 005
CREATE INDEX idx_guestimate_submissions_user ON public.guestimate_submissions(user_id);
CREATE INDEX idx_guestimate_submissions_date ON public.guestimate_submissions(submitted_at DESC);
CREATE INDEX idx_user_activity_user_date ON public.user_activity(user_id, activity_date);
CREATE INDEX idx_user_activity_streak ON public.user_activity(user_id, streak DESC);
CREATE INDEX idx_user_statistics_total_score ON public.user_statistics(total_score DESC);
CREATE INDEX idx_case_rankings_score ON public.case_rankings(score DESC);
CREATE INDEX idx_activity_heatmap_user_date ON public.activity_heatmap(user_id, activity_date DESC);


-- ████████████████████████████████████████████████████████████
-- STEP 4: MIGRATION 005 — Rankings, Views, Storage, Triggers
-- ████████████████████████████████████████████████████████████

-- Deterministic per-case ranking function
CREATE OR REPLACE FUNCTION public.refresh_case_rankings(p_case_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.case_rankings WHERE case_id = p_case_id;
  INSERT INTO public.case_rankings (case_id, user_id, rank, score)
  SELECT p_case_id, user_id, RANK() OVER (ORDER BY MAX(score) DESC), MAX(score)
  FROM public.case_submissions
  WHERE case_id = p_case_id
  GROUP BY user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_case_rankings(UUID)
  TO anon, authenticated, service_role;

-- Per-case leaderboard view
CREATE OR REPLACE VIEW public.case_leaderboard AS
SELECT
  r.case_id, r.user_id, r.rank, r.score,
  COALESCE(p.full_name, p.email, 'Anonymous') AS display_name,
  p.avatar_url
FROM public.case_rankings r
JOIN public.profiles p ON p.id = r.user_id;

GRANT SELECT ON public.case_leaderboard TO anon, authenticated;

-- Global leaderboard view
CREATE OR REPLACE VIEW public.global_leaderboard AS
SELECT
  s.user_id,
  COALESCE(p.full_name, p.email, 'Anonymous') AS display_name,
  p.avatar_url,
  s.cases_solved, s.guesstimates_completed, s.total_score, s.current_streak,
  RANK() OVER (ORDER BY s.total_score DESC) AS rank
FROM public.user_statistics s
JOIN public.profiles p ON p.id = s.user_id;

GRANT SELECT ON public.global_leaderboard TO anon, authenticated;

-- Storage: avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated avatar uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow public avatar reads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated avatar deletes"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

-- Storage: case-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-images', 'case-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "case-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'case-images');

CREATE POLICY "case-images user upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'case-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "case-images user delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'case-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Auto-sync trigger: bump user_statistics on case submission
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
    NEW.user_id, 1, COALESCE(NEW.score, 0), COALESCE(NEW.score, 0), CURRENT_DATE
  )
  ON CONFLICT (user_id) DO UPDATE SET
    cases_solved       = user_statistics.cases_solved + 1,
    cases_score        = user_statistics.cases_score + COALESCE(NEW.score, 0),
    total_score        = user_statistics.total_score + COALESCE(NEW.score, 0),
    last_activity_date = CURRENT_DATE,
    updated_at         = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_case_submission_bump_stats
  AFTER INSERT ON public.case_submissions
  FOR EACH ROW EXECUTE FUNCTION public.bump_user_stats_on_case();


-- ████████████████████████████████████████████████████████████
-- DONE! All tables, views, functions, triggers, and storage
-- policies have been created fresh.
-- ████████████████████████████████████████████████████████████
