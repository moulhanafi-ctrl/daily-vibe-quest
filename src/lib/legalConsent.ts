import { supabase } from "@/integrations/supabase/client";

const CURRENT_VERSION = "1.0.0";

interface LegalConsent {
  version: string;
  accepted_at: string;
  accepted_ip?: string;
  user_agent?: string;
  guardian_id?: string;
}

export const hasValidConsent = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("legal_consent_version, legal_consent_accepted_at")
      .eq("id", userId)
      .single();

    if (error) throw error;

    // Check if consent exists and is current version
    return !!(
      data?.legal_consent_version === CURRENT_VERSION && 
      data?.legal_consent_accepted_at
    );
  } catch (error) {
    console.error("Error checking legal consent:", error);
    return false;
  }
};

export const requiresReconsent = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("legal_consent_version")
      .eq("id", userId)
      .single();

    if (error) throw error;

    // If they have a consent but it's not current version, they need to re-consent
    return !!(
      data?.legal_consent_version && 
      data?.legal_consent_version !== CURRENT_VERSION
    );
  } catch (error) {
    console.error("Error checking re-consent requirement:", error);
    return false;
  }
};

export const requiresParentalConsent = (ageGroup?: string): boolean => {
  return ageGroup === "child";
};

export const isUserMuted = async (userId: string): Promise<{ muted: boolean; until?: Date }> => {
  try {
    const { data, error } = await (supabase as any)
      .from("user_mutes")
      .select("muted_until")
      .eq("user_id", userId)
      .gt("muted_until", new Date().toISOString())
      .order("muted_until", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        muted: true,
        until: new Date((data as any).muted_until),
      };
    }

    return { muted: false };
  } catch (error) {
    console.error("Error checking mute status:", error);
    return { muted: false };
  }
};

export const isParentVerified = async (userId: string): Promise<boolean> => {
  try {
    // Check if there's a verified guardian link for this child
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("parent_id")
      .eq("id", userId)
      .single();

    if (error) throw error;

    // If they have a parent_id, they're verified
    return !!data?.parent_id;
  } catch (error) {
    console.error("Error checking parent verification:", error);
    return false;
  }
};

export const canAccessFeature = async (
  userId: string,
  feature: "rooms" | "purchases" | "dm"
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("age_group, parent_id, legal_consent_version")
      .eq("id", userId)
      .single();

    if (error) throw error;

    // Check legal consent first
    if (!data?.legal_consent_version || data.legal_consent_version !== CURRENT_VERSION) {
      return { allowed: false, reason: "consent_required" };
    }

    // Check age-based restrictions
    if (data.age_group === "child") {
      // Kids need parent verification for all restricted features
      if (!data.parent_id) {
        return { allowed: false, reason: "parent_verification_required" };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("Error checking feature access:", error);
    return { allowed: false, reason: "error" };
  }
};
