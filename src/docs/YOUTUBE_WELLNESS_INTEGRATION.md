# YouTube Wellness Shorts Integration

## Overview
YouTube wellness shorts have been integrated between trivia sessions to provide 30-60 second mindfulness breaks. The system automatically fetches curated wellness content and falls back to safe default videos if the API is unavailable.

## Architecture

### Edge Function: `fetch-youtube-wellness-shorts`
- **Location**: `supabase/functions/fetch-youtube-wellness-shorts/`
- **Schedule**: Runs Friday 6 PM Detroit time (before Saturday 7 PM trivia)
- **Purpose**: Fetches 2 wellness videos and saves them to `trivia_break_videos`

**Features**:
- Searches curated wellness channels (Headspace, Mindful Movement, Yoga With Adriene)
- Filters videos to 30-60 second duration
- Falls back to safe default videos if YouTube API fails
- Saves video ID, title, channel name, and thumbnail

**Required Secret**: `YOUTUBE_API_KEY` (optional - falls back without it)

### Component: `YouTubeBreak`
- **Location**: `src/components/trivia/YouTubeBreak.tsx`
- **Purpose**: Renders YouTube player with progress tracking

**Features**:
- YouTube IFrame API integration
- Captions enabled by default (`cc_load_policy: 1`)
- Channel/title attribution displayed
- Progress tracking (saves every 5 seconds)
- Resumes from last position on reload
- "Informational only—not medical advice" disclaimer
- Mobile + desktop responsive
- Unlock button disabled until video completes

### Database Schema
New columns added to `trivia_break_videos`:
```sql
youtube_video_id TEXT  -- YouTube video ID (e.g., "inpok4MKVLM")
channel_name TEXT      -- Channel attribution (e.g., "Headspace")
```

### Cron Setup
See `src/docs/YOUTUBE_WELLNESS_CRON_SETUP.sql` for complete SQL commands.

## User Flow

1. **Session 1 Complete** → YouTubeBreak (1-2) displays
2. User watches ~45 second wellness video
3. Video completes → "Continue to Next Session" unlocks
4. **Session 2 Complete** → YouTubeBreak (2-3) displays
5. User watches second wellness video
6. Video completes → Session 3 unlocks

## Fallback Strategy

If YouTube fetch fails:
- Uses curated fallback video: `inpok4MKVLM` (Mindful Moment)
- User experience is unchanged
- No blank screens or errors
- All features (progress, resume, unlock) work identically

## Testing Checklist

### Desktop
- [ ] Video loads and plays
- [ ] Captions display by default
- [ ] Progress bar updates
- [ ] Reload mid-video resumes correctly
- [ ] "Continue" button unlocks on completion
- [ ] Channel/title attribution visible
- [ ] Disclaimer text present

### Mobile
- [ ] YouTube player responsive
- [ ] Touch controls work
- [ ] Captions readable
- [ ] Buttons properly sized
- [ ] Portrait + landscape work

### Edge Cases
- [ ] Network failure → fallback video loads
- [ ] No YOUTUBE_API_KEY → fallback videos used
- [ ] Session reload → progress restored
- [ ] Demo mode → progress not saved

## Monitoring

Check edge function logs:
```bash
# View recent execution
supabase functions logs fetch-youtube-wellness-shorts

# Check for errors
supabase functions logs fetch-youtube-wellness-shorts | grep ERROR
```

Check database:
```sql
-- View saved videos
SELECT * FROM trivia_break_videos 
ORDER BY created_at DESC 
LIMIT 5;

-- View user progress
SELECT * FROM trivia_break_progress 
WHERE user_id = '<user-id>' 
ORDER BY updated_at DESC;
```

## Configuration

### YouTube API Setup (Optional)
1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable YouTube Data API v3
3. Add secret: `YOUTUBE_API_KEY` in Supabase
4. Function will automatically use it on next run

### Without YouTube API
- System works perfectly with fallback videos
- No action required
- Consider adding your own curated fallback playlist

## Future Enhancements

- [ ] Add more wellness channels
- [ ] Support playlist curation
- [ ] Admin UI to preview/approve videos
- [ ] User feedback collection
- [ ] Video rating/skip feature
- [ ] Multiple language captions
- [ ] Dark mode optimized player

## Troubleshooting

**Video won't play**:
- Check browser console for YouTube API errors
- Verify video ID is valid
- Test with fallback video ID directly

**Progress not saving**:
- Confirm user is authenticated
- Check `trivia_break_progress` table permissions
- Verify RLS policies allow insert/update

**Cron not running**:
- Check `cron.job` table for schedule
- Verify HMAC signature is correct
- Review edge function logs for errors

**Captions not showing**:
- Verify `cc_load_policy: 1` in player config
- Check if video has captions available
- Test with known captioned video
