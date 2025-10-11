-- Enhance legal consent tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS legal_consent_version TEXT,
ADD COLUMN IF NOT EXISTS legal_consent_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS legal_consent_ip TEXT,
ADD COLUMN IF NOT EXISTS legal_consent_user_agent TEXT;

-- Create legal versions table
CREATE TABLE IF NOT EXISTS public.legal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('terms', 'privacy', 'guidelines', 'safety')),
  version TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_es TEXT,
  content_fr TEXT,
  content_ar TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(document_type, version)
);

-- Enable RLS
ALTER TABLE public.legal_versions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active legal versions
CREATE POLICY "Anyone can view active legal versions"
ON public.legal_versions
FOR SELECT
USING (active = true);

-- Admins can manage legal versions
CREATE POLICY "Admins can manage legal versions"
ON public.legal_versions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create consent ledger table
CREATE TABLE IF NOT EXISTS public.consent_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_ip TEXT,
  user_agent TEXT,
  guardian_id UUID REFERENCES auth.users(id),
  terms_accepted BOOLEAN DEFAULT false,
  privacy_accepted BOOLEAN DEFAULT false,
  guidelines_accepted BOOLEAN DEFAULT false,
  not_therapy_acknowledged BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.consent_ledger ENABLE ROW LEVEL SECURITY;

-- Users can view their own consent records
CREATE POLICY "Users can view their own consent"
ON public.consent_ledger
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert consent records
CREATE POLICY "System can insert consent"
ON public.consent_ledger
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all consent records
CREATE POLICY "Admins can view all consent"
ON public.consent_ledger
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create data export requests table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  download_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own export requests
CREATE POLICY "Users can manage their export requests"
ON public.data_export_requests
FOR ALL
USING (auth.uid() = user_id);

-- Create data deletion requests table
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'grace_period', 'processing', 'completed', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  grace_period_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
  completed_at TIMESTAMP WITH TIME ZONE,
  cancellation_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex')
);

-- Enable RLS
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can manage their deletion requests
CREATE POLICY "Users can manage their deletion requests"
ON public.data_deletion_requests
FOR ALL
USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_consent_ledger_user_id ON public.consent_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_ledger_version ON public.consent_ledger(version);
CREATE INDEX IF NOT EXISTS idx_data_export_user_id ON public.data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_user_id ON public.data_deletion_requests(user_id);

-- Insert current legal version
INSERT INTO public.legal_versions (document_type, version, content_en, active) VALUES
('terms', '1.0.0', 'By using Vibe Check, you agree to these Terms. Vibe Check provides wellness content and peer rooms; it is not medical or therapeutic care. Some features require age or parental consent. We may moderate content and restrict accounts that violate our rules.', true),
('privacy', '1.0.0', 'We collect the minimum data needed to run the app (account info, check-ins, prompts usage, purchases). We don''t sell personal data. You can download or delete your data anytime in Settings.', true),
('guidelines', '1.0.0', 'Everyone belongs here. Be kind and keep conversations safe. No bullying, hate speech, explicit content, or doxxing. We use a mix of AI and human moderators to enforce these rules.', true),
('safety', '1.0.0', 'If you need immediate help, call your local emergency number. Vibe Check is not a crisis service.', true);