import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, DollarSign, Zap, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
export const LiveModeStatus = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<any | null>(null);

  const isLiveMode = !!(status?.env?.liveMode?.isTrue);
  const verifiedLive = !!(status?.ok && status?.stripe?.livemode);
  const liveKeysConfigured = !!(status?.env?.publicKey?.present && status?.env?.secretKey?.present && status?.env?.webhookSecret?.present);

  const refresh = async (invalidate = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-live-status', { body: { invalidate } });
      if (error) throw error;
      setStatus(data);
      if (data?.ok) toast({ title: "Live mode verified" });
    } catch (e: any) {
      toast({ title: "Stripe status error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(false); }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Stripe Live Mode Status
            </CardTitle>
            <CardDescription>Payment processing configuration</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isLiveMode ? "default" : "secondary"} className="text-lg px-4 py-2">
              {isLiveMode ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  LIVE
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  TEST
                </>
              )}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => refresh(false)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" variant="ghost" onClick={() => refresh(true)} disabled={loading}>
              Force
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Mode</div>
            <p className="font-medium">{isLiveMode ? "Live (Production)" : "Test (Development)"}</p>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Live Keys</div>
            <p className="font-medium">
              {liveKeysConfigured ? (
                <span className="text-green-600">✓ Configured</span>
              ) : (
                <span className="text-yellow-600">⚠ Missing</span>
              )}
            </p>
          </div>
        </div>

        {!isLiveMode && liveKeysConfigured && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Ready for Live Mode</strong>
              <p className="text-sm mt-1">
                Live keys are configured. To enable live mode, set <code className="bg-muted px-1 py-0.5 rounded">STRIPE_LIVE_MODE=true</code> in environment variables.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {isLiveMode && verifiedLive && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Live Mode Active</strong>
              <p className="text-sm mt-1">
                All payments are being processed with live Stripe keys. Ensure webhooks are configured in Stripe dashboard.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {isLiveMode && !verifiedLive && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Live Mode Enabled (configuration incomplete)</strong>
              <p className="text-sm mt-1">
                Set live keys and webhook: STRIPE_PUBLIC_KEY (pk_live_), STRIPE_LIVE_SECRET_KEY (sk_live_), STRIPE_LIVE_WEBHOOK_SECRET (whsec_). Then press Force.
              </p>
            </AlertDescription>
          </Alert>
        )}


        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Pre-Launch Checklist
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>$1 test purchase completed</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>$1 test refund processed</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Entitlements grant/revoke verified</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Webhook events logged in audit</span>
            </li>
          </ul>
        </div>

        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <a href="/docs/STRIPE_LIVE_MODE.md" target="_blank" rel="noopener noreferrer">
              View Live Mode Documentation
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
