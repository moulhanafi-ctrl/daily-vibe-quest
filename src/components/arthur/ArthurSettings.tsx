import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

export const ArthurSettings = () => {
  const [preferences, setPreferences] = useState({
    enabled: true,
    timezone: 'America/New_York',
    max_daily_messages: 2
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('arthur_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading preferences:', error);
    }

    if (data) {
      setPreferences({
        enabled: data.enabled,
        timezone: data.timezone || 'America/New_York',
        max_daily_messages: data.max_daily_messages || 2
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
      .from('arthur_preferences')
      .upsert(
        {
          user_id: user.id,
          ...newPreferences,
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update Arthur settings",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Settings updated",
      description: "Your Arthur preferences have been saved"
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

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
            onCheckedChange={(checked) => updatePreferences({ enabled: checked })}
          />
        </div>

        {preferences.enabled && (
          <>
            <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">Notification Schedule</p>
                <p className="text-sm text-muted-foreground">
                  Arthur sends up to {preferences.max_daily_messages} personalized messages daily:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                  <li>• Morning message at 9:00 AM (local time)</li>
                  <li>• Evening message at 5:00 PM (local time)</li>
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
