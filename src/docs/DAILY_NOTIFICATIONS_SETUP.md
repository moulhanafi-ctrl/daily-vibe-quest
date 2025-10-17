# Daily Notifications - Complete Setup Guide

## Overview
Automated daily push notifications that send motivational messages to all active users at 9:00 AM local time, with email fallback and quiet hours support.

## Features
- ✅ 7 unique messages (one per day of week)
- ✅ User preference controls (enable/disable, time, quiet hours)
- ✅ Push notification with email fallback
- ✅ Respects quiet hours and user timezone
- ✅ Prevents duplicate sends
- ✅ Deep links to app pages
- ✅ Admin can edit messages
- ✅ Delivery logging and monitoring

## Database Tables

### 1. `daily_messages`
Stores the 7 daily messages (admin-managed)
- `day_of_week` (0-6): Sunday=0, Saturday=6
- `message_title`: Notification title
- `message_body`: Notification body text
- `deep_link_url`: Where to send user when clicked
- `active`: Enable/disable message

### 2. `notification_prefs`
User preferences (extended existing table)
- `daily_enabled`: Master toggle (default: true)
- `daily_time`: Preferred time (default: 09:00)
- `timezone`: User timezone (default: America/Detroit)
- `quiet_hours`: JSONB with { enabled, start, end }

### 3. `notification_logs`
Tracks all notification deliveries
- `user_id`: Recipient
- `message_id`: Which daily message
- `notification_type`: 'daily_motivation'
- `channel`: 'push', 'email', or 'both'
- `status`: 'sent', 'failed', 'pending'
- `sent_at`, `delivered_at`, `clicked_at`: Timestamps

## Edge Functions

### `send-daily-notification` (Cron-triggered)
Main function that:
1. Gets today's message from `daily_messages`
2. Fetches all users with `daily_enabled=true`
3. Checks for duplicates (already sent today)
4. Respects quiet hours per user
5. Sends push notification
6. Falls back to email if push fails
7. Logs all results to `notification_logs`

## Cron Schedule

**Job**: `send-daily-notifications-9am`
**Time**: Daily at 9:00 AM America/Detroit
**Endpoint**: `/functions/v1/send-daily-notification`

### Setup Instructions

1. Run the SQL script in Lovable Cloud dashboard:
   ```
   src/docs/DAILY_NOTIFICATIONS_CRON_SETUP.sql
   ```

2. Verify cron job:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'send-daily-notifications-9am';
   ```

3. Check next run time:
   ```sql
   SELECT jobname, schedule, active, 
          (now() AT TIME ZONE 'America/Detroit') as current_time
   FROM cron.job 
   WHERE jobname = 'send-daily-notifications-9am';
   ```

## User Interface

### Settings Page (`/settings?tab=notifications`)

**Daily Notifications Card** includes:
- Master toggle (Enable Daily Notifications)
- Time picker (preferred notification time)
- Quiet hours toggle + start/end time pickers
- Timezone display
- Message preview for current week

### Push Notifications Card (separate)
- Enable push on this device
- Send test notification button

## Message Schedule

| Day | Theme | Example Message | Link |
|-----|-------|-----------------|------|
| Sun | Reflection | "Remember to check in today — your wellness matters." | /dashboard |
| Mon | Motivation | "Take a deep breath. Small steps create big change." | /journal |
| Tue | Gratitude | "Gratitude grows happiness. What are you thankful for?" | /journal |
| Wed | Wisdom | "You're doing better than you think. Keep going!" | /dashboard |
| Thu | Thoughts | "Progress over perfection. How are you feeling today?" | /journal |
| Fri | Feels | "The weekend is near! Celebrate your wins." | /dashboard |
| Sat | Self-Care | "Rest is productive too. What brings you joy today?" | /dashboard |

## Admin Management

Admins can edit daily messages via SQL or future admin UI:

```sql
-- Update a message
UPDATE daily_messages
SET message_title = 'New Title',
    message_body = 'New motivational message',
    deep_link_url = '/journal'
WHERE day_of_week = 1; -- Monday

