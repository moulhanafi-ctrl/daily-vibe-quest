-- Create notify_waitlist table
CREATE TABLE IF NOT EXISTS public.notify_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  page TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notify_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their email
CREATE POLICY "Anyone can add to waitlist"
  ON public.notify_waitlist
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all waitlist entries
CREATE POLICY "Admins can view waitlist"
  ON public.notify_waitlist
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_notify_waitlist_page ON public.notify_waitlist(page);
CREATE INDEX IF NOT EXISTS idx_notify_waitlist_email ON public.notify_waitlist(email);