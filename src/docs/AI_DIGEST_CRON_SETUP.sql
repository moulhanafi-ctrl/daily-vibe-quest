-- AI Generation Digest Cron Job Setup
-- This SQL script sets up twice-daily cron jobs for AI generation digest notifications

-- Enable required extensions
SELECT cron.schedule(
  'ai-digest-morning',
  '0 9 * * *', -- 9:00 AM America/Detroit
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-ai-generation-digests',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
    body := '{"manual": false}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'ai-digest-evening',
  '0 18 * * *', -- 6:00 PM America/Detroit
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-ai-generation-digests',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
    body := '{"manual": false}'::jsonb
  );
  $$
);

-- Verify jobs were created
SELECT * FROM cron.job WHERE jobname IN ('ai-digest-morning', 'ai-digest-evening');

-- Monitor job runs
SELECT * FROM cron.job_run_details 
WHERE jobid IN (
  SELECT jobid FROM cron.job 
  WHERE jobname IN ('ai-digest-morning', 'ai-digest-evening')
)
ORDER BY start_time DESC 
LIMIT 20;

-- View digest job logs
SELECT * FROM public.digest_job_logs
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
  n.payload_json->>'title' as title
FROM public.notifications n
WHERE n.type = 'ai_digest'
ORDER BY n.sent_at DESC
LIMIT 20;

-- Count notifications by status
SELECT 
  status,
  channel,
  COUNT(*) as count
FROM public.notifications
WHERE type = 'ai_digest'
  AND sent_at > NOW() - INTERVAL '24 hours'
GROUP BY status, channel;

-- To manually trigger for testing:
-- SELECT net.http_post(
--   url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-ai-generation-digests',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--   body := '{"manual": true}'::jsonb
-- );

-- To remove jobs (if needed):
-- SELECT cron.unschedule('ai-digest-morning');
-- SELECT cron.unschedule('ai-digest-evening');