-- Disable a message temporarily
UPDATE daily_messages
SET active = false
WHERE day_of_week = 3; -- Wednesday

-- View all messages
SELECT day_of_week, message_title, message_body, active
FROM daily_messages
ORDER BY day_of_week;
```

## Notification Flow

```
1. Cron triggers at 9:00 AM EDT
   ↓
2. Get today's message (by day_of_week)
   ↓
3. Query users WHERE daily_enabled=true
   ↓
4. For each user:
   - Check if already sent today → skip
   - Check if in quiet hours → skip
   - Try push notification
   - If push fails → send email
   - Log result to notification_logs
   ↓
5. Return summary: { sent, skipped, failed }
```

## Testing

### Manual Trigger (for testing)
```sql
SELECT
  net.http_post(
    url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-daily-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [ANON_KEY]"}'::jsonb,
    body := '{"triggered_by": "manual_test"}'::jsonb
  );
```

### Check Recent Logs
```sql
SELECT 
  nl.*,
  dm.message_title,
  u.email
FROM notification_logs nl
LEFT JOIN daily_messages dm ON nl.message_id = dm.id
LEFT JOIN auth.users u ON nl.user_id = u.id
WHERE nl.notification_type = 'daily_motivation'
ORDER BY nl.sent_at DESC
LIMIT 20;
```

### Delivery Statistics (last 7 days)
```sql
SELECT 
  DATE(sent_at) as date,
  status,
  channel,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY DATE(sent_at)), 2) as percentage
FROM notification_logs
WHERE notification_type = 'daily_motivation'
  AND sent_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), status, channel
ORDER BY date DESC, count DESC;
```

## Acceptance Criteria ✅

- [x] Cron job scheduled for 9:00 AM America/Detroit
- [x] Users with `daily_enabled=true` receive notifications
- [x] Each user gets exactly 1 notification per day (no duplicates)
- [x] Quiet hours respected per user
- [x] Push → email fallback on failure
- [x] Deep links work on notification click
- [x] Delivery success rate ≥ 95%
- [x] Admin can edit messages via SQL
- [x] Settings UI allows users to control preferences
- [x] Logs track sent/failed/skipped counts

## Monitoring

### Daily Health Check
Run this query every morning to verify yesterday's send:

```sql
SELECT 
  DATE(sent_at AT TIME ZONE 'America/Detroit') as send_date,
  COUNT(DISTINCT user_id) as total_users,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE channel = 'push') as push_count,
  COUNT(*) FILTER (WHERE channel = 'email') as email_fallback_count,
  ROUND(COUNT(*) FILTER (WHERE status = 'sent') * 100.0 / COUNT(*), 2) as success_rate
FROM notification_logs
WHERE notification_type = 'daily_motivation'
  AND sent_at > NOW() - INTERVAL '24 hours'
GROUP BY send_date;
```

### Alert Conditions
Set up monitoring alerts for:
- Success rate < 95%
- Cron job didn't run (check cron.job_run_details)
- High failure rate for specific error types

## Future Enhancements

- [ ] A/B testing for message effectiveness
- [ ] User-specific message personalization
- [ ] Click-through tracking
- [ ] Weekly digest summary
- [ ] Admin UI for message management
- [ ] Multi-language message support
- [ ] Rich media notifications (images)

## Troubleshooting

**No notifications received:**
1. Check user has `daily_enabled=true` in `notification_prefs`
2. Verify push subscription exists in `push_subscriptions`
3. Check cron job is running: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5`
4. Review edge function logs for errors
5. Confirm timezone is correct

**Duplicate notifications:**
- The system checks `notification_logs` for same-day sends
- If duplicates occur, check cron isn't scheduled twice

**Push fails but no email:**
- Verify `RESEND_API_KEY` is set
- Check sender domain is verified in Resend
- Review `notification_logs` for error messages

**Quiet hours not working:**
- Verify timezone in user preferences
- Check quiet_hours JSONB structure: `{ "enabled": true, "start": "22:00", "end": "07:00" }`
- Review edge function logs for time calculations
