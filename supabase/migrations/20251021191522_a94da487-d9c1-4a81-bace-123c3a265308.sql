-- Harden SECURITY DEFINER functions by locking search_path to public
-- Reason: prevent schema hijacking and ensure stable resolution

ALTER FUNCTION public.audit_admin_role_changes() SET search_path = public;
ALTER FUNCTION public.can_view_profile(_viewer_id uuid, _profile_id uuid) SET search_path = public;
ALTER FUNCTION public.ensure_chat_room(p_focus_area text, p_age_group age_group, p_focus_area_key text, p_name text, p_description text) SET search_path = public;
ALTER FUNCTION public.get_active_subscriptions_v1(_user_id uuid) SET search_path = public;
ALTER FUNCTION public.get_family_members_view(_family_id uuid) SET search_path = public;
ALTER FUNCTION public.get_guardian_verification_status(_child_id uuid) SET search_path = public;
ALTER FUNCTION public.get_my_chat_access() SET search_path = public;
ALTER FUNCTION public.get_my_subscription_status() SET search_path = public;
ALTER FUNCTION public.get_subscriber_kpi() SET search_path = public;
ALTER FUNCTION public.get_trivia_notification_users(p_notification_type text, p_scheduled_time timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.get_unread_notification_count(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.has_active_subscription(uid uuid) SET search_path = public;
ALTER FUNCTION public.has_admin_role(_user_id uuid, _admin_role admin_role) SET search_path = public;
ALTER FUNCTION public.has_chat_access(uid uuid) SET search_path = public;
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path = public;
ALTER FUNCTION public.is_parent(_child_id uuid) SET search_path = public;
ALTER FUNCTION public.is_parent_of(_user_id uuid, _child_id uuid) SET search_path = public;
ALTER FUNCTION public.is_super_admin(_user_id uuid) SET search_path = public;
ALTER FUNCTION public.join_family_via_code(_invite_code text) SET search_path = public;
ALTER FUNCTION public.list_rooms_for_me() SET search_path = public;
ALTER FUNCTION public.prevent_minor_public_journals() SET search_path = public;
ALTER FUNCTION public.regenerate_family_invite_code(_family_id uuid) SET search_path = public;
ALTER FUNCTION public.update_last_login() SET search_path = public;
ALTER FUNCTION public.update_orders_updated_at() SET search_path = public;
ALTER FUNCTION public.update_push_subscriptions_updated_at() SET search_path = public;
ALTER FUNCTION public.update_user_streak(p_user_id uuid) SET search_path = public;