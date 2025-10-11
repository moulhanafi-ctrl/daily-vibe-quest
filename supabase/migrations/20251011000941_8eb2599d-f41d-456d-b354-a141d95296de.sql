-- Add parent account linking
ALTER TABLE profiles
ADD COLUMN is_parent boolean DEFAULT false,
ADD COLUMN parent_id uuid REFERENCES profiles(id);

-- Create family invite codes table
CREATE TABLE family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  is_used boolean DEFAULT false
);

-- Enable RLS on family_invites
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- Policies for family_invites
CREATE POLICY "Parents can view their invite codes"
  ON family_invites FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can create invite codes"
  ON family_invites FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Anyone can view active invite codes"
  ON family_invites FOR SELECT
  USING (NOT is_used AND expires_at > now());

-- Function to generate family invite code
CREATE OR REPLACE FUNCTION generate_family_invite_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Update profiles RLS to allow parents to view children
CREATE POLICY "Parents can view their children profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR 
    auth.uid() = parent_id OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_parent = true
      AND profiles.parent_id = p.id
    )
  );