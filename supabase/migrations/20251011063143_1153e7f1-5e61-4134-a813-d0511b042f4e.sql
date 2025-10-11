-- Add language preference to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' CHECK (language IN ('en', 'es', 'fr', 'ar'));

-- Add language dimension to analytics_events
ALTER TABLE public.analytics_events
ADD COLUMN IF NOT EXISTS language TEXT;

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_analytics_events_language ON public.analytics_events(language);