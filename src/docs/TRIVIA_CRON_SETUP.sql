-- =============================================
-- Saturday Trivia - Cron Job Setup
-- =============================================
-- Run this SQL in Supabase SQL Editor to enable automated weekly generation

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Remove any existing schedules (in case re-running)
SELECT cron.unschedule('trivia-generate-weekly-rounds');
SELECT cron.unschedule('trivia-publish-rounds');

-- Step 3: Schedule weekly generation (Friday 6pm UTC)
-- IMPORTANT: Adjust the time based on your timezone
-- Format: 'minute hour day month weekday'
-- Example: '0 18 * * 5' = Every Friday at 6:00 PM UTC
SELECT cron.schedule(
  'trivia-generate-weekly-rounds',
  '0 18 * * 5',  -- Friday 6pm UTC (adjust as needed)
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-generate-weekly-rounds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA'
    )
  ) as request_id;
  $$
);

-- Step 4: Schedule publishing (Saturday 9:55am UTC)
-- This publishes approved rounds 5 minutes before notifications
SELECT cron.schedule(
  'trivia-publish-rounds',
  '55 9 * * 6',  -- Saturday 9:55am UTC (adjust as needed)
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-publish-rounds',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA'
    )
  ) as request_id;
  $$
);

-- Step 5: Verify cron jobs were created
SELECT * FROM cron.job WHERE jobname LIKE 'trivia%';

-- Expected output:
-- | jobid | schedule     | command                 | nodename | nodeport | database | username | active | jobname                         |
-- |-------|--------------|-------------------------|----------|----------|----------|----------|--------|---------------------------------|
-- | 1     | 0 18 * * 5   | SELECT net.http_post... | ...      | ...      | ...      | ...      | t      | trivia-generate-weekly-rounds   |
-- | 2     | 55 9 * * 6   | SELECT net.http_post... | ...      | ...      | ...      | ...      | t      | trivia-publish-rounds           |

-- =============================================
-- Monitoring & Testing
-- =============================================

-- View cron job execution history
SELECT 
  jobid,
  jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname LIKE 'trivia%'
ORDER BY start_time DESC
LIMIT 10;

-- Manually trigger generation (for testing)
SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-generate-weekly-rounds',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA'
  )
) as request_id;

-- Check generation logs
SELECT 
  week,
  age_group,
  locale,
  status,
  array_length(kept_ids, 1) as questions_kept,
  jsonb_array_length(dropped_reasons) as questions_dropped,
  created_at
FROM trivia_generation_log
ORDER BY created_at DESC
LIMIT 20;

-- Check pending rounds (waiting for approval)
SELECT 
  date,
  age_group,
  locale,
  published,
  array_length(question_ids, 1) as question_count
FROM trivia_rounds
WHERE published = false
ORDER BY date DESC;

-- =============================================
-- Timezone Conversion Helper
-- =============================================
-- Your local time -> UTC conversion examples:
-- 
-- EST (UTC-5):  6:00 PM EST = 11:00 PM UTC  -> '0 23 * * 5'
-- PST (UTC-8):  6:00 PM PST =  2:00 AM UTC  -> '0 2 * * 6' (next day!)
-- CET (UTC+1):  6:00 PM CET =  5:00 PM UTC  -> '0 17 * * 5'
-- 
-- Use this SQL to check your current timezone:
SELECT now() AT TIME ZONE 'UTC' as utc_time, 
       now() as local_time;

-- =============================================
-- Troubleshooting
-- =============================================

-- If jobs aren't running:
-- 1. Check pg_cron extension: SELECT * FROM pg_extension WHERE extname = 'pg_cron';
-- 2. Check pg_net extension: SELECT * FROM pg_extension WHERE extname = 'pg_net';
-- 3. Verify job is active: SELECT * FROM cron.job WHERE active = true;
-- 4. Check logs: SELECT * FROM cron.job_run_details WHERE status != 'succeeded';

-- To delete and recreate a job:
-- SELECT cron.unschedule('trivia-generate-weekly-rounds');
-- Then run the schedule command again

-- =============================================
-- Notes
-- =============================================
-- - Existing notification jobs (Sat 10am, Sun 4pm) remain unchanged
-- - Generation creates rounds with published=false
-- - Publishing only publishes approved rounds (or all if review disabled)
-- - Fallback questions will be used if generation fails