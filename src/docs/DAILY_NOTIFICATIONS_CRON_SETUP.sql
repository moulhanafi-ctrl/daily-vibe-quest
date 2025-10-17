-- Daily Notifications Cron Setup
-- This SQL script sets up automated daily push notifications for all active users

-- Prerequisites:
-- 1. Ensure pg_cron extension is enabled
-- 2. Ensure pg_net extension is enabled
-- 3. Have your SUPABASE_URL and SUPABASE_ANON_KEY ready

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Unschedule any existing daily notification jobs
SELECT cron.unschedule('send-daily-notifications-9am');

-- Schedule daily notifications to run at 9:00 AM America/Detroit time
-- This will send motivational messages to all users with daily notifications enabled
SELECT cron.schedule(
  'send-daily-notifications-9am',
  '0 9 * * *', -- Every day at 9:00 AM
  $$
  SELECT
    net.http_post(
      url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
      body := '{"triggered_by": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'send-daily-notifications-9am';

-- View cron job runs (for monitoring)
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-daily-notifications-9am')
-- ORDER BY start_time DESC 
-- LIMIT 10;

-- To manually trigger the notification (for testing):
-- SELECT
--   net.http_post(
--     url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
--     body := '{"triggered_by": "manual"}'::jsonb
--   );

-- Check recent notification logs
-- SELECT 
--   nl.*,
--   dm.message_title,
--   u.email
-- FROM notification_logs nl
-- LEFT JOIN daily_messages dm ON nl.message_id = dm.id
-- LEFT JOIN auth.users u ON nl.user_id = u.id
-- WHERE nl.notification_type = 'daily_motivation'
-- ORDER BY nl.sent_at DESC
-- LIMIT 20;

-- View notification statistics
-- SELECT 
--   DATE(sent_at) as date,
--   status,
--   channel,
--   COUNT(*) as count
-- FROM notification_logs
-- WHERE notification_type = 'daily_motivation'
--   AND sent_at > NOW() - INTERVAL '7 days'
-- GROUP BY DATE(sent_at), status, channel
-- ORDER BY date DESC, status;
