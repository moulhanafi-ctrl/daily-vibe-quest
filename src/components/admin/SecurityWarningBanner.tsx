import { useState, useEffect } from "react";
import { AlertTriangle, ExternalLink, CheckCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

export function SecurityWarningBanner() {
  const [isEnabled, setIsEnabled] = useState(true); // default to hidden
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSecurityFlag();
    trackEvent({ eventType: "security_banner_viewed" });
  }, []);

  const checkSecurityFlag = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("security_flags")
      .single();

    if (!error && data) {
      const flags = data.security_flags as { leaked_password_protection_enabled?: boolean };
      setIsEnabled(flags.leaked_password_protection_enabled || false);
    }
  };

  const markAsDone = async () => {
    setLoading(true);
    try {
      const { data: currentSettings } = await supabase
        .from("app_settings")
        .select("security_flags")
        .single();

      const flags = (currentSettings?.security_flags as any) || {};
      flags.leaked_password_protection_enabled = true;

      const { error } = await supabase
        .from("app_settings")
        .update({ 
          security_flags: flags as any,
          updated_at: new Date().toISOString(),
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", (currentSettings as any)?.id || "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      setIsEnabled(true);
      trackEvent({ eventType: "security_banner_mark_done" });
      toast({
        title: "Marked as completed",
        description: "If you haven't flipped the toggle in Supabase Studio yet, please do so now.",
      });
    } catch (error) {
      console.error("Failed to update security flag:", error);
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: "Could not save the setting. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isEnabled) return null;

  return (
    <>
      <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <div className="flex items-start justify-between flex-1 ml-2">
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            <strong>Action required:</strong> Enable 'Leaked Password Protection' in Supabase Auth. This is a one-time Studio toggle.
          </AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={() => setIsEnabled(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3 ml-7">
          {/* Removed direct Supabase link - users should use the backend button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            How to enable
          </Button>
          <Button
            size="sm"
            onClick={markAsDone}
            disabled={loading}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            Mark as Done
          </Button>
        </div>
      </Alert>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enable Leaked Password Protection (Supabase Studio)</DialogTitle>
            <DialogDescription>
              Follow these steps to enable password protection in your Supabase project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <ol className="list-decimal list-inside space-y-3">
              <li>Click "Open Backend" button above, then navigate to <strong>Authentication</strong> → <strong>Policies</strong> → <strong>Password</strong>.</li>
              <li>Enable <strong>Leaked Password Protection</strong> → Set to <strong>Block</strong>.</li>
              <li>Set <strong>Minimum Characters</strong>: 12</li>
              <li>Enable <strong>Require Numbers</strong> ✓</li>
              <li>Enable <strong>Require Symbols</strong> ✓</li>
              <li>Click <strong>Save</strong>.</li>
              <li>Return here and click <strong>Mark as Done</strong> to clear this warning.</li>
            </ol>
            <p className="text-muted-foreground italic text-xs mt-4">
              (If you can't find it, try <strong>Authentication → Settings → Passwords</strong>. On Free/Hobby, the toggle may be hidden or disabled.)
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              <strong>Note:</strong> This is a one-time manual step in Studio. Your app can't change this setting via API.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button onClick={markAsDone} disabled={loading}>
              Mark as Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}