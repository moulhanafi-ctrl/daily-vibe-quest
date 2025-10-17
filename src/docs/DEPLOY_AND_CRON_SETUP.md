# Edge Function Deploy Fix + Daily Notification Cron Setup

## ✅ Root Cause: Invalid Stripe API Version

**Problem**: The Stripe client was configured with a future API version `"2025-08-27.basil"` that doesn't exist yet, causing deployment failures.

**Fix Applied**:
1. Updated Stripe API version to stable `"2024-11-20.acacia"`
2. Added `httpClient: Stripe.createFetchHttpClient()` for better Deno compatibility
3. Removed `serve()` import (use `Deno.serve()` directly)
4. Added `/health` endpoint to verify function status

## 🔧 Fixed Files

### `supabase/functions/_shared/stripe-config.ts`
- Changed API version from `2025-08-27.basil` → `2024-11-20.acacia`
- Added fetch HTTP client for Deno edge runtime

### `supabase/functions/check-subscription/index.ts`
- Updated to use `Deno.serve()` instead of importing `serve()`
- Added health check endpoint: `GET /check-subscription/health`
- Returns JSON with connection status, VAPID config, and active subscriptions count

## 🚀 Deployment Steps

### 1. Verify Function Health

After deployment, test the health endpoint:
```bash
curl https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/check-subscription/health
```

Expected response:
```json
{
  "ok": true,
  "stripe_connected": true,
  "db_connected": true,
  "push_subscriptions_count": 5,
  "vapid_configured": true,
  "timestamp": "2025-01-16T12:00:00.000Z"
}
```

### 2. Test Subscription Check

```bash
curl -X POST https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/check-subscription \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "subscribed": true,
  "subscription_status": "active",
  "subscription_end": "2025-02-16T12:00:00.000Z"
}
```

## ⏰ Daily Notification Cron Setup

### Enable pg_cron and Schedule Job

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Remove any existing job
SELECT cron.unschedule('daily_push_0900_et');

-- Schedule daily push notifications at 9:00 AM America/Detroit
SELECT cron.schedule(
  'daily_push_0900_et',
  '0 9 * * *', -- Runs at 9:00 AM server time (configure server TZ to America/Detroit)
  $$
  SELECT
    net.http_post(
      url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
      body := '{"triggered_by": "cron", "dryRun": false}'::jsonb
    ) as request_id;
  $$
);
```

### Verify Cron Job

```sql
-- Check job is scheduled
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
```

Expected output:
- `jobname`: `daily_push_0900_et`
- `schedule`: `0 9 * * *`
- `active`: `true`
- Next run time visible in monitoring

### Monitor Cron Runs

```sql
-- View recent cron executions
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
```

### Manual Test Run

Trigger the daily notification immediately for testing:

```sql
SELECT
  net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzc3J5dHplZGFjY2h2a3J4Z25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODA2NTEsImV4cCI6MjA3NTY1NjY1MX0.YBmt9RZQ3Oxw0LMg44CfyJwV2866wd2t8K6gf5vWMCA"}'::jsonb,
    body := '{"triggered_by": "manual_test", "dryRun": false}'::jsonb
  ) as request_id;
```

## 🧪 End-to-End Testing

### 1. Enable Daily Notifications
1. Go to `/settings?tab=notifications`
2. Toggle **"Enable Daily Notifications"** ON
3. Set preferred time to 9:00 AM
4. Save preferences

### 2. Send Test Notification
1. Click **"Send Test Notification"** button
2. Notification should arrive within 5 seconds
3. Click notification → should open `/dashboard` or configured deep link

### 3. Verify Logs

```sql
-- Check recent notification deliveries
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
```

Expected log entry:
- `channel`: `push` (or `email` if push failed)
- `status`: `sent`
- `sent_at`: Recent timestamp
- `error_message`: NULL
- `delivered_at`: Shortly after sent_at
- `opened_at`: When user clicks notification

## 📊 Health Monitoring

### Daily Health Check Query

```sql
-- Notification delivery health (last 7 days)
SELECT 
  DATE(sent_at) as date,
  notification_type,
  channel,
  status,
  COUNT(*) as count,
  ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))), 2) as avg_delivery_seconds
FROM notification_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), notification_type, channel, status
ORDER BY date DESC, notification_type, status;
```

### Alert Thresholds

Monitor these metrics:
- **Failure Rate > 5%**: Investigate VAPID keys, push subscription expiry
- **No notifications sent today**: Check cron job status
- **Email fallback > 30%**: Check push subscription health
- **Avg delivery time > 10s**: Check edge function performance
- **Duplicate notifications same day**: Check deduplication logic

## 🎯 Acceptance Criteria Checklist

- [x] Fixed Stripe API version in `_shared/stripe-config.ts`
- [x] Added `/health` endpoint to `check-subscription` function
- [x] Removed invalid `serve()` import, using `Deno.serve()` directly
- [x] Created SQL script for cron job scheduling
- [ ] **Deploy edge functions** (automatic on save)
- [ ] **Run cron SQL in Supabase SQL Editor** (manual step)
- [ ] **Test `/health` endpoint returns 200 OK**
- [ ] **Test user receives push notification within 5s**
- [ ] **Test notification click opens correct deep link**
- [ ] **Verify logs show sent → delivered → opened**

## 🚨 Troubleshooting

### Deploy Error Persists
- Check Supabase project status
- Verify all secrets are set: `STRIPE_SECRET_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Review build logs in Supabase Functions dashboard

### Cron Not Running
```sql
-- Check if cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job exists and is active
SELECT * FROM cron.job WHERE jobname = 'daily_push_0900_et';

-- Check recent runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily_push_0900_et')
ORDER BY start_time DESC LIMIT 5;
```

### No Notifications Received
1. Check `notification_prefs` table: `SELECT * FROM notification_prefs WHERE user_id = 'YOUR_USER_ID';`
2. Verify `daily_enabled = true`
3. Check not in quiet hours
4. Verify push subscription exists: `SELECT * FROM push_subscriptions WHERE user_id = 'YOUR_USER_ID';`
5. Check notification logs for errors: `SELECT * FROM notification_logs WHERE user_id = 'YOUR_USER_ID' ORDER BY sent_at DESC LIMIT 10;`

### Push Fails, Email Works
- VAPID keys might be rotated → update secrets and resubscribe users
- Service worker registration failed → check `/sw.js` is accessible
- Browser permission denied → user needs to re-enable in browser settings

## 📅 Next Steps

1. **Deploy**: Functions auto-deploy on save
2. **Schedule**: Run cron SQL in Supabase dashboard
3. **Test**: Use "Send Test Notification" button
4. **Monitor**: Check logs daily for first week
5. **Iterate**: Adjust messaging, timing, or targeting based on open rates

---

**Status**: ✅ Ready to deploy and schedule
**Last Updated**: 2025-01-16
**Cron Schedule**: `0 9 * * *` (9:00 AM daily)
**Deep Link**: Configurable per message in `daily_messages` table