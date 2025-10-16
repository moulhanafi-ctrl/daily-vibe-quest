-- ========================================
-- SESSION TRIVIA CRON JOB SETUP
-- Saturday 7:00 PM America/Detroit
-- ========================================
-- This SQL sets up automated weekly cron jobs for the Session Trivia feature
-- Run this in your Supabase SQL Editor or via migration

-- STEP 1: Enable required extensions
SELECT cron.schedule(
  'trivia-generate-sessions-weekly',
  '0 18 * * FRI',  -- Friday 6:00 PM UTC (= ~1:00 PM Detroit during EST, ~2:00 PM EDT)
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-generate-weekly-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-webhook-signature', encode(
        hmac(
          '{}',
          current_setting('app.settings.cron_webhook_secret'),
          'sha256'
        ),
        'hex'
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- STEP 2: Schedule publishing for Saturday 7:00 PM Detroit time
-- Saturday 7:00 PM Detroit = 11:00 PM UTC (EST) or 12:00 AM UTC next day (EDT)
-- Using Saturday 11:50 PM UTC to be safe during EST
SELECT cron.schedule(
  'trivia-publish-sessions-saturday',
  '50 23 * * SAT',  -- Saturday 11:50 PM UTC (= 6:50 PM Detroit EST, 7:50 PM EDT)
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-publish-weekly-sessions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-webhook-signature', encode(
        hmac(
          '{}',
          current_setting('app.settings.cron_webhook_secret'),
          'sha256'
        ),
        'hex'
      )
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- ========================================
-- MONITORING QUERIES
-- ========================================

-- View scheduled jobs
SELECT * FROM cron.job 
WHERE jobname IN ('trivia-generate-sessions-weekly', 'trivia-publish-sessions-saturday');

-- View job run history (last 10 runs)
SELECT * FROM cron.job_run_details 
WHERE jobid IN (
  SELECT jobid FROM cron.job 
  WHERE jobname IN ('trivia-generate-sessions-weekly', 'trivia-publish-sessions-saturday')
)
ORDER BY start_time DESC 
LIMIT 10;

-- Check most recent session generation
SELECT 
  week_key,
  status,
  topics,
  jsonb_array_length(session_1_questions) as s1_count,
  jsonb_array_length(session_2_questions) as s2_count,
  jsonb_array_length(session_3_questions) as s3_count,
  created_at,
  published_at
FROM trivia_weekly_sessions
ORDER BY week_key DESC
LIMIT 5;

-- Check break videos
SELECT 
  week_key,
  break_position,
  title,
  duration_seconds,
  created_at
FROM trivia_break_videos
ORDER BY week_key DESC, break_position
LIMIT 10;

-- Check user progress
SELECT 
  u.email,
  tsp.week_key,
  tsp.session_number,
  tsp.score,
  tsp.completed_at
FROM trivia_session_progress tsp
JOIN auth.users u ON u.id = tsp.user_id
ORDER BY tsp.completed_at DESC
LIMIT 20;

-- ========================================
-- MANUAL TESTING
-- ========================================

-- Manually trigger generation (for testing)
SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-generate-weekly-sessions',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'x-webhook-signature', encode(
      hmac(
        '{}',
        current_setting('app.settings.cron_webhook_secret'),
        'sha256'
      ),
      'hex'
    )
  ),
  body := '{}'::jsonb
);

-- Manually trigger publishing (for testing)
SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-publish-weekly-sessions',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'x-webhook-signature', encode(
      hmac(
        '{}',
        current_setting('app.settings.cron_webhook_secret'),
        'sha256'
      ),
      'hex'
    )
  ),
  body := '{}'::jsonb
);

-- ========================================
-- TIMEZONE NOTES
-- ========================================
-- America/Detroit observes Eastern Time:
-- - EST (UTC-5): First Sunday in November to second Sunday in March
-- - EDT (UTC-4): Second Sunday in March to first Sunday in November
--
-- For Saturday 7:00 PM Detroit time:
-- - During EST: 12:00 AM UTC Sunday (next day)
-- - During EDT: 11:00 PM UTC Saturday
--
-- The cron job at 11:50 PM UTC Saturday ensures it runs:
-- - 6:50 PM Detroit during EST (10 min before target)
-- - 7:50 PM Detroit during EDT (50 min after target, but same Saturday)
--
-- For more precise timing, consider using a timezone-aware cron library
-- or running the edge function with timezone logic built-in.

-- ========================================
-- TROUBLESHOOTING
-- ========================================

-- Unschedule jobs (if you need to recreate them)
SELECT cron.unschedule('trivia-generate-sessions-weekly');
SELECT cron.unschedule('trivia-publish-sessions-saturday');

-- Check if extensions are enabled
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');

-- Check cron job activity
SELECT 
  j.jobname,
  j.schedule,
  j.active,
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
WHERE j.jobname LIKE 'trivia%'
ORDER BY j.jobname;