-- Enable RLS on geocode_cache (security fix)
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;