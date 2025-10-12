-- Drop trigger first, then recreate with fixed function
DROP TRIGGER IF EXISTS update_push_subscriptions_timestamp ON public.push_subscriptions;
DROP FUNCTION IF EXISTS update_push_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_push_subscriptions_timestamp
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();