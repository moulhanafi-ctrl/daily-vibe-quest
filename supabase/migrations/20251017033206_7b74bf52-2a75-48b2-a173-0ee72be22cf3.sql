-- Create notification_prefs table
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_enabled BOOLEAN DEFAULT true,
  daily_time TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'America/Detroit',
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.daily_messages(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL, -- 'daily_motivation', 'trivia', etc.
  channel TEXT NOT NULL, -- 'push', 'email'
  status TEXT NOT NULL, -- 'sent', 'delivered', 'failed', 'opened'
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_prefs
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_prefs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_prefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_prefs FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for notification_logs
CREATE POLICY "Users can view their own notification logs"
  ON public.notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON public.notification_prefs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_daily_enabled ON public.notification_prefs(daily_enabled) WHERE daily_enabled = true;
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type_status ON public.notification_logs(notification_type, status);

-- Create trigger to update updated_at
CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();