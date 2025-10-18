-- Create compliance audit table for GDPR/privacy law compliance
CREATE TABLE IF NOT EXISTS public.compliance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.compliance_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all audit logs"
  ON public.compliance_audit FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
  ON public.compliance_audit FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_compliance_audit_user_id ON public.compliance_audit(user_id);
CREATE INDEX idx_compliance_audit_action ON public.compliance_audit(action);
CREATE INDEX idx_compliance_audit_created_at ON public.compliance_audit(created_at DESC);