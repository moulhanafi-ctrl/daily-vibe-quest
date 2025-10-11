import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { hasValidConsent, requiresReconsent, canAccessFeature } from "@/lib/legalConsent";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export const useConsentGate = (feature?: "rooms" | "purchases" | "dm") => {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userAgeGroup, setUserAgeGroup] = useState<"child" | "teen" | "adult" | "elder">();
  const navigate = useNavigate();
  const { t } = useTranslation("legal");

  useEffect(() => {
    checkConsent();
  }, []);

  const checkConsent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("age_group, legal_consent_version")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserAgeGroup(profile.age_group);
      }

      // Check if they need to re-consent due to version change
      const needsReconsent = await requiresReconsent(user.id);
      if (needsReconsent) {
        toast({
          title: t("consent.reconsentRequired.title"),
          description: t("consent.reconsentRequired.message"),
          variant: "default",
        });
        setShowConsentModal(true);
        setLoading(false);
        return;
      }

      // Check if they have valid consent
      const hasConsent = await hasValidConsent(user.id);
      if (!hasConsent) {
        setShowConsentModal(true);
        setLoading(false);
        return;
      }

      // If checking a specific feature, verify access
      if (feature) {
        const access = await canAccessFeature(user.id, feature);
        if (!access.allowed) {
          if (access.reason === "parent_verification_required") {
            toast({
              title: t("parentVerification.title"),
              description: t("parentVerification.subtitle"),
              variant: "default",
            });
            navigate("/onboarding"); // Redirect to parent verification flow
            return;
          }
          setShowConsentModal(true);
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking consent:", error);
      setLoading(false);
    }
  };

  const handleConsentComplete = () => {
    setShowConsentModal(false);
    checkConsent();
  };

  return {
    showConsentModal,
    setShowConsentModal,
    loading,
    userAgeGroup,
    handleConsentComplete,
  };
};
