import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Bell, BellOff, Info, Smartphone } from "lucide-react";
import {
  checkPushNotificationSupport,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isSubscribedToPushNotifications,
  sendTestNotification
} from "@/lib/pushNotifications";

export const PushNotificationSettings = () => {
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [support, setSupport] = useState(checkPushNotificationSupport());
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    setLoading(true);
    try {
      const subscribed = await isSubscribedToPushNotifications();
      setIsSubscribed(subscribed);
      setSupport(checkPushNotificationSupport());
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      // Subscribe
      const result = await subscribeToPushNotifications();
      if (result.success) {
        setIsSubscribed(true);
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive push notifications on this device"
        });
      } else {
        // Map error codes to user-friendly messages
        let errorMessage = "There was an error enabling push notifications";
        if (result.error === 'permission_denied') {
          errorMessage = "Notifications are blocked in your browser settings. Click the lock icon in the address bar to enable them.";
        } else if (result.error?.includes('VAPID')) {
          errorMessage = "Push configuration error. Please contact support.";
        } else if (result.error?.includes('network') || result.error?.includes('fetch')) {
          errorMessage = "Network error — check your connection and try again.";
        } else if (result.error) {
          errorMessage = result.error;
        }
        
        toast({
          title: "Failed to Enable Notifications",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } else {
      // Unsubscribe
      const result = await unsubscribeFromPushNotifications();
      if (result.success) {
        setIsSubscribed(false);
        toast({
          title: "Notifications Disabled",
          description: "You won't receive push notifications on this device"
        });
      } else {
        toast({
          title: "Failed to Disable Notifications",
          description: result.error || "There was an error disabling push notifications",
          variant: "destructive"
        });
      }
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      await sendTestNotification();
      toast({
        title: "Test Notification Sent",
        description: "Check if you received the notification"
      });
    } catch (error: any) {
      toast({
        title: "Failed to Send Test",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>Loading notification settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive real-time notifications on this device
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!support.supported && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-start gap-2">
                <BellOff className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">
                    Push notifications are not supported on this device.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {support.message}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    To receive push notifications, please:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1 ml-4 list-disc">
                    <li>Use a modern browser (Chrome, Firefox, Edge, or Safari)</li>
                    <li>Ensure your device supports notifications</li>
                    <li>On iOS, add this app to your home screen</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {support.supported && support.permission === 'denied' && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div>
                <p className="font-medium mb-1">Notification Permission Denied</p>
                <p className="text-sm">
                  You've previously denied notification permissions. To enable notifications:
                </p>
                <ol className="text-sm mt-2 space-y-1 ml-4 list-decimal">
                  <li>Click the lock icon in your browser's address bar</li>
                  <li>Find "Notifications" in the permissions list</li>
                  <li>Change it to "Allow"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-enabled" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Enable Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified about check-ins, messages, and updates
            </p>
          </div>
          <Switch
            id="push-enabled"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={!support.supported || support.permission === 'denied'}
          />
        </div>

        {isSubscribed && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTestNotification}
              disabled={testing}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              {testing ? "Sending..." : "Send Test Notification"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Send a test notification to verify everything is working
            </p>
          </div>
        )}

        {support.supported && !isSubscribed && support.permission === 'granted' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Notifications are allowed but not enabled. Toggle the switch above to start receiving notifications.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
