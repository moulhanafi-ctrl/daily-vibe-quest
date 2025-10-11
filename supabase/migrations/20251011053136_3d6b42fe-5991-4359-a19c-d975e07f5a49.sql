-- Arthur persona configuration
CREATE TABLE arthur_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Arthur',
  avatar_url TEXT DEFAULT '/assets/arthur.png',
  tone TEXT NOT NULL DEFAULT 'warm, encouraging, plain-language, 8th-grade reading level',
  signature TEXT NOT NULL DEFAULT '— Arthur',
  intro TEXT NOT NULL DEFAULT 'Hi, I''m Arthur. I''ll nudge you with gentle, useful check-ins.',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Message templates for Arthur
CREATE TABLE arthur_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type TEXT NOT NULL CHECK (message_type IN ('daily_motivation', 'daily_checkin_nudge', 'weekly_recap')),
  focus_area TEXT NOT NULL,
  age_group age_group NOT NULL,
  content TEXT NOT NULL,
  cooldown_days INTEGER DEFAULT 7,
  active BOOLEAN DEFAULT true,
  ab_variant TEXT,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Arthur notification delivery log
CREATE TABLE arthur_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES arthur_templates(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  content_sent TEXT NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Arthur preferences
CREATE TABLE arthur_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  preferred_time TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'America/New_York',
  max_daily_messages INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE arthur_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE arthur_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE arthur_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE arthur_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for arthur_config
CREATE POLICY "Everyone can view Arthur config"
  ON arthur_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can update Arthur config"
  ON arthur_config FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for arthur_templates
CREATE POLICY "Everyone can view active templates"
  ON arthur_templates FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage templates"
  ON arthur_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for arthur_deliveries
CREATE POLICY "Users can view their own deliveries"
  ON arthur_deliveries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert deliveries"
  ON arthur_deliveries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their delivery status"
  ON arthur_deliveries FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for arthur_preferences
CREATE POLICY "Users can view their own preferences"
  ON arthur_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON arthur_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON arthur_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_arthur_deliveries_user ON arthur_deliveries(user_id);
CREATE INDEX idx_arthur_deliveries_delivered ON arthur_deliveries(delivered_at);
CREATE INDEX idx_arthur_templates_focus ON arthur_templates(focus_area, age_group);

-- Triggers for updated_at
CREATE TRIGGER update_arthur_config_updated_at
  BEFORE UPDATE ON arthur_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_arthur_templates_updated_at
  BEFORE UPDATE ON arthur_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_arthur_preferences_updated_at
  BEFORE UPDATE ON arthur_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default Arthur config
INSERT INTO arthur_config (name, avatar_url, tone, signature, intro, enabled)
VALUES (
  'Arthur',
  '/assets/arthur.png',
  'warm, encouraging, plain-language, 8th-grade reading level',
  '— Arthur',
  'Hi, I''m Arthur. I''ll nudge you with gentle, useful check-ins.',
  true
);

-- Insert seed templates
INSERT INTO arthur_templates (message_type, focus_area, age_group, content, cooldown_days, priority) VALUES
-- Divorce/Separation
('daily_motivation', 'divorce_separation', 'adult', 'One anchor today: a meal, a 10-min walk, or one call. Pick one—I''m with you. — Arthur', 7, 1),
('daily_motivation', 'divorce_separation', 'adult', 'Boundaries are kindness. What''s a simple "no" you can use today? — Arthur', 7, 2),

-- Family Changes
('daily_motivation', 'family_changes', 'child', 'Families change and still care. What helped you feel safe today? 💛 — Arthur', 7, 1),
('daily_motivation', 'family_changes', 'teen', 'Big changes feel loud. Try 60 quiet seconds—then check in? — Arthur', 7, 1),

-- Grief/Loss
('daily_motivation', 'grief_loss', 'adult', 'Waves come and go. Name today''s wave, then a gentle step. — Arthur', 7, 1),
('daily_motivation', 'grief_loss', 'teen', 'Three words for how it feels is enough for today. — Arthur', 7, 1),
('daily_motivation', 'grief_loss', 'elder', 'Hold a warm memory for a minute, with breath. — Arthur', 7, 1),

-- Anxiety
('daily_motivation', 'anxiety', 'child', 'Bubble breaths: in 4, out 6—pop 5 bubbles with me? — Arthur', 5, 1),
('daily_motivation', 'anxiety', 'teen', '5-4-3-2-1 senses check. Ready? — Arthur', 5, 1),
('daily_motivation', 'anxiety', 'adult', 'In 4, out 6. Six rounds, slow and steady. — Arthur', 5, 1),

-- Sleep
('daily_motivation', 'sleep', 'teen', 'Trade one scroll for one song, eyes closed. Try it? — Arthur', 7, 1),
('daily_motivation', 'sleep', 'adult', 'Screens off 30m early tonight. Want a wind-down? — Arthur', 7, 1),
('daily_motivation', 'sleep', 'elder', 'Dim lights and warm tea invite sleep. — Arthur', 7, 1),

-- Motivation/Purpose
('daily_motivation', 'purpose', 'adult', 'Pick one tiny win you''ll let count today. Declare it. — Arthur', 5, 1),

-- Loneliness/Connection
('daily_motivation', 'loneliness', 'adult', 'Text: ''Thinking of you—no need to reply.'' Start small. — Arthur', 7, 1),
('daily_motivation', 'loneliness', 'elder', 'A quick hello can lift the day. Who''s on your mind? — Arthur', 7, 1),

-- Work Stress
('daily_motivation', 'work_stress', 'adult', '15-minute focus sprint, then a break. I''ll keep time. — Arthur', 5, 1),

-- Check-in nudges
('daily_checkin_nudge', 'general', 'child', 'How''s your vibe today? Drop an emoji 💛 — Arthur', 3, 1),
('daily_checkin_nudge', 'general', 'teen', 'Quick vibe check? Your mood matters. — Arthur', 3, 1),
('daily_checkin_nudge', 'general', 'adult', 'Take 30 seconds to check in with yourself. — Arthur', 3, 1);