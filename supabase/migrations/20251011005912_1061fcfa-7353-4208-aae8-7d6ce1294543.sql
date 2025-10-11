-- Remove unique constraint on username since first names can be duplicate
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Add index for performance but allow duplicates
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);