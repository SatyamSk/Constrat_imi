-- ============================================================================
-- STAGE 1: FOUNDATION - Supabase Schema for AI-Powered MBA Case Repository
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- ============================================================================
-- 1. USERS PROFILE (Authentication extended profile)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ended_at TIMESTAMP WITH TIME ZONE,
  total_uploads INT DEFAULT 0,
  total_cases_accessed INT DEFAULT 0,
  search_queries_used INT DEFAULT 0,
  storage_used_bytes BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT DEFAULT 5368709120, -- 5GB default
  preferences JSONB DEFAULT '{"theme": "light", "notifications": true}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_profile_email ON users_profile(email);
CREATE INDEX idx_users_profile_subscription ON users_profile(subscription_tier, subscription_status);

-- ============================================================================
-- 2. CASE REPOSITORY (Main case storage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_repository (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- File info
  file_id TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'ppt', 'pptx', 'docx', 'doc', 'txt', 'zip')),
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  
  -- Google Drive
  drive_file_id TEXT UNIQUE,
  drive_folder_path TEXT,
  drive_last_synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Classification (AI-generated)
  competition_type TEXT CHECK (competition_type IN ('bschool', 'corporate', 'unknown')),
  bschool_name TEXT,
  company_name TEXT,
  challenge_title TEXT,
  case_title TEXT NOT NULL,
  year INT,
  round TEXT CHECK (round IN ('winner', 'finalist', 'semi-finalist', 'participant', 'unknown')),
  management_function TEXT CHECK (management_function IN ('marketing', 'finance', 'operations', 'strategy', 'HR', 'consulting', 'general', 'unknown')),
  
  -- Content
  preview_text TEXT,
  extracted_text TEXT,
  extracted_text_length INT,
  page_count INT,
  
  -- AI Analysis
  confidence_score NUMERIC(3, 2) DEFAULT 0.0,
  ai_summary TEXT,
  detected_entities JSONB,
  detected_keywords TEXT[],
  file_quality_score NUMERIC(3, 2),
  searchable_metadata JSONB,
  
  -- Access Control
  access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'shared', 'public')),
  shared_with_users UUID[],
  
  -- User Info
  uploaded_by UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  organization_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Vector embeddings for search
  embedding vector(768), -- Gemma embeddings
  
  -- Deduplication
  content_hash TEXT UNIQUE,
  is_duplicate_of UUID REFERENCES case_repository(id)
);

CREATE INDEX idx_case_repository_uploaded_by ON case_repository(uploaded_by);
CREATE INDEX idx_case_repository_competition_type ON case_repository(competition_type);
CREATE INDEX idx_case_repository_bschool ON case_repository(bschool_name);
CREATE INDEX idx_case_repository_company ON case_repository(company_name);
CREATE INDEX idx_case_repository_year ON case_repository(year);
CREATE INDEX idx_case_repository_round ON case_repository(round);
CREATE INDEX idx_case_repository_management_function ON case_repository(management_function);
CREATE INDEX idx_case_repository_access_level ON case_repository(access_level);
CREATE INDEX idx_case_repository_confidence ON case_repository(confidence_score);
CREATE INDEX idx_case_repository_created ON case_repository(created_at DESC);
CREATE INDEX idx_case_repository_embedding ON case_repository USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_case_repository_content_hash ON case_repository(content_hash);

-- ============================================================================
-- 3. UPLOAD JOBS (Track file uploads and processing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS upload_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference
  case_id UUID REFERENCES case_repository(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  
  -- File info
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  upload_url TEXT,
  
  -- Processing stages
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'extracting', 'classifying', 'organizing', 'completed', 'failed')),
  progress_percent INT DEFAULT 0,
  
  -- Extraction
  extraction_status TEXT CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_started_at TIMESTAMP WITH TIME ZONE,
  extraction_completed_at TIMESTAMP WITH TIME ZONE,
  extraction_error TEXT,
  
  -- Classification
  classification_status TEXT CHECK (classification_status IN ('pending', 'processing', 'completed', 'failed')),
  classification_started_at TIMESTAMP WITH TIME ZONE,
  classification_completed_at TIMESTAMP WITH TIME ZONE,
  classification_error TEXT,
  
  -- Organization
  organization_status TEXT CHECK (organization_status IN ('pending', 'processing', 'completed', 'failed')),
  organization_started_at TIMESTAMP WITH TIME ZONE,
  organization_completed_at TIMESTAMP WITH TIME ZONE,
  organization_error TEXT,
  
  -- Metadata
  extracted_page_count INT,
  extracted_word_count INT,
  
  -- Error handling
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  last_error TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_upload_jobs_user_id ON upload_jobs(user_id);
CREATE INDEX idx_upload_jobs_case_id ON upload_jobs(case_id);
CREATE INDEX idx_upload_jobs_status ON upload_jobs(status);
CREATE INDEX idx_upload_jobs_created_at ON upload_jobs(created_at DESC);

