-- Create security definer function to check owner status
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'pg_temp', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
      AND admin_role = 'owner'::admin_role
  )
$$;

-- Drop existing permissive admin policies
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Create restrictive policies: Only super admins (owners) can modify admin roles
CREATE POLICY "Only super admins can insert admin roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
);

CREATE POLICY "Only super admins can update admin roles" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (
  is_super_admin(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid())
);

CREATE POLICY "Only super admins can delete admin roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (
  is_super_admin(auth.uid())
);

-- Add audit trigger for role changes
CREATE TABLE IF NOT EXISTS public.admin_role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_user_id uuid NOT NULL,
  old_role app_role,
  new_role app_role,
  old_admin_role admin_role,
  new_admin_role admin_role,
  performed_by uuid NOT NULL,
  performed_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admin_role_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit logs" 
ON public.admin_role_audit 
FOR SELECT 
TO authenticated
USING (
  is_super_admin(auth.uid())
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_admin_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_temp', 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_role_audit (
      action, target_user_id, new_role, new_admin_role, performed_by
    ) VALUES (
      'INSERT', NEW.user_id, NEW.role, NEW.admin_role, auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_role_audit (
      action, target_user_id, old_role, new_role, old_admin_role, new_admin_role, performed_by
    ) VALUES (
      'UPDATE', NEW.user_id, OLD.role, NEW.role, OLD.admin_role, NEW.admin_role, auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_role_audit (
      action, target_user_id, old_role, old_admin_role, performed_by
    ) VALUES (
      'DELETE', OLD.user_id, OLD.role, OLD.admin_role, auth.uid()
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add trigger to user_roles table
DROP TRIGGER IF EXISTS audit_admin_role_changes_trigger ON public.user_roles;
CREATE TRIGGER audit_admin_role_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_admin_role_changes();

COMMENT ON FUNCTION public.is_super_admin IS 'Checks if user has owner/super admin privileges';
COMMENT ON TABLE public.admin_role_audit IS 'Audit log for all admin role changes';
COMMENT ON TRIGGER audit_admin_role_changes_trigger ON public.user_roles IS 'Logs all changes to admin roles for security audit';