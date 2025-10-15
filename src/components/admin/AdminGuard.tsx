import { ReactNode } from "react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: ReactNode;
  requireMFA?: boolean;
  fallback?: ReactNode;
}

/**
 * Wrapper component that only renders children if user is admin
 * Optionally enforces MFA requirement
 */
export const AdminGuard = ({ 
  children, 
  requireMFA = false,
  fallback = null 
}: AdminGuardProps) => {
  const { isAdmin, isLoading } = useAdminCheck(true, requireMFA);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};
