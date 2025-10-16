-- ===============================================
-- SATURDAY 7:00 PM TRIVIA - FULL AUTOMATION SETUP
-- Run this ONCE to enable zero-touch operation
-- ===============================================
-- 
-- This script sets up all cron jobs, monitoring, and cleanup
-- for fully automated weekly trivia with wellness breaks.
-- 
-- PREREQUISITES:
-- 1. YOUTUBE_API_KEY secret configured in Supabase
-- 2. LOVABLE_API_KEY secret configured in Supabase
-- 3. Service role key and webhook secret ready (see step 1 below)
-- 
-- TIME TO COMPLETE: ~5 minutes
-- ===============================================

-- ===============================================
-- STEP 1: ENABLE REQUIRED EXTENSIONS
-- ===============================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verify extensions enabled
SELECT extname, extversion FROM pg_extension 
WHERE extname IN ('pg_cron', 'pg_net');

-- Expected output:
-- extname    | extversion
-- pg_cron    | 1.x.x
-- pg_net     | 0.x.x


-- ===============================================
-- STEP 2: CONFIGURE APP SECRETS
-- ===============================================
-- 
-- IMPORTANT: Replace these values with your actual keys:
-- - Find SERVICE_ROLE_KEY: Supabase Dashboard → Settings → API → service_role
-- - Generate WEBHOOK_SECRET: openssl rand -hex 32
-- 

ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDA4MDY1MSwiZXhwIjoyMDc1NjU2NjUxfQ.YOUR_ACTUAL_KEY';
ALTER DATABASE postgres SET app.settings.cron_webhook_secret = 'YOUR_32_CHAR_HEX_SECRET';

-- Verify settings saved
SELECT name, setting FROM pg_settings 
WHERE name LIKE 'app.settings.%';


-- ===============================================
-- STEP 3: CREATE MONITORING & LOGGING TABLES
-- ===============================================

-- Create trivia_logs table for all automation events
CREATE TABLE IF NOT EXISTS trivia_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  week_key DATE NOT NULL,
  event_type TEXT NOT NULL, -- 'generation', 'publishing', 'youtube_fetch', 'fallback', 'error'
  status TEXT NOT NULL, -- 'success', 'failure', 'warning'
  message TEXT,
  metadata JSONB DEFAULT '{}',
  function_name TEXT
);

-- Add indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_trivia_logs_week ON trivia_logs(week_key);
CREATE INDEX IF NOT EXISTS idx_trivia_logs_event ON trivia_logs(event_type, status);
CREATE INDEX IF NOT EXISTS idx_trivia_logs_created ON trivia_logs(created_at DESC);

-- Enable RLS
ALTER TABLE trivia_logs ENABLE ROW LEVEL SECURITY;

-- System can insert, admins can read
DROP POLICY IF EXISTS "System can log events" ON trivia_logs;
CREATE POLICY "System can log events" ON trivia_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view logs" ON trivia_logs;
CREATE POLICY "Admins can view logs" ON trivia_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Verify table created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trivia_logs'
ORDER BY ordinal_position;


-- ===============================================
-- STEP 4: CREATE CLEANUP FUNCTIONS
-- ===============================================

-- Archive old trivia sessions (7+ days old)
CREATE OR REPLACE FUNCTION archive_old_trivia_sessions()
RETURNS TABLE(deleted_sessions INT, deleted_videos INT, deleted_progress INT) AS $$
DECLARE
  v_deleted_sessions INT;
  v_deleted_videos INT;
  v_deleted_progress INT;
BEGIN
  -- Delete old sessions
  DELETE FROM trivia_weekly_sessions
  WHERE status = 'published'
    AND scheduled_at_local < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
  
  -- Delete old videos
  DELETE FROM trivia_break_videos
  WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted_videos = ROW_COUNT;
  
  -- Delete old progress
  DELETE FROM trivia_session_progress
  WHERE completed_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted_progress = ROW_COUNT;
  
  -- Log cleanup
  INSERT INTO trivia_logs (
    week_key, event_type, status, message, metadata
  ) VALUES (
    CURRENT_DATE,
    'cleanup',
    'success',
    'Archived old trivia data',
    jsonb_build_object(
      'sessions_deleted', v_deleted_sessions,
      'videos_deleted', v_deleted_videos,
      'progress_deleted', v_deleted_progress
    )
  );
  
  RETURN QUERY SELECT v_deleted_sessions, v_deleted_videos, v_deleted_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Health check function for monitoring
