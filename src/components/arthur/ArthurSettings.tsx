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
    preferred_time: '09:00',
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
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading preferences:', error);
    }

    if (data) {
      setPreferences({
        enabled: data.enabled,
        preferred_time: data.preferred_time || '09:00',
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
      .upsert({
        user_id: user.id,
        ...newPreferences
      });

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
            <div className="space-y-2">
              <Label htmlFor="preferred-time">Preferred Time</Label>
              <Input
                id="preferred-time"
                type="time"
                value={preferences.preferred_time}
                onChange={(e) => updatePreferences({ preferred_time: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                When would you like to receive your daily message?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-messages">Max Daily Messages</Label>
              <Select
                value={preferences.max_daily_messages.toString()}
                onValueChange={(value) => updatePreferences({ max_daily_messages: parseInt(value) })}
              >
                <SelectTrigger id="max-messages">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 per day</SelectItem>
                  <SelectItem value="2">2 per day</SelectItem>
                  <SelectItem value="3">3 per day</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Limit how many messages you receive
              </p>
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
