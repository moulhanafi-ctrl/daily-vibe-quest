-- Add missing fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Detroit',
ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT true;

-- Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text CHECK (type IN ('welcome','birthday','admin_digest')),
  sent_at timestamptz DEFAULT now(),
  status text CHECK (status IN ('queued','sent','failed')) DEFAULT 'queued',
  error text,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS: users see their own logs
CREATE POLICY "Users can view own email logs"
ON public.email_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all email logs"
ON public.email_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert logs
CREATE POLICY "System can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Update profiles RLS to allow admins to read all
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for birthday queries
CREATE INDEX IF NOT EXISTS idx_profiles_birth_date ON public.profiles(birth_date) WHERE marketing_opt_in = true;

-- Create index for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_user_type ON public.email_logs(user_id, type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);