-- ============================================================================
-- 4. REVIEW QUEUE (Cases pending AI review/validation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL UNIQUE REFERENCES case_repository(id) ON DELETE CASCADE,
  upload_job_id UUID REFERENCES upload_jobs(id) ON DELETE SET NULL,
  
  -- Queue info
  queue_priority INT DEFAULT 50, -- Higher = process first
  reason_for_review TEXT NOT NULL, -- e.g., "low_confidence", "extraction_failed", "duplicate_detected"
  review_type TEXT CHECK (review_type IN ('ai_validation', 'manual_review', 'duplicate_check', 'quality_check')),
  
  -- AI Classification (for review)
  ai_classification JSONB,
  ai_confidence_details JSONB,
  
  -- Review status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'approved', 'rejected', 'needs_manual_review')),
  assigned_to UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  
  -- Resolution
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_review_queue_case_id ON review_queue(case_id);
CREATE INDEX idx_review_queue_status ON review_queue(status);
CREATE INDEX idx_review_queue_priority ON review_queue(queue_priority DESC);
CREATE INDEX idx_review_queue_created_at ON review_queue(created_at ASC);

-- ============================================================================
-- 5. ACCESS LOGS (Audit trail for file access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES case_repository(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  
  -- Access details
  action TEXT NOT NULL CHECK (action IN ('viewed', 'downloaded', 'shared', 'searched', 'exported')),
  ip_address INET,
  user_agent TEXT,
  
  -- Session info
  session_id TEXT,
  duration_seconds INT,
  
  -- Metadata
  accessed_from TEXT, -- 'web', 'api', 'mobile'
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_access_logs_case_id ON access_logs(case_id);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_action ON access_logs(action);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at DESC);

-- ============================================================================
-- 6. USER SAVED CASES (Bookmarks/favorites)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_saved_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES case_repository(id) ON DELETE CASCADE,
  
  -- Save info
  saved_reason TEXT,
  collection_name TEXT DEFAULT 'Favorites',
  tags TEXT[],
  notes TEXT,
  
  -- Timestamps
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, case_id)
);

CREATE INDEX idx_user_saved_cases_user_id ON user_saved_cases(user_id);
CREATE INDEX idx_user_saved_cases_case_id ON user_saved_cases(case_id);
CREATE INDEX idx_user_saved_cases_collection ON user_saved_cases(collection_name);

