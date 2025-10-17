-- Daily AI Messages Cron Job Setup
-- Sends AI-generated support messages from Mostapha twice daily

-- KICKOFF: Send first batch tonight at 8:00 PM America/Detroit (2025-10-17)
SELECT cron.schedule(
  'daily-ai-messages-kickoff',
  '0 20 17 10 *', -- 8:00 PM on October 17
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-ai-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
    body := '{"windowType": "kickoff"}'::jsonb
  );
  $$
);

-- DAILY: Morning messages at 9:00 AM America/Detroit
SELECT cron.schedule(
  'daily-ai-messages-morning',
  '0 9 * * *', -- 9:00 AM daily
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-ai-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
    body := '{"windowType": "morning"}'::jsonb
  );
  $$
);

-- DAILY: Evening messages at 8:00 PM America/Detroit
SELECT cron.schedule(
  'daily-ai-messages-evening',
  '0 20 * * *', -- 8:00 PM daily
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-ai-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
    body := '{"windowType": "evening"}'::jsonb
  );
  $$
);

-- Verify jobs were created
SELECT * FROM cron.job 
WHERE jobname IN ('daily-ai-messages-kickoff', 'daily-ai-messages-morning', 'daily-ai-messages-evening');

-- Monitor job runs
SELECT * FROM cron.job_run_details 
WHERE jobid IN (
  SELECT jobid FROM cron.job 
  WHERE jobname IN ('daily-ai-messages-kickoff', 'daily-ai-messages-morning', 'daily-ai-messages-evening')
)
ORDER BY start_time DESC 
LIMIT 20;

-- View message job logs
SELECT * FROM public.daily_ai_message_logs
ORDER BY run_time DESC
LIMIT 10;

-- View recent notifications sent
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.channel,
  n.status,
  n.sent_at,
  n.payload_json->>'title' as title,
  n.payload_json->>'message' as message
FROM public.notifications n
WHERE n.type = 'daily_ai_message'
ORDER BY n.sent_at DESC
LIMIT 20;

-- Count notifications by status
SELECT 
  status,
  channel,
  COUNT(*) as count
FROM public.notifications
WHERE type = 'daily_ai_message'
  AND sent_at > NOW() - INTERVAL '24 hours'
GROUP BY status, channel;

-- To manually trigger for testing:
-- SELECT net.http_post(
--   url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-ai-messages',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--   body := '{"windowType": "manual"}'::jsonb
-- );

-- To remove jobs after kickoff (optional, run after Oct 17):
-- SELECT cron.unschedule('daily-ai-messages-kickoff');

-- To remove all jobs (if needed):
-- SELECT cron.unschedule('daily-ai-messages-kickoff');
-- SELECT cron.unschedule('daily-ai-messages-morning');
-- SELECT cron.unschedule('daily-ai-messages-evening');
