import { ReactNode } from "react";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface FeatureGateProps {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
  showDisabledMessage?: boolean;
}

export const FeatureGate = ({ 
  flag, 
  children, 
  fallback,
  showDisabledMessage = false 
}: FeatureGateProps) => {
  const isEnabled = useFeatureFlag(flag);

  if (!isEnabled) {
    if (showDisabledMessage) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Feature Temporarily Unavailable</AlertTitle>
          <AlertDescription>
            This feature is currently disabled. Please check back later.
          </AlertDescription>
        </Alert>
      );
    }
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};
