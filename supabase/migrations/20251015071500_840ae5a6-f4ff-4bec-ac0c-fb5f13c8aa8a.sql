-- Add visibility column to journal_entries if not exists
ALTER TABLE public.journal_entries 
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';

-- Create function to prevent minors from setting public visibility
CREATE OR REPLACE FUNCTION public.prevent_minor_public_journals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is a minor trying to set visibility to public
  IF NEW.visibility = 'public' THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = NEW.user_id 
      AND age_group IN ('child', 'teen')
    ) THEN
      RAISE EXCEPTION 'Minors cannot create public journals';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS check_minor_public_journals ON public.journal_entries;

-- Create trigger to enforce the rule
CREATE TRIGGER check_minor_public_journals
BEFORE INSERT OR UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_minor_public_journals();

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert their own entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update their own entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete their own entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Parents can view shared entries" ON public.journal_entries;

-- Owner can do everything on their journals
CREATE POLICY "Owner full access to journals" 
ON public.journal_entries
FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Parent/guardian read-only for minors (via profiles.parent_id)
CREATE POLICY "Parents can view children journals" 
ON public.journal_entries
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = journal_entries.user_id
      AND p.parent_id = auth.uid()
      AND p.age_group IN ('child', 'teen')
      AND EXISTS (
        SELECT 1 FROM public.profiles parent
        WHERE parent.id = auth.uid()
        AND parent.is_parent = true
      )
  )
);

-- Parent/guardian read-only for minors (via guardian_links)
CREATE POLICY "Guardians can view children journals" 
ON public.journal_entries
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.guardian_links gl
    INNER JOIN auth.users u ON u.email = gl.guardian_email
    WHERE gl.child_id = journal_entries.user_id
      AND u.id = auth.uid()
      AND gl.status = 'verified'
  )
);

-- Create journal access logs table
CREATE TABLE IF NOT EXISTS public.journal_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on access logs
ALTER TABLE public.journal_access_logs ENABLE ROW LEVEL SECURITY;

-- Only the user and admins can view their access logs
CREATE POLICY "Users can view own access logs" 
ON public.journal_access_logs
FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- System can insert access logs
CREATE POLICY "System can insert access logs" 
ON public.journal_access_logs
FOR INSERT 
WITH CHECK (true);