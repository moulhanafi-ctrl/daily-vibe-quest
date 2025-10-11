import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  id: string;
  security_flags: {
    leaked_password_protection_enabled?: boolean;
  };
  updated_at: string;
  updated_by?: string;
}

export async function getAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .single();

  if (error) {
    console.error("Failed to fetch app settings:", error);
    return null;
  }

  return data as AppSettings;
}

export async function setSecurityFlag(key: string, value: boolean): Promise<boolean> {
  try {
    const currentSettings = await getAppSettings();
    if (!currentSettings) return false;

    const flags = { ...currentSettings.security_flags, [key]: value };
    
    const { error } = await supabase
      .from("app_settings")
      .update({
        security_flags: flags,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq("id", currentSettings.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Failed to set security flag:", error);
    return false;
  }
}