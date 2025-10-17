import { supabase } from "@/integrations/supabase/client";

export interface UserRole {
  role: string;
  admin_role?: string;
}

/**
 * Check if a user has admin privileges
 * Admins include: admin role, super_admin, or owner admin_role
 */
export const isAdmin = (role?: string, adminRole?: string): boolean => {
  if (!role) return false;
  
  const adminRoles = ['admin', 'super_admin', 'owner'];
  const adminRoleTypes = ['owner', 'moderator'];
  
  return adminRoles.includes(role.toLowerCase()) || 
         (adminRole ? adminRoleTypes.includes(adminRole.toLowerCase()) : false);
};

/**
 * Fetch user's roles from database
 */
export const getUserRoles = async (userId: string): Promise<UserRole | null> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, admin_role")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user roles:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  // Prefer an admin row if multiple exist
  const adminRow = data.find((r: any) => {
    const role = String(r.role || '').toLowerCase();
    const adminRole = String(r.admin_role || '').toLowerCase();
    return role === 'admin' || ['owner', 'moderator', 'support', 'super_admin'].includes(adminRole);
  });

  return adminRow || (data[0] as UserRole);
};

/**
 * Check if current authenticated user is admin
 */
export const checkIsAdmin = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;
  const uid = session.user.id;
  try {
    const [hasAdmin, owner, moderator, support, superAdmin] = await Promise.all([
      supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
      supabase.rpc("has_admin_role", { _user_id: uid, _admin_role: "owner" }),
      supabase.rpc("has_admin_role", { _user_id: uid, _admin_role: "moderator" }),
      supabase.rpc("has_admin_role", { _user_id: uid, _admin_role: "support" }),
      supabase.rpc("is_super_admin", { _user_id: uid })
    ]);
    return Boolean(hasAdmin.data || owner.data || moderator.data || support.data || superAdmin.data);
  } catch (e) {
    console.error("checkIsAdmin rpc error", e);
    return false;
  }
};

/**
 * Log admin action for audit trail
 * Note: Audit logging will be available after types are regenerated
 */
export const logAdminAction = async (
  action: string,
  target?: string,
  details?: Record<string, any>
): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  
  // Log to console for now - will be persisted to DB after type regeneration
  console.log('[ADMIN ACTION]', {
    user_id: session.user.id,
    action,
    target,
    details,
    timestamp: new Date().toISOString()
  });
  
  // TODO: Enable after types regeneration
  // const { error } = await supabase
  //   .from("admin_audit_logs")
  //   .insert({
  //     user_id: session.user.id,
  //     action,
  //     target,
  //     details
  //   });
};

/**
 * Require MFA for admin operations
 */
export const requireMFAForAdmin = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;
  
  // Check if user is admin
  const roles = await getUserRoles(session.user.id);
  if (!isAdmin(roles?.role, roles?.admin_role)) return true; // Not admin, no MFA required
  
  // Check MFA status from auth
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasMFA = factors?.totp && factors.totp.length > 0;
  
  return hasMFA || false;
};
