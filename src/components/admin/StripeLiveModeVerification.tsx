import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, CreditCard, Zap, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StripeStatus {
  ok: boolean;
  message: string;
  errors: string[];
  env?: {
    publicKey?: { present: boolean; isLive?: boolean; masked?: string };
    secretKey?: { present: boolean; isLive?: boolean; masked?: string; source?: string };
    webhookSecret?: { present: boolean; isValid?: boolean; masked?: string; source?: string };
    liveMode?: { value?: string; isTrue?: boolean };
  };
  stripe?: {
    accountId?: string;
    livemode?: boolean;
    country?: string;
    email?: string;
  };
}

export const StripeLiveModeVerification = () => {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkStripeMode();
  }, []);

  const checkStripeMode = async (invalidate = false) => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-live-status', {
        body: { invalidate },
      });

      if (error) {
        console.error("Error checking Stripe mode:", error);
        toast({
          title: "Error checking Stripe status",
          description: error.message,
          variant: "destructive",
        });
        setStatus({ ok: false, message: error.message, errors: [error.message] });
      } else {
        setStatus(data as StripeStatus);
        if (data?.ok) {
          toast({
            title: "Stripe status refreshed",
            description: "Live mode is active and verified",
          });
        }
      }
    } catch (error: any) {
      console.error("Error checking Stripe mode:", error);
      setStatus({ ok: false, message: error.message, errors: [error.message] });
    } finally {
      setChecking(false);
    }
  };

  const isLiveMode = status?.ok && status?.stripe?.livemode;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Stripe Live Mode Status</h2>
              <p className="text-sm text-muted-foreground">
                Production payment processing configuration
              </p>
            </div>
          </div>
          {checking ? (
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 animate-pulse text-yellow-500" />
              <span className="text-sm">Checking...</span>
            </div>
          ) : isLiveMode ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">Live Mode Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-orange-600">Test Mode Active</span>
            </div>
          )}
        </div>

        {status && !checking && status.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Issues Found:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {status.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {!checking && !isLiveMode && (
          <Alert className="border-orange-500/50 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Stripe is currently in TEST mode</p>
                <p className="text-sm">
                  No real charges will be processed. To enable live mode:
                </p>
                <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
                  <li>Open your Lovable Cloud backend</li>
                  <li>Go to Project Settings → Environment Variables</li>
                  <li>Add: <code className="bg-black/20 px-1 py-0.5 rounded">STRIPE_LIVE_MODE=true</code></li>
                  <li>Verify <code className="bg-black/20 px-1 py-0.5 rounded">STRIPE_LIVE_SECRET_KEY</code> is set</li>
                  <li>Verify <code className="bg-black/20 px-1 py-0.5 rounded">STRIPE_LIVE_WEBHOOK_SECRET</code> is set</li>
                  <li>Redeploy your edge functions</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!checking && isLiveMode && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Stripe Live Mode is ACTIVE</p>
                <p className="text-sm">
                  All transactions are being processed with real credit cards.
                  Make sure your webhook endpoint is configured in Stripe Dashboard.
                </p>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="font-medium">Live Mode Checklist:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>✅ STRIPE_LIVE_MODE=true</li>
                    <li>✅ Live secret key configured</li>
                    <li>⚠️ Verify webhook endpoint in Stripe Dashboard</li>
                    <li>⚠️ Run test $1 transaction to confirm</li>
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={() => checkStripeMode(false)} variant="outline" disabled={checking}>
            <RefreshCw className={`h-4 w-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Button onClick={() => checkStripeMode(true)} variant="secondary" disabled={checking}>
            Force Recheck
          </Button>
          <Button asChild variant="ghost">
            <a
              href="/docs/STRIPE_LIVE_MODE.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Documentation
            </a>
          </Button>
        </div>

        {!checking && isLiveMode && (
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-2">Next Steps:</h3>
            <ol className="list-decimal list-inside text-sm space-y-2">
              <li>Create a $1 test product in Stripe Dashboard</li>
              <li>Complete a test purchase with a real card</li>
              <li>Verify the order appears in the database with status "paid"</li>
              <li>Check webhook logs for successful processing</li>
              <li>Test refund flow to verify webhook handling</li>
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
};
