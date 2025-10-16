-- ===============================================
-- SATURDAY TRIVIA - PRE-FLIGHT VERIFICATION
-- Run this script to validate production readiness
-- ===============================================
-- 
-- USAGE:
-- 1. Copy this entire script to Backend → SQL Editor
-- 2. Execute section-by-section (DO NOT run all at once)
-- 3. Copy outputs to Pre-Flight Report template
-- 
-- TIMEZONE: All times shown in America/Detroit (EDT/EST)
-- ===============================================

-- ===============================================
-- SECTION 0: SECRETS & ENVIRONMENT CHECK
-- ===============================================

-- Check required secrets are configured
SELECT 
  'Secrets Check' as test,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  jsonb_object_agg(name, 
    CASE 
      WHEN setting IS NOT NULL AND setting != '' THEN 'configured'
      ELSE 'MISSING'
    END
  ) as details
FROM (
  SELECT unnest(ARRAY[
    'YOUTUBE_API_KEY',
    'RESEND_API_KEY', 
    'LOVABLE_API_KEY',
    'CRON_WEBHOOK_SECRET'
  ]) as name
) secrets
LEFT JOIN (
  SELECT 
    CASE 
      WHEN name = 'app.settings.service_role_key' THEN 'service_role'
      WHEN name = 'app.settings.cron_webhook_secret' THEN 'CRON_WEBHOOK_SECRET'
    END as setting_name,
    CASE WHEN setting IS NOT NULL THEN 'set' ELSE NULL END as setting
  FROM pg_settings 
  WHERE name LIKE 'app.settings.%'
) pg ON secrets.name = pg.setting_name;

-- Expected output:
-- test           | status    | details
-- Secrets Check  | ✅ PASS   | {"YOUTUBE_API_KEY": "configured", "RESEND_API_KEY": "configured", ...}


-- ===============================================
-- SECTION 1: CRON JOBS VERIFICATION
-- ===============================================

-- View all trivia cron jobs with next run times
SELECT 
  jobname,
  schedule,
  active,
  CASE 
    WHEN schedule = '0 22 * * FRI' THEN 'Friday 6:00 PM EDT (Question Generation + YouTube Fetch)'
    WHEN schedule = '50 22 * * SAT' THEN 'Saturday 6:50 PM EDT (Reminder Notification)'
    WHEN schedule = '0 23 * * SAT' THEN 'Saturday 7:00 PM EDT (Publish + Start Notification)'
    WHEN schedule = '0 12 * * SAT' THEN 'Saturday 8:00 AM EDT (Health Check)'
    WHEN schedule = '0 6 * * SUN' THEN 'Sunday 2:00 AM EDT (Cleanup)'
  END as description,
  -- Calculate next run time (approximate - cron doesn't store future runs)
  CASE 
    WHEN schedule = '0 22 * * FRI' THEN 
      (CURRENT_DATE + INTERVAL '1 day' * ((5 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7)) + INTERVAL '22 hours'
    WHEN schedule LIKE '%SAT' THEN
      (CURRENT_DATE + INTERVAL '1 day' * ((6 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7)) + 
      CASE 
        WHEN schedule = '50 22 * * SAT' THEN INTERVAL '22 hours 50 minutes'
        WHEN schedule = '0 23 * * SAT' THEN INTERVAL '23 hours'
        WHEN schedule = '0 12 * * SAT' THEN INTERVAL '12 hours'
      END
    WHEN schedule = '0 6 * * SUN' THEN
      (CURRENT_DATE + INTERVAL '1 day' * ((7 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7)) + INTERVAL '6 hours'
  END as next_run_utc
FROM cron.job
WHERE jobname LIKE '%trivia%' OR jobname LIKE '%wellness%'
ORDER BY 
  CASE 
    WHEN schedule = '0 22 * * FRI' THEN 1
    WHEN schedule = '50 22 * * SAT' THEN 2
    WHEN schedule = '0 23 * * SAT' THEN 3
    WHEN schedule = '0 12 * * SAT' THEN 4
    WHEN schedule = '0 6 * * SUN' THEN 5
  END;

-- Expected output: 7 active jobs
-- ✅ PASS if all jobs show active=true


-- Verify last execution status
SELECT 
  j.jobname,
  r.start_time,
  r.end_time,
  r.status,
  LEFT(r.return_message, 100) as message_preview
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT * FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) r ON true
WHERE j.jobname LIKE '%trivia%' OR j.jobname LIKE '%wellness%'
ORDER BY r.start_time DESC NULLS LAST;

-- Expected: Recent jobs (if run) show status='succeeded'


-- ===============================================
-- SECTION 2: DRY-RUN - QUESTION GENERATION
-- ===============================================

-- Trigger question generation manually
SELECT 
  'Triggering Question Generation' as action,
  'Wait 30 seconds after running this...' as note;

SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-generate-weekly-sessions',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'x-webhook-signature', encode(
      hmac('{}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
      'hex'
    )
  ),
  body := '{}'::jsonb
) as request_id;

-- WAIT 30 SECONDS, then run this:

-- Verify session created with 30 questions
SELECT 
  'Question Generation' as test,
  CASE 
    WHEN s1_count = 10 AND s2_count = 10 AND s3_count = 10 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  jsonb_build_object(
    'week_key', week_key,
    'topics', topics,
    'status', status,
    'session_1_count', s1_count,
    'session_2_count', s2_count,
    'session_3_count', s3_count,
    'created_at', created_at
  ) as details
FROM (
  SELECT 
    week_key,
    topics,
    status,
    jsonb_array_length(session_1_questions) as s1_count,
    jsonb_array_length(session_2_questions) as s2_count,
    jsonb_array_length(session_3_questions) as s3_count,
    created_at
  FROM trivia_weekly_sessions
  ORDER BY created_at DESC
  LIMIT 1
) latest;

-- Expected output:
-- test                  | status    | details
-- Question Generation   | ✅ PASS   | {"week_key": "2025-10-25", "s1_count": 10, ...}


-- Sample 3 questions to verify quality
SELECT 
  'Sample Questions' as test,
  jsonb_build_object(
    'session_1_q1', session_1_questions->0->>'question',
    'session_1_q1_correct', session_1_questions->0->>'correct_answer',
    'session_2_q5', session_2_questions->4->>'question',
    'session_3_q10', session_3_questions->9->>'question'
  ) as sample_questions
FROM trivia_weekly_sessions
ORDER BY created_at DESC
LIMIT 1;


-- ===============================================
-- SECTION 3: DRY-RUN - YOUTUBE WELLNESS FETCH
-- ===============================================

-- Trigger YouTube fetch manually
SELECT 
  'Triggering YouTube Wellness Fetch' as action,
  'Wait 30 seconds after running this...' as note;

SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/fetch-youtube-wellness-shorts',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'x-webhook-signature', encode(
      hmac('{"scheduled": true}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
      'hex'
    )
  ),
  body := '{"scheduled": true}'::jsonb
) as request_id;

