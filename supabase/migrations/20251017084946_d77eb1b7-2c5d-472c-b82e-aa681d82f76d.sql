-- Grant admin role to current user
-- Replace 'your-email@example.com' with your actual email address

-- First, let's see current user roles (for verification)
-- Run this query to find your user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then grant admin role (replace the email with YOUR email):
INSERT INTO public.user_roles (user_id, role, admin_role)
SELECT 
  id,
  'admin'::app_role,
  'owner'::admin_role
FROM auth.users
WHERE email = 'vibecheckapps@gmail.com' -- CHANGE THIS TO YOUR EMAIL
ON CONFLICT (user_id, role) 
DO UPDATE SET admin_role = 'owner'::admin_role;

-- Log the admin role assignment
INSERT INTO public.admin_audit_logs (admin_id, event, metadata)
SELECT 
  id,
  'admin_role_granted',
  jsonb_build_object('email', email, 'role', 'owner')
FROM auth.users
WHERE email = 'vibecheckapps@gmail.com'; -- CHANGE THIS TO YOUR EMAIL