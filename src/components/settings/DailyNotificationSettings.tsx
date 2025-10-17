import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, Info, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface NotificationPrefs {
  daily_enabled: boolean;
  daily_time: string;
  timezone: string;
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export const DailyNotificationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    daily_enabled: true,
    daily_time: '09:00',
    timezone: 'America/Detroit',
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_prefs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        const quietHours = (data.quiet_hours as any) || { enabled: false, start: '22:00', end: '07:00' };
        setPrefs({
          daily_enabled: data.daily_enabled ?? true,
          daily_time: data.daily_time || '09:00',
          timezone: data.timezone || 'America/Detroit',
          quiet_hours: {
            enabled: quietHours.enabled ?? false,
            start: quietHours.start || '22:00',
            end: quietHours.end || '07:00',
          },
        });
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (updates: Partial<NotificationPrefs>) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to update preferences",
          variant: "destructive"
        });
        return;
      }

      const newPrefs = { ...prefs, ...updates };
      setPrefs(newPrefs);

      const { error } = await supabase
        .from('notification_prefs')
        .upsert({
          user_id: user.id,
          daily_enabled: newPrefs.daily_enabled,
          daily_time: newPrefs.daily_time,
          timezone: newPrefs.timezone,
          quiet_hours: newPrefs.quiet_hours,
        });

      if (error) {
        console.error('Error saving preferences:', error);
        toast({
          title: "Failed to Save",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Preferences Saved",
        description: "Your notification preferences have been updated"
      });
    } catch (error) {
      console.error('Error in savePreferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Notifications
          </CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Daily Notifications
        </CardTitle>
        <CardDescription>
          Receive daily motivational messages and wellness reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Get a personalized motivational message every day at your preferred time. 
            Each day features a different wellness theme to support your mental health journey.
          </AlertDescription>
        </Alert>

        {/* Enable Daily Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-enabled" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Enable Daily Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive one motivational message per day
            </p>
          </div>
          <Switch
            id="daily-enabled"
            checked={prefs.daily_enabled}
            onCheckedChange={(checked) => savePreferences({ daily_enabled: checked })}
            disabled={saving}
          />
        </div>

        {prefs.daily_enabled && (
          <>
            <div className="border-t pt-6 space-y-4">
              {/* Preferred Time */}
              <div className="space-y-2">
                <Label htmlFor="daily-time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Preferred Time
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="daily-time"
                    type="time"
                    value={prefs.daily_time}
                    onChange={(e) => setPrefs({ ...prefs, daily_time: e.target.value })}
                    disabled={saving}
                    className="max-w-[200px]"
                  />
                  <Button
                    variant="outline"
                    onClick={() => savePreferences({ daily_time: prefs.daily_time })}
                    disabled={saving}
                  >
                    Save Time
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your local timezone: {prefs.timezone}
                </p>
              </div>

              {/* Quiet Hours */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="quiet-hours" className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Quiet Hours
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Don't send notifications during these hours
                    </p>
                  </div>
                  <Switch
                    id="quiet-hours"
                    checked={prefs.quiet_hours.enabled}
                    onCheckedChange={(checked) => 
                      savePreferences({ 
                        quiet_hours: { ...prefs.quiet_hours, enabled: checked } 
                      })
                    }
                    disabled={saving}
                  />
                </div>

                {prefs.quiet_hours.enabled && (
                  <div className="flex gap-4 items-center pl-4">
                    <div className="space-y-1">
                      <Label htmlFor="quiet-start" className="text-xs">Start</Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={prefs.quiet_hours.start}
                        onChange={(e) => 
                          setPrefs({
                            ...prefs,
                            quiet_hours: { ...prefs.quiet_hours, start: e.target.value }
                          })
                        }
                        disabled={saving}
                        className="w-[140px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="quiet-end" className="text-xs">End</Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={prefs.quiet_hours.end}
                        onChange={(e) => 
                          setPrefs({
                            ...prefs,
                            quiet_hours: { ...prefs.quiet_hours, end: e.target.value }
                          })
                        }
                        disabled={saving}
                        className="w-[140px]"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => savePreferences({ quiet_hours: prefs.quiet_hours })}
                      disabled={saving}
                      className="mt-6"
                    >
                      Save Hours
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>This Week's Messages:</strong> Each day features a unique theme:
                Sunday (Reflection), Monday (Motivation), Tuesday (Gratitude), Wednesday (Wisdom),
                Thursday (Thoughts), Friday (Feels), Saturday (Self-Care).
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};
