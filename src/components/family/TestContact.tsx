import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

export const TestContact = () => {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const sendTestMessage = async () => {
    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const timestamp = new Date().toISOString();
      const deviceInfo = {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        language: navigator.language,
        timestamp
      };

      // Insert test message
      const { error } = await supabase
        .from("test_messages")
        .insert({
          user_id: user.id,
          message: `🎯 Test message delivered at ${new Date(timestamp).toLocaleString()}. Push + in-app notifications working.`,
          device_info: deviceInfo
        });

      if (error) throw error;

      // Track event
      await trackEvent({
        eventType: "help_viewed",
        metadata: { test: "contact_sent", timestamp, platform: navigator.platform }
      });

      toast({
        title: "Test Message Sent",
        description: "✅ Received. Your messaging pipeline is healthy.",
      });

      // Show device info
      console.log("Device Info:", deviceInfo);
      
      toast({
        title: "Device Info",
        description: `Platform: ${navigator.platform} | Language: ${navigator.language}`,
      });

    } catch (error: any) {
      console.error("Test message error:", error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>Test Contact</CardTitle>
          <Badge variant="secondary">QA Tool</Badge>
        </div>
        <CardDescription>
          Verify messaging and notifications without inviting family
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send a test message to verify your messaging pipeline, push notifications, and device configuration.
          </p>
          <Button 
            onClick={sendTestMessage} 
            disabled={isSending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? "Sending..." : "Send Test Message"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