CREATE OR REPLACE FUNCTION run_trivia_health_check()
RETURNS TABLE(component TEXT, status TEXT, details JSONB) AS $$
BEGIN
  -- Check 1: This week's session exists
  RETURN QUERY
  SELECT 
    'session_generation'::TEXT,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM trivia_weekly_sessions 
        WHERE week_key >= CURRENT_DATE - INTERVAL '7 days'
      ) THEN 'healthy'::TEXT
      ELSE 'critical'::TEXT
    END,
    jsonb_build_object(
      'last_session', (
        SELECT week_key FROM trivia_weekly_sessions 
        ORDER BY week_key DESC LIMIT 1
      ),
      'total_sessions', (
        SELECT COUNT(*) FROM trivia_weekly_sessions
      )
    );

  -- Check 2: YouTube videos fetched
  RETURN QUERY
  SELECT 
    'youtube_fetch'::TEXT,
    CASE 
      WHEN (
        SELECT COUNT(*) FROM trivia_break_videos 
        WHERE week_key >= CURRENT_DATE - INTERVAL '7 days'
      ) >= 2 THEN 'healthy'::TEXT
      ELSE 'warning'::TEXT
    END,
    jsonb_build_object(
      'video_count', (
        SELECT COUNT(*) FROM trivia_break_videos 
        WHERE week_key >= CURRENT_DATE - INTERVAL '7 days'
      ),
      'last_fetch', (
        SELECT MAX(created_at) FROM trivia_break_videos
      )
    );

  -- Check 3: Cron jobs active
  RETURN QUERY
  SELECT 
    'scheduler'::TEXT,
    CASE 
      WHEN (
        SELECT COUNT(*) FROM cron.job 
        WHERE active = true AND (jobname LIKE '%trivia%' OR jobname LIKE '%wellness%')
      ) >= 4 THEN 'healthy'::TEXT
      ELSE 'critical'::TEXT
    END,
    jsonb_build_object(
      'active_jobs', (
        SELECT COUNT(*) FROM cron.job 
        WHERE active = true AND (jobname LIKE '%trivia%' OR jobname LIKE '%wellness%')
      ),
      'job_names', (
        SELECT array_agg(jobname) FROM cron.job 
        WHERE active = true AND (jobname LIKE '%trivia%' OR jobname LIKE '%wellness%')
      )
    );

  -- Check 4: Recent user engagement
  RETURN QUERY
  SELECT 
    'user_engagement'::TEXT,
    CASE 
      WHEN (
        SELECT COUNT(*) FROM trivia_session_progress 
        WHERE completed_at >= NOW() - INTERVAL '7 days'
      ) > 0 THEN 'healthy'::TEXT
      ELSE 'warning'::TEXT
    END,
    jsonb_build_object(
      'completions_last_7d', (
        SELECT COUNT(*) FROM trivia_session_progress 
        WHERE completed_at >= NOW() - INTERVAL '7 days'
      ),
      'unique_users', (
        SELECT COUNT(DISTINCT user_id) FROM trivia_session_progress 
        WHERE completed_at >= NOW() - INTERVAL '7 days'
      )
    );

  -- Check 5: Fallback usage rate
  RETURN QUERY
  SELECT 
    'fallback_rate'::TEXT,
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*) FILTER (WHERE event_type = 'wellness_fallback_used') * 100.0 / NULLIF(COUNT(*), 0)
        FROM analytics_events
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND event_type LIKE 'wellness_%'
      ), 0) < 20 THEN 'healthy'::TEXT
      ELSE 'warning'::TEXT
    END,
    jsonb_build_object(
      'fallback_percentage', COALESCE((
        SELECT ROUND(COUNT(*) FILTER (WHERE event_type = 'wellness_fallback_used') * 100.0 / NULLIF(COUNT(*), 0), 2)
        FROM analytics_events
        WHERE created_at >= NOW() - INTERVAL '7 days'
          AND event_type LIKE 'wellness_%'
      ), 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify functions created
SELECT proname, prosrc FROM pg_proc 
WHERE proname IN ('archive_old_trivia_sessions', 'run_trivia_health_check');


-- ===============================================
-- STEP 5: SCHEDULE CRON JOBS
-- ===============================================

-- Remove existing jobs (if re-running script)
SELECT cron.unschedule('trivia-generate-sessions-weekly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trivia-generate-sessions-weekly');
SELECT cron.unschedule('trivia-publish-sessions-saturday') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trivia-publish-sessions-saturday');
SELECT cron.unschedule('fetch-youtube-wellness-shorts-weekly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fetch-youtube-wellness-shorts-weekly');
SELECT cron.unschedule('send-trivia-reminder-saturday') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-trivia-reminder-saturday');
SELECT cron.unschedule('send-trivia-start-saturday') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-trivia-start-saturday');
SELECT cron.unschedule('trivia-health-check') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trivia-health-check');
SELECT cron.unschedule('archive-old-trivia') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'archive-old-trivia');

-- JOB 1: Generate trivia questions (Friday 6:00 PM UTC ≈ 1-2 PM Detroit)
SELECT cron.schedule(
  'trivia-generate-sessions-weekly',
  '0 18 * * FRI',  -- Every Friday at 18:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-generate-weekly-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-webhook-signature', encode(
        hmac('{}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
        'hex'
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- JOB 2: Fetch YouTube wellness videos (Friday 6:00 PM UTC, same time as questions)
SELECT cron.schedule(
  'fetch-youtube-wellness-shorts-weekly',
  '0 18 * * FRI',
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/fetch-youtube-wellness-shorts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-webhook-signature', encode(
        hmac('{"scheduled": true}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
        'hex'
      )
    ),
    body := '{"scheduled": true}'::jsonb
  ) as request_id;
  $$
);

-- JOB 3: Send reminder notification (Saturday 6:50 PM EDT ≈ 22:50 UTC)
SELECT cron.schedule(
  'send-trivia-reminder-saturday',
  '50 22 * * SAT',  -- Saturday at 22:50 UTC (6:50 PM EDT)
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-trivia-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-webhook-signature', encode(
        hmac('{"type": "reminder"}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
        'hex'
      )
    ),
    body := '{"type": "reminder"}'::jsonb
  ) as request_id;
  $$
);

