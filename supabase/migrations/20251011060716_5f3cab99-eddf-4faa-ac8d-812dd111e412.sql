-- Phase 1: Safety & Observability Foundation

-- Create analytics_events table for centralized event tracking
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  session_id TEXT,
  page_url TEXT
);

-- Add index for efficient querying
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all events
CREATE POLICY "Admins can view all events"
  ON public.analytics_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert events
CREATE POLICY "Authenticated users can insert events"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Add category to incidents table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incidents' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.incidents ADD COLUMN category TEXT;
  END IF;
END $$;