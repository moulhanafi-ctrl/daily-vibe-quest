-- Add generation log table for auditing
CREATE TABLE IF NOT EXISTS public.trivia_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week DATE NOT NULL,
  age_group age_group NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'es', 'fr', 'ar')),
  candidates JSONB DEFAULT '[]'::jsonb,
  kept_ids TEXT[] DEFAULT '{}',
  dropped_reasons JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'review')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add locale and published to trivia_rounds
ALTER TABLE public.trivia_rounds
ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'es', 'fr', 'ar')),
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;

-- Enable RLS on generation log
ALTER TABLE public.trivia_generation_log ENABLE ROW LEVEL SECURITY;

-- Admins can view generation logs
CREATE POLICY "Admins can view generation logs"
ON public.trivia_generation_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert generation logs
CREATE POLICY "System can insert generation logs"
ON public.trivia_generation_log
FOR INSERT
WITH CHECK (true);

-- System can update generation logs
CREATE POLICY "System can update generation logs"
ON public.trivia_generation_log
FOR UPDATE
USING (true);

-- Add updated_at trigger for generation log
CREATE TRIGGER update_trivia_generation_log_updated_at
  BEFORE UPDATE ON public.trivia_generation_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trivia_generation_log_week ON public.trivia_generation_log(week);
CREATE INDEX IF NOT EXISTS idx_trivia_generation_log_status ON public.trivia_generation_log(status);
CREATE INDEX IF NOT EXISTS idx_trivia_rounds_published ON public.trivia_rounds(published);
CREATE INDEX IF NOT EXISTS idx_trivia_rounds_date_locale ON public.trivia_rounds(date, locale);