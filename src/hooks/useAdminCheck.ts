import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isAdmin, getUserRoles } from "@/lib/adminUtils";
import { useToast } from "@/hooks/use-toast";

interface AdminCheckResult {
  isAdmin: boolean;
  isLoading: boolean;
  userRole: string | null;
  adminRole: string | null;
}

/**
 * Hook to check if current user has admin privileges
 * Optionally redirects non-admin users and checks for MFA
 */
export const useAdminCheck = (
  requireAdmin: boolean = false,
  requireMFA: boolean = false
): AdminCheckResult => {
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (requireAdmin) {
            navigate("/auth");
          }
          setIsLoading(false);
          return;
        }

        const roles = await getUserRoles(session.user.id);
        const adminStatus = isAdmin(roles?.role, roles?.admin_role);
        
        setUserRole(roles?.role || null);
        setAdminRole(roles?.admin_role || null);
        setIsAdminUser(adminStatus);

        // Redirect if admin access required but user is not admin
        if (requireAdmin && !adminStatus) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        // Check MFA if required for admin
        if (requireMFA && adminStatus) {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const hasMFA = factors?.totp && factors.totp.length > 0;
          
          if (!hasMFA) {
            toast({
              title: "MFA Required",
              description: "Multi-factor authentication is required for admin access.",
              variant: "destructive",
            });
            navigate("/settings?tab=security&reason=enable-mfa");
            return;
          }
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        if (requireAdmin) {
          navigate("/auth");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [requireAdmin, requireMFA, navigate, toast]);

  return { isAdmin: isAdminUser, isLoading, userRole, adminRole };
};
