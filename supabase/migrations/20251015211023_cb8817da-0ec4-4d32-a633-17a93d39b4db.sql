-- Allow Owner/Admin to access chat without subscription

-- Function to check if user has active subscription OR is admin
CREATE OR REPLACE FUNCTION public.has_active_subscription(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Admin bypass: owners, super_admins, and admins always have access
    public.jwt_role() IN ('owner','super_admin','admin')
    OR EXISTS (
      -- Check if user has active subscription in profiles
      SELECT 1
      FROM public.profiles p
      WHERE p.id = uid
        AND p.subscription_status IN ('active','trialing')
        AND (
          p.subscription_expires_at IS NULL 
          OR p.subscription_expires_at > now()
        )
    )
    OR EXISTS (
      -- Also check active_subscriptions_v1 view as backup
      SELECT 1
      FROM public.active_subscriptions_v1 s
      WHERE s.user_id = uid
        AND s.status IN ('active','trialing')
        AND s.current_period_end > now()
    );
$$;

-- View for frontend to easily check subscription status
CREATE OR REPLACE VIEW public.my_subscription_status AS
SELECT
  auth.uid() AS user_id,
  public.jwt_role() AS role,
  public.has_active_subscription(auth.uid()) AS is_active;

-- Grant access to authenticated users
GRANT SELECT ON public.my_subscription_status TO authenticated;