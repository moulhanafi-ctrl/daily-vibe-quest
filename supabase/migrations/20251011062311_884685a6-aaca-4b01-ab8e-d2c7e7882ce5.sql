-- Create enum for help location types
CREATE TYPE help_location_type AS ENUM ('crisis', 'therapy');

-- Create help_locations table
CREATE TABLE public.help_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type help_location_type NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  website_url TEXT,
  address TEXT NOT NULL,
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  zip_coverage TEXT[] DEFAULT '{}',
  open_hours JSONB,
  open_now BOOLEAN,
  accepts_insurance BOOLEAN DEFAULT false,
  insurers TEXT[] DEFAULT '{}',
  sliding_scale BOOLEAN DEFAULT false,
  telehealth BOOLEAN DEFAULT false,
  ratings JSONB,
  tags TEXT[] DEFAULT '{}',
  last_verified_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'manual',
  priority INTEGER DEFAULT 0,
  is_national BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_locations ENABLE ROW LEVEL SECURITY;

-- Anyone can view help locations
CREATE POLICY "Anyone can view help locations"
ON public.help_locations
FOR SELECT
USING (true);

-- Admins can manage help locations
CREATE POLICY "Admins can manage help locations"
ON public.help_locations
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add location and insurance to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS location JSONB,
ADD COLUMN IF NOT EXISTS insurance JSONB;

-- Create index for ZIP search
CREATE INDEX idx_help_locations_zip_coverage ON public.help_locations USING GIN(zip_coverage);
CREATE INDEX idx_help_locations_type ON public.help_locations (type);
CREATE INDEX idx_help_locations_priority ON public.help_locations (priority DESC);

-- Trigger for updated_at
CREATE TRIGGER update_help_locations_updated_at
BEFORE UPDATE ON public.help_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default national crisis resources
INSERT INTO public.help_locations (
  type, name, phone, website_url, address, 
  is_national, priority, tags, source, last_verified_at
) VALUES
(
  'crisis',
  '988 Suicide & Crisis Lifeline',
  '988',
  'https://988lifeline.org',
  'National',
  true,
  100,
  ARRAY['24/7', 'multilingual', 'lgbtq_affirming'],
  'directory',
  now()
),
(
  'crisis',
  'Crisis Text Line',
  'Text HOME to 741741',
  'https://www.crisistextline.org',
  'National',
  true,
  95,
  ARRAY['24/7', 'text_based', 'youth_friendly'],
  'directory',
  now()
),
(
  'crisis',
  'The Trevor Project (LGBTQ+ Youth)',
  '1-866-488-7386',
  'https://www.thetrevorproject.org',
  'National',
  true,
  90,
  ARRAY['24/7', 'lgbtq_affirming', 'youth_friendly'],
  'directory',
  now()
);