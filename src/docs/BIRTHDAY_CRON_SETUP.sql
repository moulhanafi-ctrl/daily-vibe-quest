-- ============================================
-- Daily Birthday Notifications CRON Setup
-- ============================================
-- This sets up automated daily birthday emails at 8:00 AM America/Detroit

-- 1. Enable required extensions (run once)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Schedule the birthday notification job
-- Runs daily at 8:00 AM America/Detroit
select cron.schedule(
  'daily_birthday_notifications',
  '0 8 * * *',  -- 8:00 AM daily
  $$
  select net.http_post(
    url:='https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-birthday-notifications',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
    body:='{"dryRun":false}'::jsonb
  ) as request_id;
  $$
);

-- 3. Verify the job is scheduled
select * from cron.job where jobname = 'daily_birthday_notifications';

-- 4. Monitor birthday email logs
select 
  user_id,
  type,
  status,
  sent_at,
  error,
  metadata
from email_logs
where type = 'birthday'
order by sent_at desc
limit 20;

-- 5. Test the birthday function manually (dry run)
-- This will show who would receive emails without actually sending them
select net.http_post(
  url:='https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-birthday-notifications',
  headers:='{"Content-Type":"application/json"}'::jsonb,
  body:='{"dryRun":true}'::jsonb
) as request_id;

-- 6. Check for users with birthdays today
select 
  id,
  email,
  full_name,
  birth_date,
  timezone,
  marketing_opt_in
from profiles
where marketing_opt_in = true
  and birth_date is not null
  and extract(month from birth_date) = extract(month from current_date)
  and extract(day from birth_date) = extract(day from current_date);

-- ============================================
-- Monitoring & Troubleshooting
-- ============================================

-- View recent job runs
select 
  jobname,
  schedule,
  last_run_start_time,
  last_run_status
from cron.job_run_details
where jobname = 'daily_birthday_notifications'
order by last_run_start_time desc
limit 10;

-- Count birthday emails sent by day
select 
  date(sent_at) as send_date,
  count(*) as emails_sent,
  count(*) filter (where status = 'sent') as successful,
  count(*) filter (where status = 'failed') as failed
from email_logs
where type = 'birthday'
group by date(sent_at)
order by send_date desc
limit 30;

-- View failed birthday emails
select 
  sent_at,
  metadata->>'email' as recipient,
  metadata->>'full_name' as name,
  error
from email_logs
where type = 'birthday'
  and status = 'failed'
order by sent_at desc;

-- ============================================
-- Uninstall (if needed)
-- ============================================
-- To remove the cron job:
-- select cron.unschedule('daily_birthday_notifications');