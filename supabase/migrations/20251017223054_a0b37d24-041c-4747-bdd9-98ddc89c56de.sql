-- AI Generations Digest Notification System

-- 1. Create ai_generations table
CREATE TABLE IF NOT EXISTS public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  preview_url TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_generations
CREATE POLICY "Users can view their own generations"
  ON public.ai_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
  ON public.ai_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
  ON public.ai_generations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all generations"
  ON public.ai_generations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_ai_generations_user_created ON public.ai_generations(user_id, created_at DESC);

-- 2. Create notification_channel enum
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'both');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Add notification preferences to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS notification_opt_in BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_channel notification_channel DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS notification_timezone TEXT DEFAULT 'America/Detroit',
  ADD COLUMN IF NOT EXISTS digest_time_1 TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS digest_time_2 TIME DEFAULT '18:00:00';

-- 4. Create notifications table for logging
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel notification_channel NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  error_msg TEXT,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_notifications_user_sent ON public.notifications(user_id, sent_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- 5. Create digest_job_logs table
CREATE TABLE IF NOT EXISTS public.digest_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  users_targeted INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  error_details JSONB,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.digest_job_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage digest logs"
  ON public.digest_job_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_digest_job_logs_run_time ON public.digest_job_logs(run_time DESC);

-- 6. Create function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.notifications
  WHERE user_id = p_user_id
    AND read_at IS NULL
    AND type = 'ai_digest';
$$;

-- 7. Update trigger for ai_generations
CREATE OR REPLACE FUNCTION public.update_ai_generations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_generations_updated_at
  BEFORE UPDATE ON public.ai_generations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_generations_updated_at();