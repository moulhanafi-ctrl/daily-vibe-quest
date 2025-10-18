import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
  allowedAdminRoles?: string[];
  fallbackPath?: string;
}

export const RoleGuard = ({ 
  children, 
  allowedRoles = ["admin"],
  allowedAdminRoles = [],
  fallbackPath = "/dashboard"
}: RoleGuardProps) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthorized(false);
        navigate(fallbackPath);
        return;
      }

      // Check user roles
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("role, admin_role")
        .eq("user_id", user.id);

      if (error) throw error;

      if (!userRoles || userRoles.length === 0) {
        setIsAuthorized(false);
        navigate(fallbackPath);
        return;
      }

      // Check if user has any of the allowed roles
      const hasAllowedRole = userRoles.some(ur => 
        allowedRoles.includes(ur.role)
      );

      // Check if user has any of the allowed admin roles
      const hasAllowedAdminRole = allowedAdminRoles.length === 0 || 
        userRoles.some(ur => 
          ur.admin_role && allowedAdminRoles.includes(ur.admin_role)
        );

      const authorized = hasAllowedRole && hasAllowedAdminRole;
      setIsAuthorized(authorized);

      if (!authorized) {
        navigate(fallbackPath);
      }
    } catch (error) {
      console.error("Role check failed:", error);
      setIsAuthorized(false);
      navigate(fallbackPath);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this page. Required roles: {allowedRoles.join(", ")}
            {allowedAdminRoles.length > 0 && ` (${allowedAdminRoles.join(", ")})`}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
