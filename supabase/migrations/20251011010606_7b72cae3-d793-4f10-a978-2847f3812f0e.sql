-- Delete old chat rooms
DELETE FROM public.chat_rooms;

-- Insert chat rooms with correct focus area IDs matching onboarding
INSERT INTO public.chat_rooms (focus_area, name, description) VALUES
  ('depression', 'Depression Support', 'A safe space to discuss depression and find support'),
  ('anxiety', 'Anxiety Support', 'Share experiences and coping strategies for anxiety'),
  ('grief', 'Grief / Loss Support', 'Connect with others experiencing grief and loss'),
  ('stress', 'Stress Management', 'Discuss stress and overthinking with others'),
  ('self-esteem', 'Self-Esteem & Confidence', 'Build confidence together'),
  ('relationships', 'Relationship Support', 'Discuss relationship challenges and growth'),
  ('loneliness', 'Loneliness Support', 'Find connection and understanding'),
  ('pressure', 'Academic/Work Pressure', 'Connect with others facing school or work stress'),
  ('family', 'Family Conflict Support', 'Navigate family challenges together'),
  ('sleep', 'Sleep & Rest', 'Share tips for better sleep and rest'),
  ('motivation', 'Motivation & Purpose', 'Find your drive and purpose')
ON CONFLICT (focus_area) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Insert sample motivational content using correct enum values (happy, calm, anxious, sad, angry, excited, tired)
INSERT INTO public.motivational_content (title, content, content_type, target_mood, age_group, tags) VALUES
  ('You Are Stronger Than You Think', 'Every challenge you face is making you stronger. Take it one day at a time.', 'text', 'sad', 'teen', ARRAY['motivation', 'strength']),
  ('Breathe Through It', 'When anxiety hits, remember: breathe in for 4, hold for 4, out for 4. You''ve got this.', 'text', 'anxious', 'teen', ARRAY['anxiety', 'breathing']),
  ('Your Feelings Are Valid', 'Whatever you''re feeling right now is okay. You don''t have to be perfect.', 'text', 'sad', 'adult', ARRAY['validation', 'feelings']),
  ('Progress Over Perfection', 'Small steps forward are still progress. Celebrate every win, no matter how small.', 'text', 'calm', 'teen', ARRAY['motivation', 'progress']),
  ('You Matter', 'Your life has value. Your story matters. Keep going - better days are ahead.', 'text', 'sad', 'teen', ARRAY['hope', 'encouragement']),
  ('Take a Deep Breath', 'Pause for a moment. Breathe deeply. You are safe right now.', 'text', 'anxious', 'adult', ARRAY['anxiety', 'mindfulness']),
  ('One Step at a Time', 'You don''t need to have it all figured out. Just take the next small step.', 'text', 'anxious', 'teen', ARRAY['stress', 'encouragement']),
  ('You Are Not Alone', 'Millions of people feel what you''re feeling. Reach out - there''s always someone who cares.', 'text', 'sad', 'teen', ARRAY['connection', 'support']),
  ('Rest is Productive', 'Taking a break isn''t lazy - it''s necessary. Your body needs rest to heal and grow.', 'text', 'tired', 'adult', ARRAY['self-care', 'rest']),
  ('Celebrate Small Wins', 'Got out of bed today? That''s a victory. Every small step counts.', 'text', 'happy', 'teen', ARRAY['motivation', 'achievement'])
ON CONFLICT DO NOTHING;