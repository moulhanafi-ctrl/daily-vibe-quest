import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Moon, Sun, Monitor, Download, Trash2 } from "lucide-react";
import { DataRights } from "@/components/legal/DataRights";

interface UserSettings {
  theme: "light" | "dark" | "system";
  data_export_enabled: boolean;
  account_deletion_enabled: boolean;
}

export const PrivacySettings = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>({
    theme: "system",
    data_export_enabled: true,
    account_deletion_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings({
          theme: data.theme as "light" | "dark" | "system",
          data_export_enabled: data.data_export_enabled,
          account_deletion_enabled: data.account_deletion_enabled,
        });
        setTheme(data.theme);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (key === "theme") {
      setTheme(value);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          [key]: value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
    } catch (error) {
      console.error("Error updating setting:", error);
      toast({
        title: "Error",
        description: "Failed to save setting",
        variant: "destructive",
      });
      // Revert on error
      setSettings(settings);
      if (key === "theme") {
        setTheme(settings.theme);
      }
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Choose how the app looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-4">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => updateSetting("theme", "light")}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <Sun className="h-5 w-5" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => updateSetting("theme", "dark")}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <Moon className="h-5 w-5" />
                Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                onClick={() => updateSetting("theme", "system")}
                className="flex flex-col items-center gap-2 h-auto py-4"
              >
                <Monitor className="h-5 w-5" />
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy Controls</CardTitle>
          <CardDescription>
            Manage access to data export and account deletion features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data-export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Data Export
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable the ability to download your data
              </p>
            </div>
            <Switch
              id="data-export"
              checked={settings.data_export_enabled}
              onCheckedChange={(checked) => updateSetting("data_export_enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="account-deletion" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Account Deletion
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable the ability to delete your account
              </p>
            </div>
            <Switch
              id="account-deletion"
              checked={settings.account_deletion_enabled}
              onCheckedChange={(checked) => updateSetting("account_deletion_enabled", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {(settings.data_export_enabled || settings.account_deletion_enabled) && (
        <DataRights />
      )}
    </div>
  );
};
