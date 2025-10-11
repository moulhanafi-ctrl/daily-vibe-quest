-- Create system health tracking tables
CREATE TABLE IF NOT EXISTS public.system_health_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'partial', 'running')),
  total INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_health_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.system_health_runs(id) ON DELETE CASCADE,
  test_key TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'skip')),
  duration_ms INTEGER NOT NULL,
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_runs_started ON public.system_health_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_results_run ON public.system_health_results(run_id);
CREATE INDEX IF NOT EXISTS idx_health_results_test_time ON public.system_health_results(test_key, created_at DESC);

-- Enable RLS
ALTER TABLE public.system_health_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
CREATE POLICY "Admins can view health runs"
  ON public.system_health_runs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert health runs"
  ON public.system_health_runs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update health runs"
  ON public.system_health_runs
  FOR UPDATE
  USING (true);

CREATE POLICY "Admins can view health results"
  ON public.system_health_results
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert health results"
  ON public.system_health_results
  FOR INSERT
  WITH CHECK (true);