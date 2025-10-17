import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export const FeatureFlagKillSwitches = () => {
  // In production, these would be managed via feature flags table
  const [notificationsPaused, setNotificationsPaused] = useState(false);
  const [storePaused, setStorePaused] = useState(false);
  const [roomsPaused, setRoomsPaused] = useState(false);

  const handleToggle = async (flag: string, enabled: boolean, setter: (v: boolean) => void) => {
    setter(enabled);
    
    // In production, this would update the feature_flags table
    // For now, we'll just show a toast
    toast({
      title: enabled ? "Feature Paused" : "Feature Enabled",
      description: `${flag} has been ${enabled ? "paused" : "enabled"}.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div>
            <CardTitle>Emergency Kill Switches</CardTitle>
            <CardDescription>
              Instantly disable features if issues arise
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            These switches provide immediate control over critical features. Use only in emergencies or for planned maintenance.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="notifications-pause" className="text-base font-medium">
                Pause Mostapha Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Stops all automated Mostapha check-ins and nudges
              </p>
              {notificationsPaused && (
                <p className="text-xs text-yellow-600 font-medium">
                  ⚠️ PAUSED - Users won't receive notifications
                </p>
              )}
            </div>
            <Switch
              id="notifications-pause"
              checked={notificationsPaused}
              onCheckedChange={(checked) => 
                handleToggle("Notifications", checked, setNotificationsPaused)
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="store-pause" className="text-base font-medium">
                Pause Store
              </Label>
              <p className="text-sm text-muted-foreground">
                Disables product checkout and prevents new purchases
              </p>
              {storePaused && (
                <p className="text-xs text-yellow-600 font-medium">
                  ⚠️ PAUSED - Store is unavailable to users
                </p>
              )}
            </div>
            <Switch
              id="store-pause"
              checked={storePaused}
              onCheckedChange={(checked) => 
                handleToggle("Store", checked, setStorePaused)
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="rooms-pause" className="text-base font-medium">
                Pause Chat Rooms
              </Label>
              <p className="text-sm text-muted-foreground">
                Disables room access and message sending
              </p>
              {roomsPaused && (
                <p className="text-xs text-yellow-600 font-medium">
                  ⚠️ PAUSED - Rooms are unavailable to users
                </p>
              )}
            </div>
            <Switch
              id="rooms-pause"
              checked={roomsPaused}
              onCheckedChange={(checked) => 
                handleToggle("Chat Rooms", checked, setRoomsPaused)
              }
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">When to Use Kill Switches</h4>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>
              <strong>Notifications Pause:</strong> High notification error rate, Mostapha misbehaving, email delivery issues
            </li>
            <li>
              <strong>Store Pause:</strong> Payment processing errors, webhook failures, inventory issues
            </li>
            <li>
              <strong>Rooms Pause:</strong> Widespread abuse, moderation overwhelm, safety concerns
            </li>
          </ul>
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> These switches affect all users immediately. Always announce planned maintenance in advance and monitor during transitions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
