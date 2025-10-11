-- Create enums for status tracking
CREATE TYPE guardian_verification_status AS ENUM ('pending', 'verified', 'failed', 'expired');
CREATE TYPE data_export_status AS ENUM ('pending', 'processing', 'ready', 'failed', 'expired');
CREATE TYPE data_deletion_status AS ENUM ('pending', 'cancelled', 'processing', 'completed', 'failed');

-- Create guardian_links table for parent verification
CREATE TABLE public.guardian_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_email TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'email_code',
  status guardian_verification_status NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  code_hash TEXT,
  code_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(child_id, guardian_email)
);

-- Enable RLS on guardian_links
ALTER TABLE public.guardian_links ENABLE ROW LEVEL SECURITY;

-- Policies for guardian_links
CREATE POLICY "Children can create verification requests"
  ON public.guardian_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Children can view their verification requests"
  ON public.guardian_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = child_id);

CREATE POLICY "System can update verification status"
  ON public.guardian_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = child_id);

-- Update data_export_requests with missing columns
ALTER TABLE public.data_export_requests
  DROP COLUMN IF EXISTS status,
  ADD COLUMN status data_export_status NOT NULL DEFAULT 'pending',
  ADD COLUMN error TEXT,
  ADD COLUMN file_path TEXT;

-- Update data_deletion_requests with missing columns and proper status
ALTER TABLE public.data_deletion_requests
  DROP COLUMN IF EXISTS status,
  ADD COLUMN status data_deletion_status NOT NULL DEFAULT 'pending',
  ADD COLUMN error TEXT;

-- Create storage bucket for data exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'data-exports',
  'data-exports',
  false,
  52428800, -- 50MB limit
  ARRAY['application/json', 'application/zip']
);

-- Storage policies for data exports
CREATE POLICY "Users can view their own exports"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'data-exports' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "System can create export files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'data-exports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Add trigger for updated_at on guardian_links
CREATE TRIGGER update_guardian_links_updated_at
  BEFORE UPDATE ON public.guardian_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_guardian_links_child_id ON public.guardian_links(child_id);
CREATE INDEX idx_guardian_links_status ON public.guardian_links(status);
CREATE INDEX idx_data_exports_status ON public.data_export_requests(status);
CREATE INDEX idx_data_deletions_status ON public.data_deletion_requests(status);