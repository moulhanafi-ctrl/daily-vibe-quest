-- Create table for daily notification messages (admin-managed)
CREATE TABLE IF NOT EXISTS public.daily_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  message_title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  deep_link_url TEXT DEFAULT '/dashboard',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(day_of_week)
);

-- Enable RLS
ALTER TABLE public.daily_messages ENABLE ROW LEVEL SECURITY;

-- Policies for daily messages
CREATE POLICY "Admins can manage daily messages"
  ON public.daily_messages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active messages"
  ON public.daily_messages
  FOR SELECT
  USING (active = true);

-- Create notification logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.daily_messages(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL DEFAULT 'daily_motivation', -- daily_motivation, check_in_reminder, etc
  channel TEXT NOT NULL, -- push, email, both
  status TEXT NOT NULL, -- sent, failed, pending
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies for notification logs
CREATE POLICY "Users can view their own logs"
  ON public.notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs"
  ON public.notification_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert logs"
  ON public.notification_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update logs"
  ON public.notification_logs
  FOR UPDATE
  USING (true);

-- Add daily notification preferences to notification_prefs table if it exists
-- Otherwise create a new preferences table
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_prefs') THEN
    -- Add columns to existing table
    ALTER TABLE public.notification_prefs 
      ADD COLUMN IF NOT EXISTS daily_enabled BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS daily_time TIME DEFAULT '09:00:00',
      ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Detroit';
  ELSE
    -- Create new table
    CREATE TABLE public.notification_prefs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
      daily_enabled BOOLEAN DEFAULT true,
      daily_time TIME DEFAULT '09:00:00',
      timezone TEXT DEFAULT 'America/Detroit',
      quiet_hours_enabled BOOLEAN DEFAULT false,
      quiet_hours_start TIME DEFAULT '22:00:00',
      quiet_hours_end TIME DEFAULT '07:00:00',
      email_fallback BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own prefs"
      ON public.notification_prefs
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Insert default daily messages (7 messages, one per day)
INSERT INTO public.daily_messages (day_of_week, message_title, message_body, deep_link_url) VALUES
  (0, '🌅 Sunday Reflection', 'Remember to check in today — your wellness matters.', '/dashboard'),
  (1, '💪 Monday Motivation', 'Take a deep breath. Small steps create big change.', '/journal'),
  (2, '🙏 Tuesday Gratitude', 'Gratitude grows happiness. What are you thankful for today?', '/journal'),
  (3, '🌟 Wednesday Wisdom', 'You''re doing better than you think. Keep going!', '/dashboard'),
  (4, '🎯 Thursday Thoughts', 'Progress over perfection. How are you feeling today?', '/journal'),
  (5, '🌈 Friday Feels', 'The weekend is near! Take a moment to celebrate your wins.', '/dashboard'),
  (6, '💫 Saturday Self-Care', 'Rest is productive too. What brings you joy today?', '/dashboard')
ON CONFLICT (day_of_week) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_sent ON public.notification_logs(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status, sent_at);

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_daily_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_messages_timestamp
  BEFORE UPDATE ON public.daily_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_messages_updated_at();