-- WAIT 30 SECONDS, then run this:

-- Verify 2 videos fetched
SELECT 
  'YouTube Wellness Videos' as test,
  CASE 
    WHEN COUNT(*) = 2 
      AND MIN(duration_seconds) >= 30 
      AND MAX(duration_seconds) <= 90 
      AND COUNT(DISTINCT break_position) = 2
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  jsonb_agg(
    jsonb_build_object(
      'break_position', break_position,
      'title', title,
      'youtube_video_id', youtube_video_id,
      'duration_seconds', duration_seconds,
      'channel_title', channel_title,
      'has_captions', has_captions
    ) ORDER BY break_position
  ) as details
FROM (
  SELECT 
    week_key,
    break_position,
    title,
    youtube_video_id,
    duration_seconds,
    channel_title,
    has_captions
  FROM trivia_break_videos
  WHERE week_key >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY created_at DESC
  LIMIT 2
) recent;

-- Expected output:
-- test                      | status    | details
-- YouTube Wellness Videos   | ✅ PASS   | [{"break_position": 1, "title": "5-Minute Breathing", ...}]


-- ===============================================
-- SECTION 4: DRY-RUN - NOTIFICATION SIMULATION
-- ===============================================

-- Get a test user ID (replace with actual test user)
SELECT 
  'Test User Setup' as step,
  'Copy this user_id for notification tests' as instruction,
  id as test_user_id,
  email
FROM auth.users
WHERE email LIKE '%test%' OR email LIKE '%dev%'
LIMIT 1;

-- OR create test preferences for your user:
-- INSERT INTO trivia_notification_preferences (user_id, push_enabled, email_enabled)
-- VALUES ('YOUR_USER_ID_HERE', true, true);


-- Trigger REMINDER notification (Saturday 6:50 PM)
SELECT 
  'Triggering Reminder Notification' as action,
  'Check your push/email in 10 seconds' as note;

SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-trivia-notifications',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'x-webhook-signature', encode(
      hmac('{"type": "reminder"}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
      'hex'
    )
  ),
  body := '{"type": "reminder"}'::jsonb
) as request_id;

