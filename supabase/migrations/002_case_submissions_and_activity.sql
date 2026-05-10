-- Case Submissions and Scoring Schema
-- Run this in Supabase SQL Editor after the initial schema

-- ============================================================
-- CASE SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.case_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.case_decks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  answer TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  feedback TEXT DEFAULT '',
  ai_analysis JSONB DEFAULT '{"framework": "", "clarity": 0, "approach": 0, "execution": 0}'::JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.case_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own cases" ON public.case_submissions FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users submit cases" ON public.case_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cases" ON public.case_submissions FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- GUESTIMATE SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guestimate_submissions (
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

-- ============================================================
-- USER ACTIVITY (for streaks and daily tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_activity (
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

-- ============================================================
-- USER STATISTICS (aggregate table for performance)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_statistics (
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

-- ============================================================
-- CASE RANKINGS (for leaderboard)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.case_rankings (
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

-- ============================================================
-- DAILY ACTIVITY GRAPH DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_heatmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  contribution_level INTEGER DEFAULT 0 CHECK (contribution_level IN (0, 1, 2, 3, 4)), -- 0=none, 1=low, 2=medium, 3=high, 4=very high
  activity_count INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

ALTER TABLE public.activity_heatmap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own heatmap" ON public.activity_heatmap FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own heatmap" ON public.activity_heatmap FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_case_submissions_user ON public.case_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_case_submissions_date ON public.case_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_guestimate_submissions_user ON public.guestimate_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_guestimate_submissions_date ON public.guestimate_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON public.user_activity(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_user_activity_streak ON public.user_activity(user_id, streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_statistics_total_score ON public.user_statistics(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_case_rankings_score ON public.case_rankings(score DESC);
CREATE INDEX IF NOT EXISTS idx_activity_heatmap_user_date ON public.activity_heatmap(user_id, activity_date DESC);
