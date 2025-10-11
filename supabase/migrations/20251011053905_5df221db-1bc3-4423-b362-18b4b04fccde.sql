-- Add time_of_day field to arthur_templates
ALTER TABLE arthur_templates ADD COLUMN IF NOT EXISTS time_of_day text;

-- Insert Addiction Recovery templates for Adults
INSERT INTO arthur_templates (focus_area, age_group, message_type, content, time_of_day, cooldown_days, priority) VALUES
('addiction_recovery', 'adult', 'daily_motivation', 'One steady thing today: water, food, or a 10-min walk. Start small. — Arthur', 'morning', 7, 1),
('addiction_recovery', 'adult', 'daily_motivation', 'You showed up today. Mark the day and rest. — Arthur', 'evening', 7, 1),
('addiction_recovery', 'adult', 'daily_checkin_nudge', 'Urge lasts minutes. Breathe 4-6, move for 2, text support? — Arthur', NULL, 3, 2),
('addiction_recovery', 'adult', 'daily_motivation', 'Drop one line in your room: "Checking in." Connection helps. — Arthur', NULL, 5, 2);

-- Insert Addiction Recovery templates for Seniors
INSERT INTO arthur_templates (focus_area, age_group, message_type, content, time_of_day, cooldown_days, priority) VALUES
('addiction_recovery', 'elder', 'daily_motivation', 'Gentle routine anchors the day—tea, light, a short stroll. — Arthur', 'morning', 7, 1),
('addiction_recovery', 'elder', 'daily_motivation', 'Note one win, however small. It counts. — Arthur', 'evening', 7, 1);

-- Insert Family Substance Concerns templates for Teens
INSERT INTO arthur_templates (focus_area, age_group, message_type, content, time_of_day, cooldown_days, priority) VALUES
('family_substance_concerns', 'teen', 'daily_motivation', 'When home feels heavy, name one thing that steadies you today. — Arthur', 'morning', 7, 1),
('family_substance_concerns', 'teen', 'daily_motivation', 'Write 3 words for today''s feelings—enough for now. — Arthur', 'evening', 7, 1);

-- Insert Family Substance Concerns templates for Kids
INSERT INTO arthur_templates (focus_area, age_group, message_type, content, time_of_day, cooldown_days, priority) VALUES
('family_substance_concerns', 'child', 'daily_motivation', 'Big feelings are okay. Who''s a safe grown-up you can talk to today? 💛 — Arthur', 'morning', 7, 1),
('family_substance_concerns', 'child', 'daily_motivation', 'What helped you feel safe today? Let''s mark it. — Arthur', 'evening', 7, 1);