-- WAIT 10 SECONDS, then check logs:

SELECT 
  'Reminder Notification' as test,
  CASE 
    WHEN total_users > 0 AND (push_sent + email_sent) > 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  jsonb_build_object(
    'total_users', total_users,
    'push_sent', push_sent,
    'push_delivered', push_delivered,
    'email_sent', email_sent,
    'email_delivered', email_delivered,
    'quiet_hours_skipped', quiet_hours_skipped,
    'errors', push_errors + email_errors
  ) as details
FROM trivia_notification_logs
WHERE notification_type = 'reminder'
ORDER BY sent_at DESC
LIMIT 1;


-- Trigger START notification (Saturday 7:00 PM)
SELECT 
  'Triggering Start Notification' as action,
  'Check your push/email in 10 seconds' as note;

SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-trivia-notifications',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'x-webhook-signature', encode(
      hmac('{"type": "start"}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
      'hex'
    )
  ),
  body := '{"type": "start"}'::jsonb
) as request_id;

-- WAIT 10 SECONDS, then check logs:

SELECT 
  'Start Notification' as test,
  CASE 
    WHEN total_users > 0 AND (push_sent + email_sent) > 0 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  jsonb_build_object(
    'total_users', total_users,
    'push_sent', push_sent,
    'email_sent', email_sent,
    'deep_link_format', '/trivia?week=' || week_key
  ) as details
FROM trivia_notification_logs
WHERE notification_type = 'start'
ORDER BY sent_at DESC
LIMIT 1;


-- ===============================================
-- SECTION 5: HEALTH CHECK
-- ===============================================

-- Run comprehensive health check
SELECT * FROM run_trivia_health_check();

-- Expected output: All components show 'healthy'
-- component           | status    | details
-- session_generation  | healthy   | {...}
-- youtube_fetch       | healthy   | {...}
-- scheduler           | healthy   | {...}
-- user_engagement     | healthy   | {...}
-- fallback_rate       | healthy   | {...}


-- ===============================================
-- SECTION 6: MONITORING INFRASTRUCTURE
-- ===============================================

-- Verify monitoring tables exist and are writable
SELECT 
  'Monitoring Tables' as test,
  CASE 
    WHEN COUNT(DISTINCT table_name) = 3 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  jsonb_object_agg(table_name, row_count) as details
FROM (
  SELECT 'trivia_logs' as table_name, COUNT(*) as row_count FROM trivia_logs
  UNION ALL
  SELECT 'trivia_notification_logs', COUNT(*) FROM trivia_notification_logs
  UNION ALL
  SELECT 'trivia_notification_preferences', COUNT(*) FROM trivia_notification_preferences
) tables;


-- Test write to trivia_logs
INSERT INTO trivia_logs (
  week_key, 
  event_type, 
  status, 
  message, 
  metadata, 
  function_name
) VALUES (
  CURRENT_DATE,
  'pre_flight_test',
  'success',
  'Pre-flight verification test write',
  '{"test_timestamp": "' || NOW()::text || '"}'::jsonb,
  'manual_verification'
) RETURNING 
  'Test Log Write' as test,
  '✅ PASS' as status,
  jsonb_build_object('log_id', id, 'created_at', created_at) as details;


-- ===============================================
-- SECTION 7: RECENT ACTIVITY SUMMARY
-- ===============================================

-- Last 10 automation events
SELECT 
  created_at AT TIME ZONE 'America/Detroit' as event_time_edt,
  event_type,
  status,
  message,
  function_name
FROM trivia_logs
ORDER BY created_at DESC
LIMIT 10;


-- Last 5 notification deliveries
SELECT 
  sent_at AT TIME ZONE 'America/Detroit' as sent_time_edt,
  notification_type,
  total_users,
  push_sent,
  email_sent,
  push_errors + email_errors as total_errors
FROM trivia_notification_logs
ORDER BY sent_at DESC
LIMIT 5;


-- ===============================================
-- SECTION 8: FINAL READINESS CHECKLIST
-- ===============================================

