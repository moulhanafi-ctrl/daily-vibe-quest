-- Create admin audit logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins
CREATE POLICY "Admins can read/write audit logs"
  ON public.admin_audit_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create subscriber daily rollups view
CREATE OR REPLACE VIEW public.subscriber_daily_rollups AS
SELECT
  date_trunc('day', u.created_at) as day,
  count(*) as users_total,
  count(distinct ps.user_id) FILTER (WHERE ps.created_at::date = u.created_at::date) as push_new,
  count(*) FILTER (WHERE p.marketing_opt_in = true AND p.created_at::date = u.created_at::date) as daily_optin_new
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.push_subscriptions ps ON ps.user_id = u.id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '60 days'
GROUP BY 1
ORDER BY 1 DESC;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_marketing_optin ON public.profiles(marketing_opt_in, created_at);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created ON public.push_subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent ON public.notification_logs(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_logs_sent ON public.email_logs(sent_at) WHERE sent_at IS NOT NULL;