-- JOB 4: Publish sessions + Send start notification (Saturday 7:00 PM EDT ≈ 23:00 UTC)
SELECT cron.schedule(
  'trivia-publish-sessions-saturday',
  '0 23 * * SAT',  -- Saturday at 23:00 UTC (7:00 PM EDT)
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-publish-weekly-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-webhook-signature', encode(
        hmac('{}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
        'hex'
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- JOB 5: Send start notification (Saturday 7:00 PM EDT ≈ 23:00 UTC)
SELECT cron.schedule(
  'send-trivia-start-saturday',
  '0 23 * * SAT',  -- Saturday at 23:00 UTC (7:00 PM EDT)
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-trivia-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-webhook-signature', encode(
        hmac('{"type": "start"}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
        'hex'
      )
    ),
    body := '{"type": "start"}'::jsonb
  ) as request_id;
  $$
);

-- JOB 6: Health check (Saturday morning 8:00 AM EDT ≈ 12:00 UTC)
SELECT cron.schedule(
  'trivia-health-check',
  '0 12 * * SAT',
  'SELECT * FROM run_trivia_health_check();'
);

-- JOB 7: Cleanup old data (Sunday 2:00 AM EDT ≈ 6:00 UTC)
SELECT cron.schedule(
  'archive-old-trivia',
  '0 6 * * SUN',
  'SELECT * FROM archive_old_trivia_sessions();'
);

-- Verify all jobs scheduled
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%trivia%' OR jobname LIKE '%wellness%'
ORDER BY jobname;

-- Expected output: 7 active jobs
-- 1. trivia-generate-sessions-weekly (0 18 * * FRI) - Friday 6:00 PM
-- 2. fetch-youtube-wellness-shorts-weekly (0 18 * * FRI) - Friday 6:00 PM
-- 3. send-trivia-reminder-saturday (50 22 * * SAT) - Saturday 6:50 PM
-- 4. trivia-publish-sessions-saturday (0 23 * * SAT) - Saturday 7:00 PM
-- 5. send-trivia-start-saturday (0 23 * * SAT) - Saturday 7:00 PM
-- 6. trivia-health-check (0 12 * * SAT) - Saturday 8:00 AM
-- 7. archive-old-trivia (0 6 * * SUN) - Sunday 2:00 AM


-- ===============================================
-- STEP 6: TEST AUTOMATION (OPTIONAL)
-- ===============================================

