import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

interface QuietHours { start: string; end: string }

const DEFAULTS = {
  enabled: false,
  windows: ["09:00", "17:00"],
  channels: ["push"] as ("push" | "email")[],
  quiet_hours: { start: "21:00", end: "07:00" } as QuietHours,
};

export const ArthurSettings = () => {
  const [preferences, setPreferences] = useState({
    enabled: DEFAULTS.enabled,
    windows: DEFAULTS.windows,
    channels: DEFAULTS.channels,
    quiet_hours: DEFAULTS.quiet_hours,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke("notifications-prefs", {
        body: { op: "get" },
      });

      if (error && (error as any).status !== 404) {
        console.error("Error loading preferences:", error);
      }

      if (data && typeof data === "object") {
        setPreferences({
          enabled: !!data.arthur_enabled,
          windows: Array.isArray(data.windows) ? data.windows : DEFAULTS.windows,
          channels: Array.isArray(data.channels) ? data.channels : DEFAULTS.channels,
          quiet_hours: data.quiet_hours ?? DEFAULTS.quiet_hours,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<typeof preferences>) => {
    setSaving(true);
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences); // optimistic

    try {
      const { data, error } = await supabase.functions.invoke("notifications-prefs", {
        body: {
          arthur_enabled: newPreferences.enabled,
          windows: newPreferences.windows,
          channels: newPreferences.channels,
          quiet_hours: newPreferences.quiet_hours,
        },
      });

      if (error) {
        throw error;
      }

      if (data) {
        // sync back from server
        setPreferences({
          enabled: !!data.arthur_enabled,
          windows: data.windows ?? DEFAULTS.windows,
          channels: data.channels ?? DEFAULTS.channels,
          quiet_hours: data.quiet_hours ?? DEFAULTS.quiet_hours,
        });
      }

      toast({ title: "Settings updated", description: "Your Arthur preferences have been saved" });
    } catch (err: any) {
      console.error("Error updating preferences:", err);
      // revert optimistic change
      setPreferences((prev) => ({ ...prev, ...preferences }));

      const status = err?.status ?? 500;
      const description =
        status === 401 || status === 403
          ? "Please sign in again to change Arthur settings."
          : status === 409
          ? "We’re setting up your preferences—try again."
          : "Couldn’t save right now. Retrying…";

      toast({ title: "Error", description, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle>Arthur - Your Daily Coach</CardTitle>
        </div>
        <CardDescription>
          Get gentle, personalized check-ins and motivation from Arthur
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="arthur-enabled">Enable Arthur</Label>
            <p className="text-sm text-muted-foreground">
              Receive daily messages from your friendly vibe guide
            </p>
          </div>
          <Switch
            id="arthur-enabled"
            checked={preferences.enabled}
            disabled={saving}
            onCheckedChange={(checked) => updatePreferences({ enabled: checked })}
          />
        </div>

        {preferences.enabled && (
          <>
            <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Notification Schedule</p>
                <p className="text-sm text-muted-foreground">
                  Arthur sends up to 2 personalized messages daily:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>• Morning message at {preferences.windows[0]} (local time)</li>
                  <li>• Evening message at {preferences.windows[1]} (local time)</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium mb-2">About Arthur</p>
              <p className="text-sm text-muted-foreground">
                Arthur is your friendly AI coach who sends warm, encouraging messages 
                tailored to your focus areas and mood patterns. Messages are always 
                respectful of your privacy and never reference your private journal entries.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