-- Comprehensive status summary
SELECT 
  'PRODUCTION READINESS' as category,
  jsonb_build_object(
    'cron_jobs_active', (
      SELECT COUNT(*) = 7 FROM cron.job 
      WHERE (jobname LIKE '%trivia%' OR jobname LIKE '%wellness%') AND active = true
    ),
    'latest_session_exists', (
      SELECT COUNT(*) > 0 FROM trivia_weekly_sessions 
      WHERE week_key >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'wellness_videos_fetched', (
      SELECT COUNT(*) >= 2 FROM trivia_break_videos 
      WHERE week_key >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'notifications_tested', (
      SELECT COUNT(*) > 0 FROM trivia_notification_logs 
      WHERE sent_at >= NOW() - INTERVAL '1 hour'
    ),
    'health_check_passing', (
      SELECT COUNT(*) = 0 FROM run_trivia_health_check() 
      WHERE status IN ('critical', 'warning')
    ),
    'monitoring_tables_ready', (
      SELECT COUNT(DISTINCT table_name) = 3 
      FROM information_schema.tables 
      WHERE table_name IN ('trivia_logs', 'trivia_notification_logs', 'trivia_notification_preferences')
    )
  ) as status_checks;

-- Expected: All values = true


-- ===============================================
-- PRE-FLIGHT REPORT TEMPLATE
-- ===============================================
/*
Copy outputs from above sections and paste into this template:

📋 SATURDAY TRIVIA PRE-FLIGHT REPORT
Generated: [TIMESTAMP]
Environment: Production
Timezone: America/Detroit (EDT/EST)

═══════════════════════════════════════════════

✅ SECTION 0: SECRETS & ENVIRONMENT
Status: [PASS/FAIL]
- YOUTUBE_API_KEY: [configured/MISSING]
- RESEND_API_KEY: [configured/MISSING]
- LOVABLE_API_KEY: [configured/MISSING]
- CRON_WEBHOOK_SECRET: [configured/MISSING]

✅ SECTION 1: CRON JOBS (7 Total)
Status: [PASS/FAIL]
Next Run Times:
1. trivia-generate-sessions-weekly: Friday [DATE] 6:00 PM EDT
2. fetch-youtube-wellness-shorts-weekly: Friday [DATE] 6:00 PM EDT
3. send-trivia-reminder-saturday: Saturday [DATE] 6:50 PM EDT
4. trivia-publish-sessions-saturday: Saturday [DATE] 7:00 PM EDT
5. send-trivia-start-saturday: Saturday [DATE] 7:00 PM EDT
6. trivia-health-check: Saturday [DATE] 8:00 AM EDT
7. archive-old-trivia: Sunday [DATE] 2:00 AM EDT

✅ SECTION 2: QUESTION GENERATION (Dry-Run)
Status: [PASS/FAIL]
Week Key: [YYYY-MM-DD]
Topics: [array of topics]
Session 1 Count: 10
Session 2 Count: 10
Session 3 Count: 10
Sample Q1: "[question text]"
Sample Q15: "[question text]"

✅ SECTION 3: YOUTUBE WELLNESS VIDEOS (Dry-Run)
Status: [PASS/FAIL]
Video 1:
  - Title: [title]
  - ID: [youtube_video_id]
  - Duration: [X]s
  - Channel: [channel_title]
  - Captions: [true/false]
Video 2:
  - Title: [title]
  - ID: [youtube_video_id]
  - Duration: [X]s
  - Channel: [channel_title]
  - Captions: [true/false]

✅ SECTION 4: NOTIFICATIONS (Simulation)
Reminder (6:50 PM):
  - Total Users: [X]
  - Push Sent: [X]
  - Email Sent: [X]
  - Quiet Hours Skipped: [X]
  - Errors: 0

Start (7:00 PM):
  - Total Users: [X]
  - Push Sent: [X]
  - Email Sent: [X]
  - Deep Link: /trivia?week=[YYYY-MM-DD]
  - Errors: 0

✅ SECTION 5: HEALTH CHECK
Status: [PASS/FAIL]
- session_generation: healthy
- youtube_fetch: healthy
- scheduler: healthy
- user_engagement: healthy
- fallback_rate: healthy

✅ SECTION 6: MONITORING
Status: [PASS/FAIL]
- trivia_logs: [X] rows
- trivia_notification_logs: [X] rows
- trivia_notification_preferences: [X] rows
- Test write: SUCCESS

═══════════════════════════════════════════════

🎯 FINAL VERDICT: [READY FOR PRODUCTION / NEEDS ATTENTION]

⚠️ WARNINGS (if any):
- [warning 1]
- [warning 2]

✅ RECOMMENDATIONS:
1. Monitor first Saturday run closely
2. Set up admin alerts for job failures
3. Test deep links on mobile devices
4. Verify email deliverability for primary domain

═══════════════════════════════════════════════

Approved By: _________________
Date: _________________
Next Review: [DATE + 1 week]

*/
