import { supabase } from "@/integrations/supabase/client";

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
      .select("legal_consent")
      .eq("id", userId)
      .single();

    if (error) throw error;

    const consent = data?.legal_consent as LegalConsent | null;
    
    // Check if consent exists and is current version
    return !!(consent && consent.version === "1.0.0" && consent.accepted_at);
  } catch (error) {
    console.error("Error checking legal consent:", error);
    return false;
  }
};

export const requiresParentalConsent = (ageGroup?: string): boolean => {
  return ageGroup === "child";
};

export const isUserMuted = async (userId: string): Promise<{ muted: boolean; until?: Date }> => {
  try {
    const { data, error } = await supabase
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
        until: new Date(data.muted_until),
      };
    }

    return { muted: false };
  } catch (error) {
    console.error("Error checking mute status:", error);
    return { muted: false };
  }
};