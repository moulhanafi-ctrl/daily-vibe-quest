-- Create RPC function for subscriber KPI
CREATE OR REPLACE FUNCTION public.get_subscriber_kpi()
RETURNS TABLE(total_push bigint, weekly_delta bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT count(DISTINCT user_id) as total_push
    FROM public.push_subscriptions
  ),
  weekly AS (
    SELECT
      count(DISTINCT user_id) as new_push_7d
    FROM public.push_subscriptions
    WHERE created_at >= now() - interval '7 days'
  )
  SELECT
    totals.total_push,
    weekly.new_push_7d as weekly_delta
  FROM totals, weekly;
$$;