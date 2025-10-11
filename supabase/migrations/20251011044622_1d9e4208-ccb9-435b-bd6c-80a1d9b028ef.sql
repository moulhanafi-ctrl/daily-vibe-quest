-- Add pronouns and inclusion fields to profiles (only these, violations handled earlier)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pronouns TEXT,
ADD COLUMN IF NOT EXISTS show_pronouns BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS inclusion_acknowledged_version TEXT;