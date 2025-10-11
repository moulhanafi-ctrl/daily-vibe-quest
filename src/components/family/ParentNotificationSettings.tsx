import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export const ParentNotificationSettings = () => {
  const [preferences, setPreferences] = useState({
    checkin_alerts: true,
    journal_alerts: true,
    daily_digest: false,
    quiet_hours_start: '21:00',
    quiet_hours_end: '07:00'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('parent_notification_preferences')
      .select('*')
      .eq('parent_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading preferences:', error);
    }

    if (data) {
      setPreferences({
        checkin_alerts: data.checkin_alerts,
        journal_alerts: data.journal_alerts,
        daily_digest: data.daily_digest,
        quiet_hours_start: data.quiet_hours_start || '21:00',
        quiet_hours_end: data.quiet_hours_end || '07:00'
      });
    }

    setLoading(false);
  };

  const updatePreferences = async (updates: Partial<typeof preferences>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    const { error } = await supabase
      .from('parent_notification_preferences')
      .upsert({
        parent_id: user.id,
        ...newPreferences
      });

    if (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Settings updated",
      description: "Your notification preferences have been saved"
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Manage how you receive updates about your child's check-ins and journals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="checkin-alerts">Check-in Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when your child checks in with their mood
            </p>
          </div>
          <Switch
            id="checkin-alerts"
            checked={preferences.checkin_alerts}
            onCheckedChange={(checked) => updatePreferences({ checkin_alerts: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="journal-alerts">Shared Journal Alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when your child shares a journal entry with you
            </p>
          </div>
          <Switch
            id="journal-alerts"
            checked={preferences.journal_alerts}
            onCheckedChange={(checked) => updatePreferences({ journal_alerts: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-digest">Daily Digest</Label>
            <p className="text-sm text-muted-foreground">
              Receive one summary at the end of each day
            </p>
          </div>
          <Switch
            id="daily-digest"
            checked={preferences.daily_digest}
            onCheckedChange={(checked) => updatePreferences({ daily_digest: checked })}
          />
        </div>

        <div className="space-y-4">
          <Label>Quiet Hours</Label>
          <p className="text-sm text-muted-foreground">
            Notifications during these hours will be held until morning (crisis alerts always come through)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quiet-start" className="text-xs">Start</Label>
              <Input
                id="quiet-start"
                type="time"
                value={preferences.quiet_hours_start}
                onChange={(e) => updatePreferences({ quiet_hours_start: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="quiet-end" className="text-xs">End</Label>
              <Input
                id="quiet-end"
                type="time"
                value={preferences.quiet_hours_end}
                onChange={(e) => updatePreferences({ quiet_hours_end: e.target.value })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
