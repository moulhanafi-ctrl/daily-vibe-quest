import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";

interface PrivacyNoticeProps {
  isMinor: boolean;
}

export const PrivacyNotice = ({ isMinor }: PrivacyNoticeProps) => {
  if (!isMinor) return null;

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <Lock className="h-4 w-4" />
      <AlertDescription>
        <strong>Your journal is private.</strong> Only you and your verified parent/guardian can see it. Your entries are never public.
      </AlertDescription>
    </Alert>
  );
};
