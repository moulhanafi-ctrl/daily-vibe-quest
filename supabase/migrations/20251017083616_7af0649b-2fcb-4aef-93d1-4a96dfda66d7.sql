-- Drop the view if it exists
DROP VIEW IF EXISTS public.subscriber_daily_rollups CASCADE;

-- Create subscriber_daily_rollups table for trend tracking
CREATE TABLE IF NOT EXISTS public.subscriber_daily_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  total_users bigint NOT NULL DEFAULT 0,
  push_subscribers bigint NOT NULL DEFAULT 0,
  daily_opt_in bigint NOT NULL DEFAULT 0,
  birthday_opt_in bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriber_daily_rollups ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view rollups
CREATE POLICY "Admins can view subscriber rollups"
  ON public.subscriber_daily_rollups
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for product images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Admins can upload product images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update product images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'product-images' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete product images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'product-images' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');