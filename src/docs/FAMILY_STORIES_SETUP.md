# Family Stories - 45 Second Video Stories

## Overview
Snapchat-style vertical video stories limited to 45 seconds, auto-expire after 24 hours, private to family groups.

## Configuration

### Environment Variables
```env
STORY_MAX_SECONDS=45
STORY_TTL_HOURS=24
```

### Storage
- Bucket: `family-stories` (private)
- Max file size: 150MB
- Rate limit: 10 stories per user per 24 hours

## Automated Cleanup

### Daily Cron Job
Run the cleanup edge function daily to remove expired stories:

```sql
-- Enable pg_cron and pg_net extensions first in Supabase dashboard
-- Then create the cron job:

SELECT cron.schedule(
  'cleanup-expired-stories-daily',
  '0 2 * * *', -- 2 AM daily
  $$
  SELECT net.http_post(
    url:='https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/cleanup-expired-stories',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

## Features

### User Features
- Record or upload video (≤45 seconds)
- View family member stories in full-screen player
- Tap to pause, swipe for next story
- React to stories (heart, laugh, wow, sad)
- See view count on your stories
- Stories auto-expire after 24 hours

### Safety Controls
- Parents can disable stories for minors
- Rate limit: 10 stories per user per 24 hours
- Max file size: 150MB
- Family-only visibility via RLS

### Privacy
- Stories only visible to family members
- Signed URLs with expiration
- Automatic cleanup after 24 hours
- No public access

## Database Schema

### Tables
- `family_stories`: Main story records (video_url, duration_seconds, expires_at)
- `story_views`: Track who viewed which story
- `story_reactions`: User reactions to stories
- `system_users`: System users like TEST_CONTACT

### RLS Policies
- Users create their own stories
- Family members view family stories (not expired)
- Story owners see who viewed their stories

## QA Testing

### Test Contact Feature
Located in Settings → QA tab:
- Send test message to verify messaging pipeline
- Receive auto-reply with device info
- Confirm push notifications working
- View device metadata in console

### Story Testing
1. Navigate to Family → Stories tab
2. Click "Your Story" (+ button)
3. Upload ≤45 second video
4. Verify story appears in rail
5. Click to view in full-screen player
6. Test reactions and view count
7. Verify story expires after 24 hours

## Telemetry Events
- `test_contact_sent`: Test message sent
- `test_contact_received`: Auto-reply received
- `story_upload_started`: Story upload initiated
- `story_upload_completed`: Story successfully uploaded
- `story_upload_failed`: Story upload failed
- `story_view`: User viewed a story
- `story_reaction_added`: User reacted to story

## Troubleshooting

### Story not appearing
- Check family membership in `family_members` table
- Verify `expires_at` is in the future
- Check RLS policies on `family_stories`

### Upload fails
- Verify file size ≤150MB
- Check duration ≤45 seconds
- Ensure user is in a family group
- Check storage bucket permissions

### Test Contact not working
- Verify `system_users` table has TEST_CONTACT
- Check `test_messages` table for records
- Review edge function logs for errors
