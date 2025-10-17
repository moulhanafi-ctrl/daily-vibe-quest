# Notifications System Finalization Guide

## Overview
This guide walks through the final steps to deploy and verify the complete notifications system:
- Welcome emails (on signup)
- Birthday emails (daily at 8:00 AM ET)
- Daily push notifications (daily at 9:00 AM ET)

---

## 1. Verify Secrets Configuration

All required secrets should now be set in Lovable Cloud:

```
✅ RESEND_API_KEY
✅ WELCOME_FROM_EMAIL
✅ BIRTHDAY_FROM_EMAIL
✅ ADMIN_EMAIL
✅ VAPID_PUBLIC_KEY
✅ VAPID_PRIVATE_KEY
```

You can verify these are set by checking the Backend > Secrets section.

---

## 2. Schedule CRON Jobs

### A. Birthday Notifications (Daily at 8:00 AM ET)

Run this SQL in your Backend SQL editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule birthday notifications (8:00 AM America/Detroit)
SELECT cron.schedule(
  'daily_birthday_notifications',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-birthday-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA'
    ),
    body := jsonb_build_object('dryRun', false)
  ) as request_id;
  $$
);
```

### B. Daily Push Notifications (Daily at 9:00 AM ET)

Run this SQL in your Backend SQL editor:

```sql
-- Remove any existing job
SELECT cron.unschedule('daily_push_0900_et') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily_push_0900_et'
);

-- Schedule daily push notifications (9:00 AM America/Detroit)
SELECT cron.schedule(
  'daily_push_0900_et',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA'
    ),
    body := jsonb_build_object('scheduledTime', NOW()::text)
  ) as request_id;
  $$
);
```

### C. Verify CRON Jobs

Confirm both jobs are scheduled correctly:

```sql
-- View all scheduled jobs
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  timezone
FROM cron.job
WHERE jobname IN ('daily_birthday_notifications', 'daily_push_0900_et')
ORDER BY jobname;

