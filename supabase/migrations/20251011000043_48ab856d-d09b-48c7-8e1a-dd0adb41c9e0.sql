-- Add new fields to profiles table for personalized onboarding
ALTER TABLE profiles 
ADD COLUMN first_name text,
ADD COLUMN age integer,
ADD COLUMN sex text,
ADD COLUMN zipcode text,
ADD COLUMN selected_focus_areas text[],
ADD COLUMN optional_reflection text;

-- Update age_group enum to include elders
ALTER TYPE age_group ADD VALUE IF NOT EXISTS 'elder';

-- Create a function to auto-assign age group based on age
CREATE OR REPLACE FUNCTION public.assign_age_group(user_age integer)
RETURNS age_group
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF user_age >= 5 AND user_age <= 12 THEN
    RETURN 'child'::age_group;
  ELSIF user_age >= 13 AND user_age <= 17 THEN
    RETURN 'teen'::age_group;
  ELSIF user_age >= 18 AND user_age <= 60 THEN
    RETURN 'adult'::age_group;
  ELSIF user_age >= 61 THEN
    RETURN 'elder'::age_group;
  ELSE
    RETURN 'adult'::age_group; -- default
  END IF;
END;
$$;