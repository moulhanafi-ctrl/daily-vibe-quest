
-- Fix duration constraint to match spec (30-60 seconds instead of 30-45)
ALTER TABLE trivia_break_videos 
DROP CONSTRAINT IF EXISTS trivia_break_videos_duration_seconds_check;

ALTER TABLE trivia_break_videos 
ADD CONSTRAINT trivia_break_videos_duration_seconds_check 
CHECK (duration_seconds >= 30 AND duration_seconds <= 60);
