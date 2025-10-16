import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Volume2, Vibrate } from "lucide-react";

interface TriviaSettingsProps {
  userId: string;
  onSettingsChange?: (settings: TriviaSettings) => void;
}

export interface TriviaSettings {
  animations_enabled: boolean;
  sounds_enabled: boolean;
  haptics_enabled: boolean;
}

export const TriviaSettings = ({ userId, onSettingsChange }: TriviaSettingsProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TriviaSettings>({
    animations_enabled: true,
    sounds_enabled: false,
    haptics_enabled: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('trivia_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          animations_enabled: data.animations_enabled,
          sounds_enabled: data.sounds_enabled,
          haptics_enabled: data.haptics_enabled
        });
        onSettingsChange?.(data);
      }
    } catch (error) {
      console.error('Error loading trivia settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof TriviaSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);

    try {
      const { error } = await supabase
        .from('trivia_settings')
        .upsert({
          user_id: userId,
          [key]: value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to save setting",
        variant: "destructive"
      });
      // Revert on error
      setSettings(settings);
      onSettingsChange?.(settings);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Trivia Settings
        </CardTitle>
        <CardDescription>
          Customize your trivia experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="animations" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Animations & Effects
            </Label>
            <p className="text-sm text-muted-foreground">
              Visual feedback for correct/incorrect answers
            </p>
          </div>
          <Switch
            id="animations"
            checked={settings.animations_enabled}
            onCheckedChange={(checked) => updateSetting('animations_enabled', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sounds" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Sound Effects
            </Label>
            <p className="text-sm text-muted-foreground">
              Audio feedback (coming soon)
            </p>
          </div>
          <Switch
            id="sounds"
            checked={settings.sounds_enabled}
            onCheckedChange={(checked) => updateSetting('sounds_enabled', checked)}
            disabled
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="haptics" className="flex items-center gap-2">
              <Vibrate className="h-4 w-4" />
              Haptic Feedback
            </Label>
            <p className="text-sm text-muted-foreground">
              Vibration on mobile (coming soon)
            </p>
          </div>
          <Switch
            id="haptics"
            checked={settings.haptics_enabled}
            onCheckedChange={(checked) => updateSetting('haptics_enabled', checked)}
            disabled
          />
        </div>
      </CardContent>
    </Card>
  );
};
