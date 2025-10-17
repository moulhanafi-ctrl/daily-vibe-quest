-- Fix critical auth signup error: audit trigger fails when auth.uid() is NULL during signup
-- Root cause: audit_admin_role_changes() tries to insert NULL into performed_by column

DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;

CREATE OR REPLACE FUNCTION public.audit_admin_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_temp', 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_role_audit (
      action, target_user_id, new_role, new_admin_role, performed_by
    ) VALUES (
      'INSERT', NEW.user_id, NEW.role, NEW.admin_role, 
      -- During signup, auth.uid() is NULL, so use the new user's ID
      COALESCE(auth.uid(), NEW.user_id)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_role_audit (
      action, target_user_id, old_role, new_role, old_admin_role, new_admin_role, performed_by
    ) VALUES (
      'UPDATE', NEW.user_id, OLD.role, NEW.role, OLD.admin_role, NEW.admin_role, 
      COALESCE(auth.uid(), NEW.user_id)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_role_audit (
      action, target_user_id, old_role, old_admin_role, performed_by
    ) VALUES (
      'DELETE', OLD.user_id, OLD.role, OLD.admin_role, 
      COALESCE(auth.uid(), OLD.user_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_role_changes();