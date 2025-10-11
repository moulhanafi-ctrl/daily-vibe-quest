-- Create zip_centroids cache table
CREATE TABLE IF NOT EXISTS public.zip_centroids (
  zip TEXT PRIMARY KEY CHECK (zip ~ '^\d{5}$'),
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  city TEXT,
  state TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_zip_centroids_updated ON public.zip_centroids(updated_at);

-- Enable RLS
ALTER TABLE public.zip_centroids ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached ZIPs
CREATE POLICY "Anyone can view ZIP centroids"
  ON public.zip_centroids
  FOR SELECT
  USING (true);

-- Only system/admins can insert/update
CREATE POLICY "System can insert ZIP centroids"
  ON public.zip_centroids
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update ZIP centroids"
  ON public.zip_centroids
  FOR UPDATE
  USING (true);

-- Admins can manage ZIP cache
CREATE POLICY "Admins can delete ZIP centroids"
  ON public.zip_centroids
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));