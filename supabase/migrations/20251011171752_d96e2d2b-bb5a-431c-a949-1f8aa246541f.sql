-- Create feature_flags table
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read flags (needed for app functionality)
CREATE POLICY "Anyone can view feature flags"
  ON public.feature_flags
  FOR SELECT
  USING (true);

-- Only admins can manage flags
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add update trigger
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Seed initial feature flags
INSERT INTO public.feature_flags (flag_key, enabled, description, category) VALUES
  ('ff.core', true, 'Core app functionality', 'core'),
  ('ff.i18n_core', true, 'Internationalization support', 'core'),
  ('ff.lang_en', true, 'English language', 'i18n'),
  ('ff.lang_es', true, 'Spanish language', 'i18n'),
  ('ff.lang_fr', true, 'French language', 'i18n'),
  ('ff.lang_ar', true, 'Arabic language', 'i18n'),
  ('ff.store_pdp_v2', true, 'New product detail page', 'store'),
  ('ff.room_safety', true, 'Room safety features (report/mute)', 'rooms'),
  ('ff.local_help', true, 'Local help directory', 'help'),
  ('ff.legal_gate', true, 'Legal consent gate', 'legal'),
  ('ff.notifications', true, 'Arthur notifications', 'notifications'),
  ('ff.admin_automations', false, 'Admin automation tools', 'admin'),
  ('ff.bulk_emails', false, 'Bulk email sending', 'admin'),
  ('ff.notifications_pause', false, 'Pause all notifications (kill switch)', 'killswitch'),
  ('ff.store_disable', false, 'Disable store (kill switch)', 'killswitch'),
  ('ff.rooms_disable', false, 'Disable chat rooms (kill switch)', 'killswitch');