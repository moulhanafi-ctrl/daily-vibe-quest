-- Setup instructions for YouTube Wellness Shorts cron job
-- Run this SQL in your Supabase SQL Editor to schedule the edge function

-- STEP 1: Enable required extensions (if not already enabled)
-- This allows scheduling and HTTP requests from Postgres
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- STEP 2: Schedule the function to run every Friday at 6:00 PM Detroit time
-- This ensures videos are ready before Saturday 7 PM trivia session
-- Cron schedule: '0 18 * * 5' means "At 18:00 on Friday" (UTC)
-- Adjust timezone as needed - Detroit is UTC-5 (EST) or UTC-4 (EDT)

SELECT cron.schedule(
  'fetch-youtube-wellness-shorts-weekly',
  '0 23 * * 5', -- 6:00 PM EST = 23:00 UTC (adjust for EDT)
  $$
  SELECT
    net.http_post(
        url:='https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/fetch-youtube-wellness-shorts',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
          'x-webhook-signature', encode(
            hmac(
              '{"scheduled": true}'::text,
              current_setting('app.settings.cron_secret'),
              'sha256'
            ),
            'hex'
          )
        ),
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- STEP 3: Verify the cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'fetch-youtube-wellness-shorts-weekly';

-- STEP 4: (Optional) Manually trigger the function for testing
SELECT
  net.http_post(
      url:='https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/fetch-youtube-wellness-shorts',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'x-webhook-signature', encode(
          hmac(
            '{"test": true}'::text,
            current_setting('app.settings.cron_secret'),
            'sha256'
          ),
          'hex'
        )
      ),
      body:='{"test": true}'::jsonb
  ) as request_id;

-- STEP 5: (Optional) Remove the cron job
-- SELECT cron.unschedule('fetch-youtube-wellness-shorts-weekly');

-- NOTES:
-- 1. The function will fetch 2 YouTube wellness shorts (30-60 seconds each)
-- 2. If YOUTUBE_API_KEY is set, it fetches from curated wellness channels
-- 3. If YOUTUBE_API_KEY is missing or API fails, it uses fallback videos
-- 4. Videos are saved with captions on by default and channel attribution
-- 5. The trivia flow will load these videos between sessions 1-2 and 2-3
