import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if a user role is an admin role
 * @deprecated Use isAdmin from @/lib/adminUtils instead
 */
export const isAdminRole = (role?: string, adminRole?: string): boolean => {
  const adminRoles = ['admin', 'super_admin', 'owner'];
  const adminRoleTypes = ['owner', 'moderator'];
  
  return (role ? adminRoles.includes(role.toLowerCase()) : false) || 
         (adminRole ? adminRoleTypes.includes(adminRole.toLowerCase()) : false);
};