-- ============================================================================
-- 7. CASE VIEWS (Track case reads for analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES case_repository(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users_profile(id) ON DELETE SET NULL,
  
  -- View details
  session_id TEXT NOT NULL,
  pages_viewed INT[],
  time_spent_seconds INT,
  scroll_depth_percent NUMERIC(5, 2),
  
  -- Device info
  device_type TEXT CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
  browser TEXT,
  
  -- Engagement
  searched_within_document TEXT,
  took_notes BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_case_views_case_id ON case_views(case_id);
CREATE INDEX idx_case_views_user_id ON case_views(user_id);
CREATE INDEX idx_case_views_session_id ON case_views(session_id);
CREATE INDEX idx_case_views_created_at ON case_views(created_at DESC);

-- ============================================================================
-- 8. AI PROCESSING LOGS (Detailed AI operation logs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_processing_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES case_repository(id) ON DELETE CASCADE,
  upload_job_id UUID REFERENCES upload_jobs(id) ON DELETE CASCADE,
  
  -- Processing info
  operation_type TEXT NOT NULL CHECK (operation_type IN ('extraction', 'classification', 'summarization', 'embedding', 'search')),
  model_used TEXT,
  model_version TEXT,
  
  -- Input/Output
  input_tokens INT,
  output_tokens INT,
  input_size_bytes BIGINT,
  output_size_bytes BIGINT,
  
  -- Results
  success BOOLEAN DEFAULT FALSE,
  result JSONB,
  error_message TEXT,
  
  -- Performance
  execution_time_ms INT,
  retry_count INT DEFAULT 0,
  
  -- Cost tracking
  api_cost_cents INT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_processing_logs_case_id ON ai_processing_logs(case_id);
CREATE INDEX idx_ai_processing_logs_operation_type ON ai_processing_logs(operation_type);
CREATE INDEX idx_ai_processing_logs_success ON ai_processing_logs(success);
CREATE INDEX idx_ai_processing_logs_created_at ON ai_processing_logs(created_at DESC);

-- ============================================================================
-- 9. DUPLICATE DETECTION (Track potential duplicates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS duplicate_detection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id_1 UUID NOT NULL REFERENCES case_repository(id) ON DELETE CASCADE,
  case_id_2 UUID NOT NULL REFERENCES case_repository(id) ON DELETE CASCADE,
  
  -- Similarity score
  similarity_score NUMERIC(3, 2),
  similarity_reason TEXT[],
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'manual_review')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users_profile(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(LEAST(case_id_1, case_id_2), GREATEST(case_id_1, case_id_2))
);

CREATE INDEX idx_duplicate_detection_status ON duplicate_detection(status);

-- ============================================================================
-- 10. GOOGLE DRIVE SYNC (Track Drive folder structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS google_drive_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Drive info
  drive_folder_id TEXT NOT NULL UNIQUE,
  folder_path TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  
  -- Sync status
  last_synced_at TIMESTAMP WITH TIME ZONE,
  total_files INT DEFAULT 0,
  synced_files INT DEFAULT 0,
  
  -- Auto-organization
  organization_rules JSONB, -- Rules for where to move files
  auto_organize_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_google_drive_sync_folder_id ON google_drive_sync(drive_folder_id);

-- ============================================================================
-- 11. SEARCH HISTORY (Track user searches for analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  
  -- Search query
  query TEXT NOT NULL,
  query_type TEXT CHECK (query_type IN ('metadata', 'semantic', 'full_text', 'nlp')),
  
  -- Results
  results_count INT,
  results JSONB,
  
  -- Engagement
  clicked_result_id UUID REFERENCES case_repository(id),
  result_ranking INT,
  
  -- Performance
  execution_time_ms INT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_query ON search_history(query);
CREATE INDEX idx_search_history_created_at ON search_history(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS Policies)
-- ============================================================================

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_views ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY users_profile_self ON users_profile
  USING (id = auth.uid());

-- Users can view public cases or private cases they own/have access to
CREATE POLICY cases_view ON case_repository
  USING (
    access_level = 'public'
    OR uploaded_by = auth.uid()
    OR auth.uid() = ANY(shared_with_users)
  );

-- Users can only see their own uploads
CREATE POLICY upload_jobs_own ON upload_jobs
  USING (user_id = auth.uid());

-- Users can only see logs for cases they access
CREATE POLICY access_logs_view ON access_logs
  USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_profile_timestamp BEFORE UPDATE ON users_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_repository_timestamp BEFORE UPDATE ON case_repository
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upload_jobs_timestamp BEFORE UPDATE ON upload_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_queue_timestamp BEFORE UPDATE ON review_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_drive_sync_timestamp BEFORE UPDATE ON google_drive_sync
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment storage_used when file uploaded
CREATE OR REPLACE FUNCTION increment_user_storage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users_profile 
  SET storage_used_bytes = storage_used_bytes + NEW.file_size_bytes
  WHERE id = NEW.uploaded_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER case_storage_increment AFTER INSERT ON case_repository
  FOR EACH ROW EXECUTE FUNCTION increment_user_storage();

-- Log case access
CREATE OR REPLACE FUNCTION log_case_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO access_logs (case_id, user_id, action)
  VALUES (NEW.id, auth.uid(), 'viewed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Cases by competition type
CREATE OR REPLACE VIEW cases_by_competition AS
  SELECT 
    competition_type,
    COUNT(*) as total_cases,
    AVG(confidence_score) as avg_confidence,
    COUNT(DISTINCT uploaded_by) as unique_uploaders
  FROM case_repository
  WHERE deleted_at IS NULL
  GROUP BY competition_type;

-- User analytics
CREATE OR REPLACE VIEW user_analytics AS
  SELECT 
    up.id,
    up.email,
    COUNT(DISTINCT cr.id) as cases_uploaded,
    COUNT(DISTINCT usc.id) as cases_saved,
    COUNT(DISTINCT cv.id) as cases_viewed,
    COALESCE(SUM(cr.file_size_bytes), 0) as total_storage_used
  FROM users_profile up
  LEFT JOIN case_repository cr ON up.id = cr.uploaded_by AND cr.deleted_at IS NULL
  LEFT JOIN user_saved_cases usc ON up.id = usc.user_id
  LEFT JOIN case_views cv ON up.id = cv.user_id
  GROUP BY up.id, up.email;
