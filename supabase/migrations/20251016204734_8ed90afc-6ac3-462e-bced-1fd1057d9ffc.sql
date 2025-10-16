-- ================================================
-- SATURDAY TRIVIA NOTIFICATION SYSTEM
-- Tracking, preferences, and monitoring for automated trivia notifications
-- ================================================

-- Create trivia notification preferences table
CREATE TABLE IF NOT EXISTS trivia_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification channels
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  
  -- Timing preferences
  reminder_enabled BOOLEAN DEFAULT true, -- Saturday 6:50 PM reminder
  start_enabled BOOLEAN DEFAULT true,    -- Saturday 7:00 PM start notification
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  
  -- Timezone (default America/Detroit)
  timezone TEXT DEFAULT 'America/Detroit',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create trivia notification logs table (telemetry)
CREATE TABLE IF NOT EXISTS trivia_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_key DATE NOT NULL,
  notification_type TEXT NOT NULL, -- 'reminder', 'start'
  
  -- Delivery metrics
  total_users INT NOT NULL DEFAULT 0,
  push_sent INT NOT NULL DEFAULT 0,
  push_delivered INT NOT NULL DEFAULT 0,
  push_opened INT NOT NULL DEFAULT 0,
  email_sent INT NOT NULL DEFAULT 0,
  email_delivered INT NOT NULL DEFAULT 0,
  email_opened INT NOT NULL DEFAULT 0,
  quiet_hours_skipped INT NOT NULL DEFAULT 0,
  
  -- Deep link metrics
  deep_link_clicks INT NOT NULL DEFAULT 0,
  
  -- Error tracking
  push_errors INT NOT NULL DEFAULT 0,
  email_errors INT NOT NULL DEFAULT 0,
  error_details JSONB DEFAULT '[]',
  
  -- Timing
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Create trivia logs table (general automation events)
CREATE TABLE IF NOT EXISTS trivia_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  week_key DATE NOT NULL,
  event_type TEXT NOT NULL, -- 'generation', 'publishing', 'youtube_fetch', 'notification', 'cleanup', 'health_check', 'error'
  status TEXT NOT NULL, -- 'success', 'failure', 'warning'
  message TEXT,
  metadata JSONB DEFAULT '{}',
  function_name TEXT,
  error_details TEXT
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trivia_notif_prefs_user ON trivia_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_trivia_notif_logs_week ON trivia_notification_logs(week_key);
CREATE INDEX IF NOT EXISTS idx_trivia_notif_logs_type ON trivia_notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_trivia_logs_week ON trivia_logs(week_key);
CREATE INDEX IF NOT EXISTS idx_trivia_logs_event ON trivia_logs(event_type, status);
CREATE INDEX IF NOT EXISTS idx_trivia_logs_created ON trivia_logs(created_at DESC);

-- Enable RLS
ALTER TABLE trivia_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivia_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: trivia_notification_preferences
CREATE POLICY "Users can view their own trivia notification preferences"
  ON trivia_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own trivia notification preferences"
  ON trivia_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trivia notification preferences"
  ON trivia_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies: trivia_notification_logs (admin only)
CREATE POLICY "Admins can view notification logs"
  ON trivia_notification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert notification logs"
  ON trivia_notification_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies: trivia_logs (admin + system)
CREATE POLICY "Admins can view trivia logs"
  ON trivia_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert trivia logs"
  ON trivia_logs FOR INSERT
  WITH CHECK (true);

-- Create updated_at trigger for preferences
CREATE TRIGGER update_trivia_notification_preferences_updated_at
  BEFORE UPDATE ON trivia_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create function to get users eligible for notifications
CREATE OR REPLACE FUNCTION get_trivia_notification_users(
  p_notification_type TEXT, -- 'reminder' or 'start'
  p_scheduled_time TIMESTAMPTZ
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  push_enabled BOOLEAN,
  email_enabled BOOLEAN,
  in_quiet_hours BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(tnp.push_enabled, true) as push_enabled,
    COALESCE(tnp.email_enabled, true) as email_enabled,
    CASE 
      WHEN COALESCE(tnp.quiet_hours_enabled, false) = false THEN false
      WHEN tnp.quiet_hours_start < tnp.quiet_hours_end THEN
        -- Simple case: quiet hours within same day (e.g. 22:00 - 08:00 next day)
        EXTRACT(HOUR FROM p_scheduled_time AT TIME ZONE COALESCE(tnp.timezone, 'America/Detroit'))::TIME 
          BETWEEN tnp.quiet_hours_start AND tnp.quiet_hours_end
      ELSE
        -- Complex case: quiet hours cross midnight (e.g. 22:00 - 08:00)
        EXTRACT(HOUR FROM p_scheduled_time AT TIME ZONE COALESCE(tnp.timezone, 'America/Detroit'))::TIME >= tnp.quiet_hours_start
        OR EXTRACT(HOUR FROM p_scheduled_time AT TIME ZONE COALESCE(tnp.timezone, 'America/Detroit'))::TIME <= tnp.quiet_hours_end
    END as in_quiet_hours
  FROM auth.users u
  LEFT JOIN trivia_notification_preferences tnp ON tnp.user_id = u.id
  WHERE 
    -- User has not deleted their account
    u.deleted_at IS NULL
    -- Notification type is enabled
    AND (
      (p_notification_type = 'reminder' AND COALESCE(tnp.reminder_enabled, true) = true)
      OR (p_notification_type = 'start' AND COALESCE(tnp.start_enabled, true) = true)
    )
    -- At least one channel is enabled
    AND (
      COALESCE(tnp.push_enabled, true) = true
      OR COALESCE(tnp.email_enabled, true) = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;