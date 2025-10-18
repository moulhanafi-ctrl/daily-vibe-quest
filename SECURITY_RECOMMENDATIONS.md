# 🔒 Security Recommendations - Daily Vibe Check

## Priority 1: Fix Security Definer Views (5 Issues)

**Affected Views:**
1. `active_subscriptions_v1`
2. `family_members_view`
3. `guardian_verification_status_view`
4. Two additional views (run linter for full list)

**SQL Fix Template:**
```sql
-- Instead of SECURITY DEFINER view, create function:
CREATE OR REPLACE FUNCTION get_active_subscriptions_v1(user_id uuid)
RETURNS TABLE(...) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  -- View query here
$$;
```

## Priority 2: Add search_path to Functions (7 Issues)

**Fix for each function:**
```sql
ALTER FUNCTION public.generate_trivia_room_code() SET search_path = public;
ALTER FUNCTION public.assign_age_group(integer) SET search_path = public;
ALTER FUNCTION public.generate_invite_code() SET search_path = public;
ALTER FUNCTION public.generate_family_invite_code() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.jwt_role() SET search_path = public;
```

## Priority 3: Enable Leaked Password Protection

In Supabase dashboard: Auth Settings → Password Protection → Enable

---

*See Supabase linter output for detailed guidance*
