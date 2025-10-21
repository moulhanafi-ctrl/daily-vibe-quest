
-- ============================================
-- USER BLOCKING FEATURE (Apple Requirement)
-- ============================================

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  -- Prevent self-blocking
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_users
CREATE POLICY "Users can block other users"
ON public.blocked_users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view their blocked list"
ON public.blocked_users
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock users"
ON public.blocked_users
FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);

-- Create helper function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = _user_id AND blocked_id = _target_id)
       OR (blocker_id = _target_id AND blocked_id = _user_id)
  );
$$;

-- Revoke public access
REVOKE ALL ON FUNCTION public.is_user_blocked(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_blocked(uuid, uuid) TO authenticated;

-- Update chat_messages policies to exclude blocked users
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;

CREATE POLICY "Users can insert messages in their rooms (with block check)"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND has_chat_access(auth.uid())
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_users bu
    WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id IN (
      SELECT DISTINCT cm.user_id FROM public.chat_messages cm WHERE cm.room_id = chat_messages.room_id
    ))
    OR (bu.blocked_id = auth.uid())
  )
);

CREATE POLICY "Users can view messages in their rooms (excluding blocked)"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  has_chat_access(auth.uid())
  AND NOT is_user_blocked(auth.uid(), user_id)
);

-- ============================================
-- SECURITY VALIDATION
-- ============================================
-- After this migration:
-- ✅ Users can block/unblock other users
-- ✅ Blocked users cannot see each other's messages
-- ✅ Blocked users cannot send messages to each other
-- ✅ Self-blocking is prevented
-- ✅ RLS policies protect block list privacy
-- ✅ Apple App Store blocking requirement satisfied
