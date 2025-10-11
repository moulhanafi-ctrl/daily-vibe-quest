-- Phase 2: Admin Phase 1 - Ensure RBAC roles are complete

-- Check and update admin_role enum if needed
DO $$ 
BEGIN
  -- Add analyst role if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'analyst' 
    AND enumtypid = 'admin_role'::regtype
  ) THEN
    ALTER TYPE admin_role ADD VALUE 'analyst';
  END IF;
END $$;

-- Ensure moderator_actions has all necessary fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moderator_actions' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.moderator_actions ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;