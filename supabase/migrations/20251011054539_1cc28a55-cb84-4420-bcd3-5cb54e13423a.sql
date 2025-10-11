-- Add journal prompt templates to Arthur
INSERT INTO arthur_templates (focus_area, age_group, message_type, content, time_of_day, cooldown_days, priority) VALUES
-- Journal prompts for all age groups
('general', 'adult', 'daily_checkin_nudge', '60-second voice note about today? Just hit record. — Arthur', NULL, 3, 2),
('general', 'adult', 'daily_checkin_nudge', 'Two lines is plenty. What''s on your mind? — Arthur', NULL, 3, 2),
('general', 'teen', 'daily_checkin_nudge', 'Quick journal check: write or voice note? Either works. — Arthur', NULL, 3, 2),
('general', 'teen', 'daily_checkin_nudge', 'Three words for today—that''s all you need. — Arthur', NULL, 3, 2),
('general', 'child', 'daily_checkin_nudge', 'Want to draw or write about your day? 🎨 — Arthur', NULL, 3, 2),
('general', 'elder', 'daily_checkin_nudge', 'A few quiet words about today? Take your time. — Arthur', NULL, 3, 2);