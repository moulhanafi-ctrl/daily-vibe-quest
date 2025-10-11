-- ============================================
-- Phase 1: VibeOps Admin AI Assistant Schema
-- ============================================

-- 1. Create admin role enum (extends existing app_role if needed)
-- Note: app_role already exists, but we may need to add new roles
DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('owner', 'moderator', 'support', 'analyst', 'store_manager');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Extend user_roles to support admin roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS admin_role admin_role;

-- 3. Create audit log table for all AI actions
CREATE TABLE IF NOT EXISTS public.ai_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor TEXT NOT NULL DEFAULT 'ai', -- 'ai' or 'human'
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tool TEXT NOT NULL,
  input_json JSONB NOT NULL,
  output_json JSONB,
  action TEXT NOT NULL, -- 'read', 'write', 'propose', 'execute'
  target TEXT, -- user_id, message_id, room_id, etc
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'executed', 'failed'
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rollback_ref UUID REFERENCES public.ai_audit(id) ON DELETE SET NULL,
  error_message TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_audit_actor_id ON public.ai_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_tool ON public.ai_audit(tool);
CREATE INDEX IF NOT EXISTS idx_ai_audit_status ON public.ai_audit(status);
CREATE INDEX IF NOT EXISTS idx_ai_audit_created_at ON public.ai_audit(created_at DESC);

-- 4. Create incidents table for moderation tracking
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'harassment', 'spam', 'self_harm', 'sexual_content', 'hate_speech', 'other'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'dismissed'
  description TEXT,
  flagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for moderation queries
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON public.incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON public.incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_room_id ON public.incidents(room_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents(created_at DESC);

-- 5. Create moderator actions table
CREATE TABLE IF NOT EXISTS public.moderator_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'warn', 'mute', 'suspend', 'ban', 'message'
  reason TEXT NOT NULL,
  duration INTERVAL, -- for mute/suspend
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB, -- additional context
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for action history
CREATE INDEX IF NOT EXISTS idx_moderator_actions_target_user ON public.moderator_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_moderator ON public.moderator_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_incident ON public.moderator_actions(incident_id);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_created_at ON public.moderator_actions(created_at DESC);

-- 6. Update trigger for incidents
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.ai_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_actions ENABLE ROW LEVEL SECURITY;

-- ai_audit policies: only admin roles can view
CREATE POLICY "Admins can view audit logs"
  ON public.ai_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR admin_role IN ('owner', 'moderator', 'support', 'analyst'))
    )
  );

CREATE POLICY "System can insert audit logs"
  ON public.ai_audit FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update audit status"
  ON public.ai_audit FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR admin_role IN ('owner', 'moderator', 'support'))
    )
  );

-- incidents policies
CREATE POLICY "Admins can view all incidents"
  ON public.incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR admin_role IN ('owner', 'moderator', 'support'))
    )
  );

CREATE POLICY "Admins can create incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR admin_role IN ('owner', 'moderator', 'support'))
    )
  );

CREATE POLICY "Admins can update incidents"
  ON public.incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR admin_role IN ('owner', 'moderator', 'support'))
    )
  );

-- moderator_actions policies
CREATE POLICY "Admins can view all actions"
  ON public.moderator_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR admin_role IN ('owner', 'moderator', 'support', 'analyst'))
    )
  );

CREATE POLICY "Moderators can create actions"
  ON public.moderator_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND (role = 'admin' OR admin_role IN ('owner', 'moderator'))
    )
  );

-- ============================================
-- Helper Functions
-- ============================================

-- Check if user has admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid, _admin_role admin_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'admin' OR admin_role = _admin_role)
  )
$$;