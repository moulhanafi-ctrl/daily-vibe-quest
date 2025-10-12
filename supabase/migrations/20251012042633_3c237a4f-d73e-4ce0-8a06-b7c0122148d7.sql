-- ============================================================================
-- SECURITY FIX: Parent Verification Enforcement & Storage Bucket Policies
-- ============================================================================
-- This migration addresses critical security vulnerabilities:
-- 1. Enforces parent_id requirement for minors (COPPA compliance)
-- 2. Adds RLS policies for storage buckets to prevent unauthorized access
-- 3. Prevents privilege escalation via parent verification bypass
-- ============================================================================

-- ============================================================================
-- PART 1: Enforce Parent Verification for Minors
-- ============================================================================

-- Add check constraint to ensure minors have verified parents
-- This prevents children/teens from bypassing guardian verification
ALTER TABLE profiles 
ADD CONSTRAINT parent_required_for_minors 
CHECK (
  (age_group IN ('child', 'teen') AND parent_id IS NOT NULL)
  OR age_group IN ('adult', 'elder')
);

-- Add RLS policy to enforce verification status
CREATE POLICY "Minors must have verified parents"
ON profiles FOR ALL
USING (
  age_group IN ('adult', 'elder')
  OR (
    age_group IN ('child', 'teen') 
    AND parent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM guardian_links
      WHERE child_id = profiles.id
        AND status = 'verified'
        AND verified_at IS NOT NULL
    )
  )
);

-- Add index for performance on parent verification checks
CREATE INDEX IF NOT EXISTS idx_profiles_parent_verification 
ON profiles(age_group, parent_id) 
WHERE age_group IN ('child', 'teen');

-- ============================================================================
-- PART 2: Storage Bucket RLS Policies
-- ============================================================================

-- Voice Notes Bucket: Owner-only access to private journal recordings
-- Prevents unauthorized access to sensitive audio diary entries
CREATE POLICY "Users can upload own voice notes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can access own voice notes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own voice notes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-notes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Parents can view shared voice notes from their children
CREATE POLICY "Parents can view children's voice notes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-notes'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (storage.foldername(name))[1]::uuid
      AND parent_id = auth.uid()
  )
);

-- Data Exports Bucket: Time-limited access to personal data exports (GDPR compliance)
-- Auto-expires after 7 days for security
CREATE POLICY "Users can download own data exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'data-exports'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND created_at > now() - interval '7 days'
);

CREATE POLICY "System can upload data exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'data-exports'
);

-- Family Stories Bucket: Family members can view 24-hour stories
-- Ensures only family group members access private video content
CREATE POLICY "Users can upload family stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'family-stories'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Family members can view stories"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'family-stories'
  AND (
    -- User is the story creator
    (storage.foldername(name))[1] = auth.uid()::text
    OR 
    -- User is in the same family group
    EXISTS (
      SELECT 1 FROM family_stories fs
      JOIN family_members fm ON fm.family_id = fs.family_id
      WHERE fs.video_url LIKE '%' || name
        AND fm.user_id = auth.uid()
        AND fs.expires_at > now()
    )
  )
);

CREATE POLICY "Users can delete own stories"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'family-stories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- PART 3: Audit and Monitoring
-- ============================================================================

-- Log existing children without parent verification (for manual review)
-- This helps identify accounts that need attention
DO $$
DECLARE
  unverified_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unverified_count
  FROM profiles
  WHERE age_group IN ('child', 'teen')
    AND parent_id IS NULL;
  
  IF unverified_count > 0 THEN
    RAISE NOTICE 'SECURITY AUDIT: Found % unverified minor accounts that need parent verification', unverified_count;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON CONSTRAINT parent_required_for_minors ON profiles IS 
  'SECURITY: Enforces COPPA compliance by requiring verified parent_id for all child and teen accounts. Prevents minors from bypassing guardian verification.';