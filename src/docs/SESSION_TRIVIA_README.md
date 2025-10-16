# Session Trivia Feature - Complete Documentation

## Overview

The Session Trivia feature provides a weekly trivia experience with mental health breaks integrated between sessions. It runs every Saturday at 7:00 PM America/Detroit time.

## Architecture

### Database Tables

1. **trivia_weekly_sessions**
   - Stores the weekly trivia content
   - Contains 3 sessions with 10 questions each (30 total)
   - Tracks topics, status (draft/published), and scheduling info

2. **trivia_break_videos**
   - Mental health micro-videos (30-45 seconds)
   - 2 videos per week (between S1→S2 and S2→S3)
   - Contains title, tip content, video URL, duration

3. **trivia_session_progress**
   - Tracks user progress through sessions
   - Stores answers and scores per session
   - Unique constraint: one entry per user/week/session

### Edge Functions

1. **trivia-generate-weekly-sessions**
   - Runs: Friday 6:00 PM UTC (~1-2 PM Detroit)
   - Generates 30 trivia questions across 3 random topics
   - Creates 2 mental health break videos
   - Stores in `draft` status for review

2. **trivia-publish-weekly-sessions**
   - Runs: Saturday 11:50 PM UTC (~6:50 PM EST / 7:50 PM EDT Detroit)
   - Publishes draft sessions that are scheduled for today
   - Makes content visible to users

## Scheduling

### Cron Jobs

```sql
-- Generation: Friday 6PM UTC
'0 18 * * FRI'

-- Publishing: Saturday 11:50 PM UTC
'50 23 * * SAT'
```

### Timezone Handling

- Target: Saturday 7:00 PM America/Detroit
- Detroit observes Eastern Time (EST/EDT with DST)
- Publishing cron runs at 11:50 PM UTC Saturday to handle both:
  - EST (UTC-5): 6:50 PM Detroit (10 min early)
  - EDT (UTC-4): 7:50 PM Detroit (50 min late)

## User Flow

### Session Structure

```
Session 1 (10 questions)
    ↓
Mental Health Break 1 (30-45s video)
    ↓
Session 2 (10 questions)
    ↓
Mental Health Break 2 (30-45s video)
    ↓
Session 3 (10 questions)
    ↓
Completion celebration 🎉
```

### Question Format

Each question includes:
- `q`: Question text
- `type`: multiple_choice | true_false | short_answer
- `options`: Array of answer choices
- `correct`: Correct answer
- `difficulty`: easy | medium | hard
- `category`: Topic category
- `explanation`: Why the answer is correct

### Mental Health Breaks

Topics rotate weekly from:
- Box Breathing (30s)
- 5-4-3-2-1 Grounding (35s)
- Hydration & Mood (30s)
- Sleep Hygiene (40s)
- Micro-Stretching (30s)
- Gratitude Moment (35s)
- Progressive Relaxation (40s)
- Positive Self-Talk (35s)

Each break includes:
- Title
- Wellness tip content
- Duration (30-45 seconds)
- Video URL
- On-screen disclaimer: "Informational only — this is not medical advice"

## Setup Instructions

### 1. Run the Database Migration

The tables are created automatically via Supabase migrations. They're already set up with proper RLS policies.

### 2. Set Up Cron Jobs

Run the SQL in `SESSION_TRIVIA_CRON_SETUP.sql` to schedule:
- Weekly generation (Friday)
- Weekly publishing (Saturday)

### 3. Configure Secrets

Ensure these secrets are set in Supabase:
- `LOVABLE_API_KEY` - For AI question generation
- `CRON_WEBHOOK_SECRET` - For HMAC signature verification

### 4. Add Navigation

Users can access Session Trivia at:
- `/trivia/sessions` - Main session trivia page
- `/trivia` - Traditional trivia (existing feature)

## Monitoring

### Check Generated Content

```sql
-- View recent sessions
SELECT 
  week_key,
  status,
  topics,
  jsonb_array_length(session_1_questions) as s1_count,
  jsonb_array_length(session_2_questions) as s2_count,
  jsonb_array_length(session_3_questions) as s3_count,
  created_at,
  published_at
FROM trivia_weekly_sessions
ORDER BY week_key DESC
LIMIT 5;
```

### Check User Progress

```sql
SELECT 
  u.email,
  tsp.week_key,
  tsp.session_number,
  tsp.score,
  tsp.completed_at
FROM trivia_session_progress tsp
JOIN auth.users u ON u.id = tsp.user_id
ORDER BY tsp.completed_at DESC
LIMIT 20;
```

### Monitor Cron Jobs

```sql
-- View job history
SELECT * FROM cron.job_run_details 
WHERE jobid IN (
  SELECT jobid FROM cron.job 
  WHERE jobname LIKE 'trivia%session%'
)
ORDER BY start_time DESC 
LIMIT 10;
```

## QA Checklist

### Pre-Launch Testing

- [ ] Run manual generation and verify 30 questions created
- [ ] Verify 3 sessions × 10 questions each
- [ ] Check 2 break videos are created with valid content
- [ ] Test complete user flow (S1 → Break → S2 → Break → S3)
- [ ] Verify "Replay Break Video" functionality
- [ ] Test keyboard navigation (accessibility)
- [ ] Confirm disclaimer shows on video breaks
- [ ] Test on mobile and desktop
- [ ] Verify RLS policies prevent unauthorized access
- [ ] Check published sessions are visible to all users
- [ ] Test progress tracking between sessions

### Weekly Monitoring

- [ ] Verify Saturday 7 PM job queued in correct timezone
- [ ] Confirm 3 sessions × 10 questions exist
- [ ] Check 2 break videos resolve (200 OK)
- [ ] Verify post renders: S1 → Break → S2 → Break → S3
- [ ] Monitor error logs for generation failures
- [ ] Check user completion rates

## Guardrails

### Content Safety

- Questions are safe-for-work, inclusive, culturally sensitive
- No medical advice or clinical recommendations
- Mental health tips are general wellness only
- Disclaimer displayed: "Informational only — this is not medical advice"

### Quality Checks

- Exactly 30 questions generated (10 per session)
- Difficulty varies: easy → medium → hard
- Topics rotate weekly for variety
- Break videos are 30-45 seconds
- All content validated before publishing

## Troubleshooting

### No Session Available

- Check if current date is Saturday or Sunday
- Verify session exists with status='published'
- Check cron job ran successfully

### Wrong Timezone

- Detroit time calculation uses `America/Detroit` timezone
- DST changes handled automatically
- Cron job scheduled in UTC with margin for DST

### Generation Failures

- Check Lovable AI rate limits
- Verify LOVABLE_API_KEY is valid
- Review generation logs in edge function
- Ensure database has capacity

## Future Enhancements

- [ ] Real video generation for mental health breaks
- [ ] Family scoreboard for session completion
- [ ] Weekly email reminders
- [ ] Adaptive difficulty based on user performance
- [ ] Streak tracking across weeks
- [ ] Custom topics based on user preferences
- [ ] Captions/translations for break videos
- [ ] Analytics dashboard for admin review

## Support

For issues or questions:
1. Check edge function logs in Supabase dashboard
2. Review cron job history
3. Verify database records
4. Test with manual trigger SQL commands