-- Update help_locations table structure for better data management
ALTER TABLE public.help_locations 
  DROP COLUMN IF EXISTS address,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);

-- Ensure lat/lon columns exist (they may have been added before)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'help_locations' AND column_name = 'latitude') THEN
    ALTER TABLE public.help_locations ADD COLUMN latitude numeric(9,6);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'help_locations' AND column_name = 'longitude') THEN
    ALTER TABLE public.help_locations ADD COLUMN longitude numeric(9,6);
  END IF;
END $$;

-- Add is_active column for soft deletes
ALTER TABLE public.help_locations 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_help_locations_type ON public.help_locations(type);
CREATE INDEX IF NOT EXISTS idx_help_locations_coords ON public.help_locations(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_help_locations_active ON public.help_locations(is_active) WHERE is_active = true;

-- Create geocode_jobs table for async geocoding
CREATE TABLE IF NOT EXISTS public.geocode_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  input_address text NOT NULL,
  result_lat numeric(9,6),
  result_lon numeric(9,6),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geocode_jobs_status ON public.geocode_jobs(status);

-- Enable RLS on geocode_jobs
ALTER TABLE public.geocode_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can manage geocode jobs
CREATE POLICY "Admins can manage geocode jobs"
ON public.geocode_jobs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create geocode_cache table for performance
CREATE TABLE IF NOT EXISTS public.geocode_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_hash text UNIQUE NOT NULL,
  address_input text NOT NULL,
  latitude numeric(9,6) NOT NULL,
  longitude numeric(9,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geocode_cache_hash ON public.geocode_cache(address_hash);

-- Admins can view geocode cache
CREATE POLICY "Admins can view geocode cache"
ON public.geocode_cache
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- System can insert into geocode cache
CREATE POLICY "System can insert geocode cache"
ON public.geocode_cache
FOR INSERT
TO authenticated
WITH CHECK (true);