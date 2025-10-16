# Saturday Trivia Automation - Pre-Flight Checklist

**Status**: Ready for Production Deployment  
**Last Updated**: 2025-10-16  
**Target**: Every Saturday 7:00 PM (America/Detroit)

---

## 🎯 Overview

This guide walks through the complete setup and verification of the fully automated Saturday Trivia system with:
- ✅ Auto-generation of 30 questions (3 sessions × 10 questions)
- ✅ YouTube wellness video breaks (45-60s clips)
- ✅ Push + email notifications (reminder + start)
- ✅ Family multiplayer mode with real-time sync
- ✅ Health monitoring and auto-cleanup
- ✅ Zero manual intervention required

---

## 📋 Pre-Flight Checklist

### Phase 1: Secrets Configuration

**Required Secrets** (via Lovable Cloud Backend):

| Secret Name | Purpose | How to Get |
|------------|---------|-----------|
| `YOUTUBE_API_KEY` | Fetch wellness shorts | [YouTube Data API v3](https://console.developers.google.com/apis/credentials) |
| `RESEND_API_KEY` | Email notifications | [Resend Dashboard](https://resend.com/api-keys) |
| `LOVABLE_API_KEY` | AI question generation | Auto-provisioned by Lovable |
| `CRON_WEBHOOK_SECRET` | Secure cron triggers | Run: `openssl rand -hex 32` |

**Verification**:
```sql
-- Check secrets are configured
SELECT name FROM pg_settings WHERE name LIKE 'app.settings.%';
```

Expected: `service_role_key`, `cron_webhook_secret`

---

### Phase 2: Database Setup

**Run Migration** (one-time):

1. Open Backend → SQL Editor
2. Paste contents of `ENABLE_SATURDAY_TRIVIA_AUTOMATION.sql`
3. Update line 43-44 with your actual keys:
   ```sql
   ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbG...YOUR_KEY';
   ALTER DATABASE postgres SET app.settings.cron_webhook_secret = 'your_32_hex_secret';
   ```
4. Execute entire script

**Verification**:
```sql
-- Verify 5 cron jobs scheduled
SELECT jobname, schedule, active FROM cron.job 
WHERE jobname LIKE '%trivia%' OR jobname LIKE '%wellness%' OR jobname LIKE '%health%'
ORDER BY jobname;
```

**Expected Output**:
| jobname | schedule | active |
|---------|----------|--------|
| archive-old-trivia | `0 6 * * SUN` | true |
| fetch-youtube-wellness-shorts-weekly | `0 22 * * FRI` | true |
| send-trivia-reminder-saturday | `0 22 * * SAT` | true |
| send-trivia-start-saturday | `0 23 * * SAT` | true |
| trivia-generate-sessions-weekly | `0 22 * * FRI` | true |
| trivia-health-check | `0 12 * * SAT` | true |
| trivia-publish-sessions-saturday | `0 23 * * SAT` | true |

---

### Phase 3: Dry-Run Testing

**Manual Test Each Component**:

#### 1️⃣ Question Generation
```sql
-- Trigger generation manually
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
);

-- Wait 10 seconds, then verify
SELECT 
  week_key,
  topics,
  status,
  jsonb_array_length(session_1_questions) as s1_count,
  jsonb_array_length(session_2_questions) as s2_count,
  jsonb_array_length(session_3_questions) as s3_count
FROM trivia_weekly_sessions
ORDER BY created_at DESC LIMIT 1;
```

✅ **Pass Criteria**: `s1_count = 10, s2_count = 10, s3_count = 10`, status = `draft`

#### 2️⃣ YouTube Wellness Videos
```sql
-- Trigger fetch manually
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
);

-- Verify 2 videos fetched
SELECT 
  week_key,
  break_position,
  title,
  youtube_video_id,
  duration_seconds,
  channel_title
FROM trivia_break_videos
ORDER BY created_at DESC LIMIT 2;
```

✅ **Pass Criteria**: 2 videos, 30-60s duration, `break_position` = 1 and 2

#### 3️⃣ Notification System (Reminder)
```sql
-- Test reminder notification (Saturday 6:50 PM)
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
);

-- Check delivery logs
SELECT 
  week_key,
  notification_type,
  total_users,
  push_sent,
  email_sent,
  quiet_hours_skipped
FROM trivia_notification_logs
ORDER BY sent_at DESC LIMIT 1;
```

✅ **Pass Criteria**: `push_sent + email_sent > 0`, no errors

#### 4️⃣ Notification System (Start)
```sql
-- Test start notification (Saturday 7:00 PM)
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
);
```

✅ **Pass Criteria**: Deep link = `/trivia?week=YYYY-MM-DD`, opens app correctly

#### 5️⃣ Publishing
```sql
-- Publish the draft session
SELECT net.http_post(
  url := 'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/trivia-publish-weekly-sessions',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'x-webhook-signature', encode(
      hmac('{}', current_setting('app.settings.cron_webhook_secret'), 'sha256'),
      'hex'
    )
  ),
  body := '{}'::jsonb
);

-- Verify status changed to 'published'
SELECT week_key, status, scheduled_at_local 
FROM trivia_weekly_sessions
WHERE week_key >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY week_key DESC;
```

✅ **Pass Criteria**: `status = 'published'`, `scheduled_at_local` = Saturday 7:00 PM

#### 6️⃣ Health Check
```sql
-- Run health check
SELECT * FROM run_trivia_health_check();
```

✅ **Pass Criteria**: All components = `healthy`, no `critical` status

---

### Phase 4: UI Verification

**Test User Flow** (manual in app):

1. **Navigate to `/trivia`**
   - ✅ See "This Week's Challenge" card
   - ✅ "Start Playing" button visible

2. **Start Session 1**
   - ✅ 10 questions load
   - ✅ Timer counts down (30s per question)
   - ✅ Correct answer → green confetti 🎉
   - ✅ Wrong answer → red pulse feedback

3. **Complete Session 1 → Wellness Break**
   - ✅ YouTube video loads (30-60s)
   - ✅ Captions ON by default
   - ✅ Attribution visible: "Title | Channel | Watch on YouTube"
   - ✅ Disclaimer text displayed
   - ✅ "Next Session" button appears ONLY after video completes

4. **Session 2 → Second Wellness Break**
   - ✅ Different video plays
   - ✅ Same captions + attribution + disclaimer

5. **Session 3 → Completion**
   - ✅ "Trivia Complete!" screen
   - ✅ Final score displayed
   - ✅ Leaderboard shows family rankings (if in Family Mode)
   - ✅ "Share Results" button works

**Family Mode Test** (2+ users):

1. User A creates family room → gets 6-digit code
2. User B joins using code
3. Both start Session 1
4. ✅ Questions sync in real-time (< 500ms latency)
5. ✅ Wellness video plays for both simultaneously
6. ✅ Leaderboard updates live after each session
7. ✅ Both can see family scores in "Family Scoreboard" tab

---

### Phase 5: Notification Verification

**Test Push Notifications** (mobile):

1. Install app on physical device (iOS/Android)
2. Enable notifications in Settings → Arthur Preferences
3. Wait for Saturday 6:50 PM or manually trigger:
   ```sql
   -- Force trigger reminder
   SELECT net.http_post(...); -- (see Phase 3, step 3)
   ```
4. ✅ Push notification received: "🎯 Trivia kicks off in 10 minutes!"
5. ✅ Tap notification → app opens to `/trivia?week=YYYY-MM-DD`

**Test Email Notifications**:

1. Verify user has `email_enabled = true` in `trivia_notification_preferences`
2. Manually trigger start notification:
   ```sql
   SELECT net.http_post(...); -- (see Phase 3, step 4)
   ```
3. ✅ Email received: "🎉 Round 1 is LIVE!"
4. ✅ Click "🎯 Start Playing" button → lands on `/trivia?week=YYYY-MM-DD`

**Test Quiet Hours**:

1. User enables quiet hours (10 PM - 8 AM) in settings
2. Trigger notification at 11 PM
3. ✅ Push notification skipped
4. ✅ Email sent instead
5. ✅ Log shows `quiet_hours_skipped = 1`

---

### Phase 6: Monitoring & Logs

**View Automation Logs**:
```sql
-- Last 20 automation events
SELECT 
  created_at,
  week_key,
  event_type,
  status,
  message,
  metadata
FROM trivia_logs
ORDER BY created_at DESC
LIMIT 20;
```

**View Cron Execution History**:
```sql
-- Last 10 cron runs
SELECT 
  j.jobname,
  r.start_time,
  r.end_time,
  r.status,
  r.return_message
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT * FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) r ON true
WHERE j.jobname LIKE '%trivia%' OR j.jobname LIKE '%wellness%'
ORDER BY r.start_time DESC;
```

**View Notification Telemetry**:
```sql
-- Weekly notification performance
SELECT 
  week_key,
  notification_type,
  total_users,
  push_sent,
  push_delivered,
  email_sent,
  email_delivered,
  quiet_hours_skipped,
  push_errors + email_errors as total_errors
FROM trivia_notification_logs
WHERE scheduled_at >= NOW() - INTERVAL '30 days'
ORDER BY scheduled_at DESC;
```

---

## 📊 Acceptance Criteria (Final Checklist)

| Requirement | Status | Verified By |
|------------|--------|-------------|
| **1. Automation** |
| All cron jobs scheduled correctly | ⬜ | SQL query returns 7 active jobs |
| Timezone set to America/Detroit | ⬜ | `scheduled_at_local` shows 7:00 PM |
| No manual triggers required | ⬜ | System runs for 2+ weeks unattended |
| **2. Question Generation** |
| 30 questions auto-generated weekly | ⬜ | `jsonb_array_length` = 10 per session |
| Topics rotate (science, history, arts, etc.) | ⬜ | `topics` field varies weekly |
| Questions stored under `week_key` | ⬜ | Table `trivia_weekly_sessions` populated |
| Old sessions archive after 7 days | ⬜ | `archive_old_trivia_sessions()` runs |
| **3. Wellness Videos** |
| 2 videos fetched weekly (Friday 6 PM) | ⬜ | `trivia_break_videos` count = 2 |
| Duration 30-60s | ⬜ | `duration_seconds` in range |
| Captions ON, attribution visible | ⬜ | Manual UI test passes |
| Fallback video loads if API fails | ⬜ | Test with invalid API key |
| Unlocks next session after completion | ⬜ | Timer must reach 0:00 |
| **4. Notifications** |
| Reminder sent at 6:50 PM Saturday | ⬜ | Check `trivia_notification_logs` |
| Start notification at 7:00 PM Saturday | ⬜ | Push + email delivered |
| Deep link works: `/trivia?week=YYYY-MM-DD` | ⬜ | Tap notification → app opens |
| Quiet hours respected (push skipped, email fallback) | ⬜ | Log shows `quiet_hours_skipped > 0` |
| Telemetry logged (delivery %, open %, click %) | ⬜ | `trivia_notification_logs` populated |
| **5. Family Mode** |
| 2-12 users can join room via code | ⬜ | Test with 3+ devices |
| Real-time sync (< 500ms) | ⬜ | Questions advance simultaneously |
| Shared leaderboard updates live | ⬜ | Scores appear instantly |
| Host can override wellness video | ⬜ | "Skip for All" button works |
| **6. UI/UX** |
| Correct answer → green confetti | ⬜ | Visual test |
| Wrong answer → red pulse | ⬜ | Visual test |
| Final screen shows "Trivia Complete!" | ⬜ | After Session 3 |
| Share button works | ⬜ | Social media/clipboard test |
| **7. Monitoring** |
| Health check runs Saturday 8 AM | ⬜ | `run_trivia_health_check()` logs |
| Logs capture all events | ⬜ | `trivia_logs` table populated |
| Errors trigger admin alerts | ⬜ | Test with forced failure |
| No console/network errors | ⬜ | Browser DevTools clean |

---

## 🚨 Troubleshooting

### Issue: No questions generated
**Solution**:
```sql
-- Check LOVABLE_API_KEY secret
SELECT name, setting FROM pg_settings WHERE name = 'app.settings.lovable_api_key';

-- Manually trigger generation
SELECT net.http_post(...); -- (see Phase 3, step 1)

-- Check error logs
SELECT * FROM trivia_logs WHERE event_type = 'generation' AND status = 'failure';
```

### Issue: YouTube videos not loading
**Solution**:
```sql
-- Verify YOUTUBE_API_KEY
SELECT * FROM trivia_break_videos WHERE week_key >= CURRENT_DATE - INTERVAL '7 days';

-- Check fallback usage
SELECT COUNT(*) FROM analytics_events 
WHERE event_type = 'wellness_fallback_used' 
  AND created_at >= NOW() - INTERVAL '7 days';

-- If fallback rate > 20%, refresh API key
```

### Issue: Notifications not sending
**Solution**:
```sql
-- Check RESEND_API_KEY
SELECT name FROM pg_settings WHERE name LIKE '%resend%';

-- Verify user preferences
SELECT COUNT(*) FROM trivia_notification_preferences WHERE push_enabled = true OR email_enabled = true;

-- Test manually
SELECT net.http_post(...); -- (see Phase 3, step 3)
```

### Issue: Cron jobs not running
**Solution**:
```sql
-- Check pg_cron extension
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Verify jobs active
SELECT jobname, active, nodename FROM cron.job;

-- If inactive, re-run ENABLE_SATURDAY_TRIVIA_AUTOMATION.sql
```

---

## 📅 Production Schedule (America/Detroit)

| Time (EDT/EST) | Event | Cron Job |
|---------------|-------|----------|
| **Friday 6:00 PM** | Generate 30 questions + Fetch 2 YouTube shorts | `trivia-generate-sessions-weekly`, `fetch-youtube-wellness-shorts-weekly` |
| **Saturday 6:50 PM** | Send reminder (push + email) | `send-trivia-reminder-saturday` |
| **Saturday 7:00 PM** | Publish + Start trivia + Send start notification | `trivia-publish-sessions-saturday`, `send-trivia-start-saturday` |
| **Saturday 8:00 AM** | Health check | `trivia-health-check` |
| **Sunday 2:00 AM** | Archive old data (7+ days) | `archive-old-trivia` |

---

## ✅ Final Sign-Off

**Deployment Ready When**:
- [ ] All 7 cron jobs active
- [ ] Dry-run tests pass (6/6 components)
- [ ] UI verification complete (manual test)
- [ ] Notifications deliver successfully
- [ ] Family mode syncs in real-time
- [ ] Monitoring dashboard shows healthy status
- [ ] Zero manual intervention for 2 consecutive weeks

**Deployed By**: _________________  
**Date**: _________________  
**Production URL**: https://your-app.com/trivia

---

**Questions?** Contact: dev@vibecheck.app
