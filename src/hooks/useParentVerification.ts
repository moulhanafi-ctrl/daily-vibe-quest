import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ParentVerificationStatus {
  isMinor: boolean;
  needsVerification: boolean;
  isVerified: boolean;
  ageGroup: string | null;
  loading: boolean;
}

export const useParentVerification = (): ParentVerificationStatus => {
  const [status, setStatus] = useState<ParentVerificationStatus>({
    isMinor: false,
    needsVerification: false,
    isVerified: false,
    ageGroup: null,
    loading: true,
  });

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get user's age group
      const { data: profile } = await supabase
        .from("profiles")
        .select("age_group")
        .eq("id", user.id)
        .single();

      const ageGroup = profile?.age_group;
      const isMinor = ageGroup === "child" || ageGroup === "teen";

      if (!isMinor) {
        setStatus({
          isMinor: false,
          needsVerification: false,
          isVerified: true,
          ageGroup,
          loading: false,
        });
        return;
      }

      // Check if minor has verified guardian
      const { data: guardianLink } = await supabase
        .from("guardian_links")
        .select("status, verified_at")
        .eq("child_id", user.id)
        .eq("status", "verified")
        .maybeSingle();

      const isVerified = !!guardianLink?.verified_at;

      setStatus({
        isMinor: true,
        needsVerification: !isVerified,
        isVerified,
        ageGroup,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking parent verification:", error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  };

  return status;
};
