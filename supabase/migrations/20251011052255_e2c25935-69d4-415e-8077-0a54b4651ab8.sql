-- Parent notification preferences
CREATE TABLE parent_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkin_alerts BOOLEAN DEFAULT true,
  journal_alerts BOOLEAN DEFAULT true,
  daily_digest BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '21:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(parent_id)
);

-- Child sharing preferences
CREATE TABLE child_sharing_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_default BOOLEAN DEFAULT false,
  can_share_journals BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(child_id)
);

-- Notification events log
CREATE TABLE notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('checkin', 'journal_shared', 'crisis', 'digest')),
  payload JSONB NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add shared_with_parent column to reflections
ALTER TABLE reflections ADD COLUMN shared_with_parent BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE parent_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_sharing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parent_notification_preferences
CREATE POLICY "Parents can view their own preferences"
  ON parent_notification_preferences FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can update their own preferences"
  ON parent_notification_preferences FOR UPDATE
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert their own preferences"
  ON parent_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- RLS Policies for child_sharing_preferences
CREATE POLICY "Children can view their own preferences"
  ON child_sharing_preferences FOR SELECT
  USING (auth.uid() = child_id);

CREATE POLICY "Children can update their own preferences"
  ON child_sharing_preferences FOR UPDATE
  USING (auth.uid() = child_id);

CREATE POLICY "Children can insert their own preferences"
  ON child_sharing_preferences FOR INSERT
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Parents can view their children's preferences"
  ON child_sharing_preferences FOR SELECT
  USING (is_parent_of(auth.uid(), child_id));

-- RLS Policies for notification_events
CREATE POLICY "Parents can view notifications about their children"
  ON notification_events FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Children can view their own notification events"
  ON notification_events FOR SELECT
  USING (auth.uid() = child_id);

-- Create indexes for performance
CREATE INDEX idx_notification_events_parent ON notification_events(parent_id);
CREATE INDEX idx_notification_events_child ON notification_events(child_id);
CREATE INDEX idx_notification_events_sent ON notification_events(sent_at);

-- Trigger for updated_at
CREATE TRIGGER update_parent_notification_preferences_updated_at
  BEFORE UPDATE ON parent_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_child_sharing_preferences_updated_at
  BEFORE UPDATE ON child_sharing_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();