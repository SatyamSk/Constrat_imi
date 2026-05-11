-- Constrat Platform — Database Schema
-- Run this in Supabase SQL Editor

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- Auto-create profile on signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ALUMNI
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alumni (
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

-- ============================================================
-- NEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.news (
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

-- ============================================================
-- PRACTICE QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.practice_questions (
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

-- ============================================================
-- CASE DECKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.case_decks (
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

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
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

-- ============================================================
-- TIMETABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.timetable (
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

-- ============================================================
-- TIMETABLE ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.timetable_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  change_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.timetable_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read alerts" ON public.timetable_alerts FOR SELECT USING (true);

-- ============================================================
-- DEADLINES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deadlines (
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

-- ============================================================
-- LEADERBOARD POINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leaderboard_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leaderboard_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read points" ON public.leaderboard_points FOR SELECT USING (true);
CREATE POLICY "Authenticated insert points" ON public.leaderboard_points FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- COMPETITIONS (Unstop, Grad Partners, Kampus Connect)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.competitions (
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

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_news_published ON public.news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_country ON public.news(country);
CREATE INDEX IF NOT EXISTS idx_questions_date ON public.practice_questions(date_assigned DESC);
CREATE INDEX IF NOT EXISTS idx_timetable_section ON public.timetable(section, day);
CREATE INDEX IF NOT EXISTS idx_deadlines_date ON public.deadlines(deadline_date ASC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON public.leaderboard_points(user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_batch ON public.alumni(batch);
