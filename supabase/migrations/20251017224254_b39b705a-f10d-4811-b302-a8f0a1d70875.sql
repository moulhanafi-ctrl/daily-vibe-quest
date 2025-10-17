-- Update Arthur config to use Mostapha
UPDATE public.arthur_config
SET 
  name = 'Mostapha',
  signature = '— Mostapha',
  tone = 'warm, encouraging, plain-language, 8th-grade reading level',
  intro = 'Hi, I''m Mostapha. I''ll nudge you with gentle, useful check-ins.'
WHERE id = (SELECT id FROM public.arthur_config LIMIT 1);

-- Create table for daily AI message logs
CREATE TABLE IF NOT EXISTS public.daily_ai_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_time timestamptz NOT NULL DEFAULT now(),
  window_type text NOT NULL, -- 'morning' or 'evening' or 'kickoff'
  users_targeted integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  error_details jsonb,
  status text NOT NULL DEFAULT 'running',
  completed_at timestamptz
);

ALTER TABLE public.daily_ai_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage daily AI message logs"
ON public.daily_ai_message_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));