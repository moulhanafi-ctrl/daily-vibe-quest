-- Add YouTube-specific columns to trivia_break_videos
ALTER TABLE trivia_break_videos 
ADD COLUMN IF NOT EXISTS youtube_video_id TEXT,
ADD COLUMN IF NOT EXISTS channel_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trivia_break_videos_week_position 
ON trivia_break_videos(week_key, break_position);