-- ===================================================================
-- Daily Push Notification Cron Setup for Vibe Check
-- ===================================================================
-- Schedule: Daily at 9:00 AM America/Detroit
-- Function: send-daily-notification
-- Features: Quiet hours, email fallback, deduplication, health checks
-- ===================================================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 2: Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Step 3: Remove any existing job (if updating)
SELECT cron.unschedule('send-daily-notifications-9am');
SELECT cron.unschedule('daily_push_0900_et');

-- Step 4: Schedule the daily push notification job at 9:00 AM ET
SELECT cron.schedule(
  'daily_push_0900_et',
  '0 9 * * *', -- Runs at 9:00 AM server time (configure server TZ to America/Detroit)
  $$
  SELECT
    net.http_post(
      url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
      body := '{"dryRun": false}'::jsonb
    ) as request_id;
  $$
);

-- Step 5: Verify the job was created
SELECT 
  jobid, 
  jobname, 
  schedule, 
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'daily_push_0900_et';

-- Expected output:
-- jobname: daily_push_0900_et
-- schedule: 0 9 * * *
-- active: true

-- ===================================================================
-- Testing & Monitoring
-- ===================================================================

-- Manual test trigger (runs immediately):
SELECT
  net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
    body := '{"dryRun": false}'::jsonb
  ) as request_id;

-- View recent cron job runs:
SELECT 
  runid,
  jobid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily_push_0900_et')
ORDER BY start_time DESC
LIMIT 10;


-- Check notification delivery logs:
SELECT 
  nl.id,
  nl.user_id,
  nl.notification_type,
  nl.channel,
  nl.status,
  nl.sent_at,
  nl.delivered_at,
  nl.opened_at,
  nl.error_message,
  dm.message_title,
  u.email
FROM notification_logs nl
LEFT JOIN daily_messages dm ON nl.message_id = dm.id
LEFT JOIN auth.users u ON nl.user_id = u.id
WHERE nl.notification_type = 'daily_motivation'
ORDER BY nl.sent_at DESC
LIMIT 20;

-- ===================================================================
-- Health Check
-- ===================================================================

-- Test the health endpoint (use this URL in browser or curl):
-- https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification/health

-- Expected response:
-- {
--   "ok": true,
--   "db_connected": true,
--   "push_subscriptions_count": 5,
--   "daily_messages_count": 7,
--   "vapid_configured": true,
--   "email_fallback_configured": true,
--   "timestamp": "2025-10-17T09:00:00.000Z"
-- }

-- ===================================================================
-- Troubleshooting
-- ===================================================================

-- If cron is not running:
-- 1. Check if pg_cron extension is enabled:
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- 2. Check if job exists and is active:
SELECT * FROM cron.job WHERE jobname = 'daily_push_0900_et';

-- 3. Check recent run history for errors:
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily_push_0900_et')
ORDER BY start_time DESC LIMIT 5;

-- If notifications are not being received:
-- 1. Check notification preferences:
SELECT * FROM notification_prefs WHERE user_id = 'YOUR_USER_ID';

-- 2. Check notification logs:
SELECT * FROM notification_logs 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY sent_at DESC LIMIT 10;

-- 3. Check push subscriptions:
SELECT * FROM push_subscriptions WHERE user_id = 'YOUR_USER_ID';

-- View notification statistics (last 7 days):
SELECT 
  DATE(sent_at) as date,
  status,
  channel,
  COUNT(*) as count
FROM notification_logs
WHERE notification_type = 'daily_motivation'
  AND sent_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), status, channel
ORDER BY date DESC, status;

-- ===================================================================
-- Acceptance Criteria Checklist
-- ===================================================================
-- [ ] Cron job 'daily_push_0900_et' created and active
-- [ ] Next run shows 09:00 America/Detroit
-- [ ] Health endpoint returns 200 OK with all checks passing
-- [ ] Test notification sent within 5 seconds
-- [ ] Notification click opens correct deep link (/check-in or /daily-vibe)
-- [ ] Logs show: sent -> delivered -> opened
-- [ ] Email fallback works when push fails
-- [ ] Quiet hours are respected
-- [ ] No duplicate notifications same day
-- [ ] Telemetry logs: daily_job_started, daily_job_completed, push_sent, push_failed