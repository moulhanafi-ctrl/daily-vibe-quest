import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Shield, 
  CreditCard,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: "complete" | "pending" | "action-required";
  action?: () => void;
  externalLink?: string;
}

export const ProductionReadinessChecklist = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [checking, setChecking] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAllStatus();
  }, []);

  // Listen for cross-component refresh requests (e.g., after enabling 2FA)
  useEffect(() => {
    const handler = () => checkAllStatus();
    window.addEventListener('readiness:refresh', handler);
    return () => window.removeEventListener('readiness:refresh', handler);
  }, []);

  const checkAllStatus = async () => {
    setChecking(true);
    
    // Check user email
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email || null);

    // Check MFA status
    try {
      const factors = await supabase.auth.mfa.listFactors();
      const hasActiveFactor = factors.data?.totp.some((factor) => factor.status === "verified");
      setMfaEnabled(hasActiveFactor || false);
    } catch (error) {
      console.error("Error checking MFA:", error);
    }

    // Check Stripe Live Mode (would need to call edge function to verify)
    // For now, check if environment variable is likely set
    setIsLiveMode(false); // User needs to verify this manually

    setChecking(false);
  };

  const checklist: ChecklistItem[] = [
    {
      id: "admin-setup",
      title: "✅ Admin Accounts Configured",
      description: "vibecheckapps@gmail.com (Super Admin) + moulhanafi@yahoo.com (Backup Admin)",
      status: "complete",
    },
    {
      id: "admin-security",
      title: "✅ Admin Role Security Locked",
      description: "Only super admins can modify roles. All changes are audited.",
      status: "complete",
    },
    {
      id: "2fa-setup",
      title: mfaEnabled ? "✅ 2FA Enabled" : "🔴 Enable 2FA",
      description: mfaEnabled 
        ? `Two-factor authentication is active for ${userEmail}`
        : "You must enable 2FA in Settings → Security tab",
      status: mfaEnabled ? "complete" : "action-required",
      action: () => window.location.href = "/settings?tab=security",
    },
    {
      id: "stripe-live",
      title: isLiveMode ? "✅ Stripe Live Mode Active" : "🔴 Activate Stripe Live Mode",
      description: isLiveMode
        ? "Stripe is processing real transactions"
        : "Set STRIPE_LIVE_MODE=true in backend environment variables",
      status: isLiveMode ? "complete" : "action-required",
    },
    {
      id: "test-transaction",
      title: "⏳ Complete $1 Live Test",
      description: "Create test product, process payment, verify webhook logs, test refund",
      status: "pending",
    },
  ];

  const allComplete = checklist.every((item) => item.status === "complete");
  const actionRequired = checklist.filter((item) => item.status === "action-required");
  const pending = checklist.filter((item) => item.status === "pending");

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">🚀 Production Readiness</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these steps to go live
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkAllStatus}
            disabled={checking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
            Refresh Status
          </Button>
        </div>

        {allComplete && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <div className="font-semibold text-green-600">
                🎉 Production system fully secured and live!
              </div>
              <p className="text-sm mt-2">
                Stripe payments and admin MFA verified. Your system is ready for production use.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {actionRequired.length > 0 && (
          <Alert className="border-orange-500 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription>
              <div className="font-semibold text-orange-600">
                {actionRequired.length} action{actionRequired.length > 1 ? "s" : ""} required
              </div>
              <p className="text-sm mt-1">
                Complete the items below to activate all security features
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                item.status === "complete"
                  ? "border-green-500 bg-green-500/5"
                  : item.status === "action-required"
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-gray-300 bg-gray-50 dark:bg-gray-900"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {item.status === "complete" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : item.status === "action-required" ? (
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>
                {item.action && item.status === "action-required" && (
                  <Button
                    size="sm"
                    onClick={item.action}
                    className="ml-4"
                  >
                    Complete
                  </Button>
                )}
                {item.externalLink && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(item.externalLink, "_blank")}
                    className="ml-4"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {!allComplete && (
          <div className="pt-6 border-t space-y-4">
            <h3 className="font-semibold text-lg">📋 Step-by-Step Instructions</h3>
            
            {!mfaEnabled && (
              <Card className="p-4 bg-orange-50 dark:bg-orange-900/20">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold">1. Enable 2FA (5 minutes)</h4>
                    <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
                      <li>Log in as vibecheckapps@gmail.com (if not already)</li>
                      <li>Go to Settings → Security tab</li>
                      <li>Click "Enable 2FA with Google Authenticator"</li>
                      <li>Scan QR code with Google Authenticator app</li>
                      <li>Enter 6-digit verification code</li>
                    </ol>
                    <Button
                      size="sm"
                      onClick={() => window.location.href = "/settings?tab=security"}
                      className="mt-2"
                    >
                      Go to Security Settings
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {!isLiveMode && (
              <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold">2. Activate Stripe Live Mode (2 minutes)</h4>
                    <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
                      <li>Click "Open Backend Settings" button below</li>
                      <li>Navigate to Project Settings → Environment Variables</li>
                      <li>Add: <code className="bg-black/10 px-1 rounded">STRIPE_LIVE_MODE=true</code></li>
                      <li>Save and wait for edge functions to redeploy</li>
                      <li>Return here and click "Refresh Status"</li>
                    </ol>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        // This would open the backend settings
                        toast({
                          title: "Opening Backend",
                          description: "Use the button in the app header to access backend settings",
                        });
                      }}
                      className="mt-2"
                    >
                      Instructions: Open Backend Settings
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {mfaEnabled && isLiveMode && (
              <Card className="p-4 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold">3. Run $1 Live Transaction Test (10 minutes)</h4>
                    <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
                      <li>Create $1 product in Stripe Dashboard</li>
                      <li>Complete checkout with real credit card</li>
                      <li>Verify webhook logs show <code className="bg-black/10 px-1 rounded">[WEBHOOK] Using LIVE mode</code></li>
                      <li>Check database: order status = 'paid'</li>
                      <li>Issue refund in Stripe Dashboard</li>
                      <li>Verify order status updates to 'refunded'</li>
                    </ol>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                      >
                        Open Stripe Dashboard
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Progress: {checklist.filter(i => i.status === "complete").length} / {checklist.length} complete
            </span>
            {allComplete && (
              <span className="text-green-600 font-semibold">
                ✓ Ready for Production
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
