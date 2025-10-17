import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Mail, Smartphone, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DigestPreferences {
  notification_opt_in: boolean;
  notification_channel: 'in_app' | 'email' | 'both';
  notification_timezone: string;
  digest_time_1: string;
  digest_time_2: string;
}

export function AIDigestSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<DigestPreferences>({
    notification_opt_in: true,
    notification_channel: 'both',
    notification_timezone: 'America/Detroit',
    digest_time_1: '09:00',
    digest_time_2: '18:00',
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("notification_opt_in, notification_channel, notification_timezone, digest_time_1, digest_time_2")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPrefs({
          notification_opt_in: data.notification_opt_in ?? true,
          notification_channel: data.notification_channel || 'both',
          notification_timezone: data.notification_timezone || 'America/Detroit',
          digest_time_1: data.digest_time_1?.substring(0, 5) || '09:00',
          digest_time_2: data.digest_time_2?.substring(0, 5) || '18:00',
        });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          notification_opt_in: prefs.notification_opt_in,
          notification_channel: prefs.notification_channel,
          notification_timezone: prefs.notification_timezone,
          digest_time_1: prefs.digest_time_1 + ':00',
          digest_time_2: prefs.digest_time_2 + ':00',
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Notification preferences saved");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            AI Generation Digests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          AI Generation Digests
        </CardTitle>
        <CardDescription>
          Receive twice-daily summaries of your new AI generations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Get notified about new AI generations at your preferred times each day
          </AlertDescription>
        </Alert>

        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="opt-in">Enable Digest Notifications</Label>
            <div className="text-sm text-muted-foreground">
              Receive updates about your AI generations
            </div>
          </div>
          <Switch
            id="opt-in"
            checked={prefs.notification_opt_in}
            onCheckedChange={(checked) =>
              setPrefs({ ...prefs, notification_opt_in: checked })
            }
          />
        </div>

        {prefs.notification_opt_in && (
          <>
            {/* Channel selection */}
            <div className="space-y-2">
              <Label>Notification Channel</Label>
              <Select
                value={prefs.notification_channel}
                onValueChange={(value: any) =>
                  setPrefs({ ...prefs, notification_channel: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      In-App & Email
                    </div>
                  </SelectItem>
                  <SelectItem value="in_app">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      In-App Only
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose how you want to receive digest notifications
              </p>
            </div>

            {/* Digest times */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Digest Times (Local Time)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time1" className="text-sm">
                    Morning Digest
                  </Label>
                  <Input
                    id="time1"
                    type="time"
                    value={prefs.digest_time_1}
                    onChange={(e) =>
                      setPrefs({ ...prefs, digest_time_1: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time2" className="text-sm">
                    Evening Digest
                  </Label>
                  <Input
                    id="time2"
                    type="time"
                    value={prefs.digest_time_2}
                    onChange={(e) =>
                      setPrefs({ ...prefs, digest_time_2: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={prefs.notification_timezone}
                onValueChange={(value) =>
                  setPrefs({ ...prefs, notification_timezone: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Detroit">Eastern (Detroit)</SelectItem>
                  <SelectItem value="America/New_York">Eastern (New York)</SelectItem>
                  <SelectItem value="America/Chicago">Central</SelectItem>
                  <SelectItem value="America/Denver">Mountain</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Save button */}
        <Button onClick={savePreferences} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
