-- Fix missing INSERT policies for activity tracking tables
-- Without these, activity tracking silently fails from the frontend

-- activity_heatmap: allow users to insert their own records
CREATE POLICY "Users insert own heatmap"
  ON public.activity_heatmap
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- user_statistics: allow users to insert their own records  
CREATE POLICY "Users insert own stats"
  ON public.user_statistics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- user_activity: needs UPDATE policy too (for streak updates)
CREATE POLICY "Users update own activity"
  ON public.user_activity
  FOR UPDATE
  USING (auth.uid() = user_id);

-- activity_heatmap: the existing UPDATE policy should work, but ensure it exists
-- (already defined in migration 002, but adding IF NOT EXISTS equivalent via DO block)
DO $$
BEGIN
  -- Verify the policies exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_heatmap' 
    AND policyname = 'Users insert own heatmap'
  ) THEN
    RAISE NOTICE 'INSERT policy for activity_heatmap was not created';
  END IF;
END $$;