-- Manually trigger question generation (test only)
SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-generate-weekly-sessions',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'x-webhook-signature', encode(
      hmac('{}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
      'hex'
    )
  ),
  body := '{}'::jsonb
) as request_id;

-- Wait 5-10 seconds, then verify session created
SELECT 
  week_key,
  topics,
  status,
  jsonb_array_length(session_1_questions) as s1_count,
  jsonb_array_length(session_2_questions) as s2_count,
  jsonb_array_length(session_3_questions) as s3_count,
  created_at
FROM trivia_weekly_sessions
ORDER BY created_at DESC
LIMIT 1;

-- Expected output:
-- week_key   | topics                         | status | s1_count | s2_count | s3_count
-- 2025-10-25 | {science, history, pop culture} | draft  | 10       | 10       | 10

-- Manually trigger YouTube fetch (test only)
SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/fetch-youtube-wellness-shorts',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'x-webhook-signature', encode(
      hmac('{"scheduled": true}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
      'hex'
    )
  ),
  body := '{"scheduled": true}'::jsonb
) as request_id;

-- Wait 5-10 seconds, then verify videos created
SELECT 
  week_key,
  break_position,
  title,
  youtube_video_id,
  duration_seconds,
  created_at
FROM trivia_break_videos
ORDER BY created_at DESC
LIMIT 2;

-- Expected output:
-- week_key   | break_position | title                  | youtube_video_id | duration_seconds
-- 2025-10-25 | 1              | Box Breathing Exercise | inpok4MKVLM      | 45
-- 2025-10-25 | 2              | Mindfulness Minute     | 9xwazD5SyVg      | 50

-- Run health check
SELECT * FROM run_trivia_health_check();

-- Expected output: All components 'healthy'


-- ===============================================
-- STEP 7: MONITOR CRON JOB EXECUTION
-- ===============================================

-- View recent cron job runs
SELECT 
  j.jobname,
  r.start_time,
  r.end_time,
  r.status,
  r.return_message
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT * FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) r ON true
WHERE j.jobname LIKE '%trivia%' OR j.jobname LIKE '%wellness%'
ORDER BY r.start_time DESC;

-- View trivia logs
SELECT 
  created_at,
  week_key,
  event_type,
  status,
  message,
  metadata
FROM trivia_logs
ORDER BY created_at DESC
LIMIT 20;


-- ===============================================
-- STEP 8: TROUBLESHOOTING QUERIES
-- ===============================================

-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check app settings
SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';

-- Manually run health check
SELECT * FROM run_trivia_health_check();

-- Check last 10 cron executions
SELECT 
  j.jobname,
  j.schedule,
  j.active,
  r.start_time,
  r.status,
  r.return_message
FROM cron.job j
LEFT JOIN cron.job_run_details r ON r.jobid = j.jobid
WHERE j.jobname LIKE '%trivia%'
ORDER BY r.start_time DESC
LIMIT 10;

-- Re-enable a failed job
UPDATE cron.job SET active = true WHERE jobname = 'trivia-generate-sessions-weekly';


-- ===============================================
-- ✅ AUTOMATION COMPLETE!
-- ===============================================
-- 
-- Your Saturday 7:00 PM Trivia is now fully automated:
-- 
-- ✅ Friday 6 PM UTC: Questions generated (30 per week)
-- ✅ Friday 6 PM UTC: YouTube videos fetched (2 per week)
-- ✅ Saturday 11 PM UTC: Sessions published (~7 PM Detroit)
-- ✅ Saturday 8 AM UTC: Health check runs
-- ✅ Sunday 2 AM UTC: Old data archived (7+ days)
-- 
-- No manual intervention required! 🎉
-- 
-- ===============================================

-- View this week's trivia schedule
SELECT 
  'Questions' as component,
  week_key,
  status,
  topics,
  jsonb_array_length(session_1_questions) + 
  jsonb_array_length(session_2_questions) + 
  jsonb_array_length(session_3_questions) as total_questions
FROM trivia_weekly_sessions
WHERE week_key >= CURRENT_DATE
UNION ALL
SELECT 
  'Video Break ' || break_position::TEXT,
  week_key,
  'ready' as status,
  ARRAY[title] as topics,
  duration_seconds as total_questions
FROM trivia_break_videos
WHERE week_key >= CURRENT_DATE
ORDER BY week_key, component;
