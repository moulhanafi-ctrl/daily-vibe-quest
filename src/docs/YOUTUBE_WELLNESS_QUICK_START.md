# YouTube Wellness Shorts - Quick Start (5 Minutes)

## ✅ Prerequisites Complete
- ✅ YOUTUBE_API_KEY secret set
- ✅ Database schema ready
- ✅ Edge function deployed
- ✅ UI components integrated
- ✅ Analytics tracking enabled
- ✅ Admin controls available

---

## 🚀 Quick Start (Follow in Order)

### 1. Manual Test Fetch (2 min)
**Navigate to:** [/admin/trivia](/admin/trivia)

1. Click **"Wellness Breaks"** tab
2. Click **"Run Wellness Fetch Now"** button
3. Wait for toast: "Wellness Videos Fetched! Saved 2 videos for week YYYY-MM-DD"
4. **Verify:** Table shows 2 videos (positions 1 & 2) with:
   - YouTube video IDs (e.g., `inpok4MKVLM`)
   - Titles (e.g., "5-Minute Mindfulness Break")
   - Channels (e.g., "Wellness Daily")
   - Duration (30-60 seconds)

### 2. Preview Videos (1 min)
1. Click **eye icon** (👁️) next to any video
2. **Verify modal shows:**
   - YouTube embed with captions
   - Title + channel name
   - Disclaimer: "Informational only — not medical advice"
3. Click **"Close"**

### 3. Test User Flow (2 min)
**Navigate to:** [/trivia](/trivia) (demo mode automatically enabled if no live session)

1. Click **"Start Session 1"**
2. Answer all 10 questions (any answers work for demo)
3. **After Question 10:**
   - ✅ Wellness Break 1 appears
   - ✅ Video loads with captions ON
   - ✅ Channel name visible
   - ✅ Disclaimer shown
4. **Watch video** (or scrub to end)
5. **Verify:** "Continue to Next Session" button enables
6. Click **"Continue"** → Session 2 starts
7. Complete Session 2 → **Wellness Break 2** appears
8. Complete → Session 3 unlocks

**If breaks don't show:** Check test data exists for current week in `/admin/trivia` → Wellness Breaks tab

---

## 🗓️ Schedule Cron (Optional, 3 min)

**Only needed for automated weekly fetching. Skip if testing manually.**

### Copy this SQL → Run in Supabase SQL Editor:
```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule: Friday 6 PM Detroit (23:00 UTC)
SELECT cron.schedule(
  'fetch-youtube-wellness-shorts-weekly',
  '0 23 * * 5',
  $$
  SELECT net.http_post(
    url:='https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/fetch-youtube-wellness-shorts',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-webhook-signature', encode(
        hmac('{"scheduled": true}'::text, current_setting('app.settings.cron_secret'), 'sha256'),
        'hex'
      )
    ),
    body:='{"scheduled": true}'::jsonb
  );
  $$
);

-- Verify scheduled
SELECT * FROM cron.job WHERE jobname = 'fetch-youtube-wellness-shorts-weekly';
```

---

## 📊 Monitor Analytics (Optional)

### View wellness events:
```sql
SELECT 
  event_type,
  COUNT(*) as count,
  created_at::date as date
FROM analytics_events
WHERE event_type LIKE 'wellness_%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type, date
ORDER BY date DESC, count DESC;
```

### Expected events per user session:
1. `wellness_embed_start` (when video loads)
2. `wellness_embed_end` (when video completes)
3. `wellness_unlock_success` (when next session unlocks)
4. `wellness_fallback_used` (only if YouTube API fails)

---

## ✅ Success Checklist

After completing steps 1-3 above, verify:

- [ ] Admin fetch button works and shows toast
- [ ] Videos appear in admin table with all details
- [ ] Preview modal shows video embed correctly
- [ ] Break 1 appears after Session 1 completion
- [ ] Video has captions ON by default
- [ ] Channel name + disclaimer visible
- [ ] "Continue to Next Session" button enables after watching
- [ ] Session 2 unlocks and starts
- [ ] Break 2 appears after Session 2 completion
- [ ] Session 3 unlocks after Break 2

**All checked?** → 🎉 **Production ready!**

---

## 🔧 Troubleshooting

### "No wellness videos yet" in admin?
→ Click "Run Wellness Fetch Now" to populate initial data

### Videos not showing in trivia flow?
→ Check week matches: `/admin/trivia` → Wellness Breaks → verify week_key

### Video won't play?
→ Check browser console for YouTube IFrame API errors

### Session won't unlock?
→ Scrub video to end (or wait for full playback) → progress saves every 5s

### Need help?
→ See `YOUTUBE_WELLNESS_PRODUCTION.md` for detailed troubleshooting

---

## 📚 Full Documentation

- **Setup Guide:** `YOUTUBE_WELLNESS_PRODUCTION.md`
- **Integration Details:** `YOUTUBE_WELLNESS_INTEGRATION.md`
- **Cron SQL:** `YOUTUBE_WELLNESS_CRON_SETUP.sql`
- **Diagnostics:** `YOUTUBE_WELLNESS_DIAGNOSTICS.md`

---

**Next:** [View Production Setup Guide](./YOUTUBE_WELLNESS_PRODUCTION.md)
