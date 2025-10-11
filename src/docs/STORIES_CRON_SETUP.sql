-- Family Stories Auto-Cleanup Cron Job
-- This script sets up automatic cleanup of expired stories every day at 2 AM

-- Prerequisites:
-- 1. Enable pg_cron extension in Supabase dashboard
-- 2. Enable pg_net extension in Supabase dashboard
-- 3. Replace YOUR_SERVICE_ROLE_KEY with actual service role key

-- Create the cron job
SELECT cron.schedule(
  'cleanup-expired-stories-daily',
  '0 2 * * *', -- Run at 2 AM UTC daily
  $$
  SELECT net.http_post(
    url:='https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/cleanup-expired-stories',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule job (if needed)
-- SELECT cron.unschedule('cleanup-expired-stories-daily');

-- Manual test run (optional)
-- SELECT net.http_post(
--   url:='https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/cleanup-expired-stories',
--   headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--   body:='{}'::jsonb
-- );
