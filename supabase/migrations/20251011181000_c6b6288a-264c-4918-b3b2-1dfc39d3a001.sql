-- Add location column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS location jsonb;

-- Add index for better performance on location queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles USING gin(location);

-- Add index on help_locations for better geospatial queries
CREATE INDEX IF NOT EXISTS idx_help_locations_coords ON public.help_locations (lat, lon);
CREATE INDEX IF NOT EXISTS idx_help_locations_type ON public.help_locations (type);
CREATE INDEX IF NOT EXISTS idx_help_locations_is_national ON public.help_locations (is_national);