-- View next run times
SELECT 
  jobname,
  schedule,
  timezone,
  (SELECT now() AT TIME ZONE 'America/Detroit') as current_time_et,
  (SELECT now() AT TIME ZONE 'America/Detroit' + 
    CASE 
      WHEN EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Detroit') < 8 THEN 
        (interval '8 hours' - (EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Detroit') || ' hours')::interval)
      ELSE 
        (interval '32 hours' - (EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Detroit') || ' hours')::interval)
    END
  ) as next_birthday_run,
  (SELECT now() AT TIME ZONE 'America/Detroit' + 
    CASE 
      WHEN EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Detroit') < 9 THEN 
        (interval '9 hours' - (EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Detroit') || ' hours')::interval)
      ELSE 
        (interval '33 hours' - (EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Detroit') || ' hours')::interval)
    END
  ) as next_daily_push_run
FROM cron.job
WHERE jobname IN ('daily_birthday_notifications', 'daily_push_0900_et');
```

---

## 3. Smoke Tests

### Test A: Welcome Email

1. **Create a test user:**
   - Sign up with a new email address (use a real email you can check)
   - Use a name like "Test User"

2. **Verify email sent:**
```sql
SELECT 
  type,
  status,
  sent_at,
  metadata->>'email' as recipient,
  metadata->>'full_name' as name,
  metadata->>'resend_id' as resend_id,
  error
FROM email_logs
WHERE type = 'welcome'
ORDER BY sent_at DESC
LIMIT 5;
```

3. **Expected result:**
   - Status should be 'sent'
   - recipient should match your test email
   - resend_id should be present
   - Check your inbox for the welcome email

---

### Test B: Birthday Email

1. **Set a test user's birthday to today:**
```sql
-- First, get your test user's ID
SELECT id, email FROM auth.users WHERE email = 'your-test-email@example.com';

-- Set their birthday to today
UPDATE profiles 
SET birth_date = CURRENT_DATE,
    marketing_opt_in = true
WHERE id = '<your-user-id>';
```

2. **Manually trigger birthday notifications:**
```bash
# Call the edge function directly (replace with your test setup)
curl -X POST \
  'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-birthday-notifications' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA' \
  -d '{"dryRun": false}'
```

3. **Verify email sent:**
```sql
SELECT 
  type,
  status,
  sent_at,
  metadata->>'email' as recipient,
  metadata->>'full_name' as name,
  error
FROM email_logs
WHERE type = 'birthday'
ORDER BY sent_at DESC
LIMIT 5;
```

4. **Expected result:**
   - Status should be 'sent'
   - Check your inbox for the birthday email

---

### Test C: Daily Push Notification

1. **Subscribe to push notifications:**
   - Go to `/settings?tab=notifications`
   - Toggle "Daily Wellness Reminders" ON
   - Grant notification permissions when prompted
   - Ensure push subscription is saved

2. **Send test push:**
```bash
# Get your user ID first
curl -X POST \
  'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA' \
  -d '{"dryRun": false, "userId": "<your-user-id>"}'
```

3. **Verify push sent:**
```sql
SELECT 
  user_id,
  type,
  status,
  sent_at,
  opened_at,
  metadata->>'title' as title,
  metadata->>'body' as body,
  error
FROM notification_logs
WHERE type = 'daily_reminder'
ORDER BY sent_at DESC
LIMIT 10;
```

4. **Expected result:**
   - Status should be 'sent'
   - You should receive a push notification on your device
   - Clicking it should open the app to /dashboard
   - After clicking, run the query again - opened_at should be set

---

## 4. Admin UI Verification

### A. Users Admin Page
1. Navigate to `/admin/users`
2. Verify:
   - ✅ User table loads with email, name, birthday
   - ✅ Search by name/email works
   - ✅ Birthday filter shows only users with birthdays this month
   - ✅ "Export CSV" downloads file with all data
   - ✅ "Copy Emails" copies all emails to clipboard
   - ✅ No console errors

### B. User Settings - Profile Tab
1. Go to `/settings?tab=profile`
2. Update:
   - ✅ Full name
   - ✅ Birthday (date picker)
   - ✅ Timezone (dropdown)
3. Click "Save Changes"
4. Verify:
   - ✅ Success toast appears
   - ✅ Refresh page - changes persist
   - ✅ Check database:
```sql
SELECT 
  id,
  full_name,
  birth_date,
  timezone
FROM profiles
WHERE id = auth.uid();
```

### C. User Settings - Notifications Tab
1. Go to `/settings?tab=notifications`
2. Toggle "Birthday Messages" ON
3. Click "Save Preferences"
4. Verify:
   - ✅ Success toast appears
   - ✅ Refresh page - toggle stays ON
   - ✅ Check database:
```sql
SELECT 
  user_id,
  marketing_opt_in
FROM profiles
WHERE id = auth.uid();
```

---

## 5. Telemetry & Monitoring

### Email Logs
```sql
-- Recent email activity
SELECT 
  type,
  status,
  COUNT(*) as count,
  MAX(sent_at) as last_sent
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY type, status
ORDER BY type, status;

-- Failed emails
SELECT 
  type,
  metadata->>'email' as recipient,
  error,
  sent_at
FROM email_logs
WHERE status = 'failed'
  AND sent_at > NOW() - INTERVAL '7 days'
ORDER BY sent_at DESC;
```

### Notification Logs
```sql
-- Push notification stats
SELECT 
  type,
  status,
  COUNT(*) as count,
  COUNT(opened_at) as opened_count,
  ROUND(100.0 * COUNT(opened_at) / NULLIF(COUNT(*), 0), 2) as open_rate
FROM notification_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY type, status
ORDER BY type, status;
```

### CRON Job History
```sql
-- Recent job runs
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobname IN ('daily_birthday_notifications', 'daily_push_0900_et')
ORDER BY start_time DESC
LIMIT 20;
```

---

## 6. Troubleshooting

### Birthday Emails Not Sending
1. Check if CRON job is active:
```sql
SELECT * FROM cron.job WHERE jobname = 'daily_birthday_notifications';
```

2. Check for users with birthdays today:
```sql
SELECT 
  id,
  email,
  full_name,
  birth_date,
  marketing_opt_in
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE marketing_opt_in = true
  AND EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE);
```

3. Check Edge Function logs in Backend > Edge Functions > send-birthday-notifications

### Daily Push Not Sending
1. Check if user has push subscription:
```sql
SELECT 
  user_id,
  endpoint,
  created_at
FROM push_subscriptions
WHERE user_id = '<your-user-id>';
```

2. Check notification preferences:
```sql
SELECT 
  user_id,
  daily_reminders,
  quiet_hours_start,
  quiet_hours_end
FROM notification_preferences
WHERE user_id = '<your-user-id>';
```

3. Check Edge Function logs in Backend > Edge Functions > send-daily-notification

### Welcome Email Not Sending
1. Check if trigger is active:
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

2. Test manually:
```bash
curl -X POST \
  'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-welcome-email' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA' \
  -d '{
    "user_id": "<user-id>",
    "email": "test@example.com",
    "full_name": "Test User"
  }'
```

---

## 7. Success Criteria Checklist

- [ ] All 6 secrets configured
- [ ] Both CRON jobs scheduled and showing next run times
- [ ] Welcome email test passed (email received + logged)
- [ ] Birthday email test passed (email received + logged)
- [ ] Daily push test passed (notification received + logged + opened)
- [ ] Admin users page works (search, filter, export)
- [ ] Settings profile tab saves correctly
- [ ] Settings notifications tab saves correctly
- [ ] Telemetry queries return expected data
- [ ] No errors in browser console or Edge Function logs

---

## 8. Next Steps After Success

Once all tests pass:

1. **Clean up test data:**
```sql
-- Remove test email logs
DELETE FROM email_logs WHERE metadata->>'email' LIKE '%test%';

-- Reset test user's birthday
UPDATE profiles SET birth_date = NULL WHERE id = '<test-user-id>';
```

2. **Monitor for 24-48 hours:**
   - Check email_logs daily for failures
   - Check notification_logs for delivery issues
   - Monitor CRON job execution in cron.job_run_details

3. **Document any customizations:**
   - Custom email templates
   - Timezone adjustments
   - Special handling for edge cases

---

## Support Resources

- **Email Logs:** Backend > Database > email_logs table
- **Notification Logs:** Backend > Database > notification_logs table
- **CRON Jobs:** Backend > SQL Editor → query cron.job table
- **Edge Functions:** Backend > Edge Functions → select function → Logs
- **Resend Dashboard:** https://resend.com/emails (external)

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-17  
**Maintained By:** Development Team
