-- Setup cron job for automated health checks
-- Run this SQL in your Supabase SQL Editor

-- Enable pg_cron extension (if not already enabled)
-- You may need to enable this in Supabase Dashboard → Database → Extensions

-- Create cron job to run health checks every 15 minutes
SELECT cron.schedule(
  'run-health-checks-every-15min',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url:='https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/run-health-checks',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{"triggered_by": "cron"}'::jsonb
  ) as request_id;
  $$
);

-- To verify the cron job was created:
SELECT * FROM cron.job WHERE jobname = 'run-health-checks-every-15min';

-- To unschedule (if needed):
-- SELECT cron.unschedule('run-health-checks-every-15min');

-- To see cron job history:
-- SELECT * FROM cron.job_run_details WHERE jobid = (
--   SELECT jobid FROM cron.job WHERE jobname = 'run-health-checks-every-15min'
-- ) ORDER BY start_time DESC LIMIT 20;
