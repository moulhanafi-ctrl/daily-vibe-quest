import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StripeStatus {
  ok: boolean;
  message: string;
  errors?: string[];
  env?: {
    publicKey?: any;
    secretKey?: any;
    webhookSecret?: any;
    liveMode?: any;
  };
  stripe?: {
    accountId: string;
    livemode: boolean;
    country?: string;
    email?: string;
  };
}

export const StripeLiveStatus = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = async (invalidate: boolean = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-live-status", {
        body: { invalidate },
      });

      if (error) throw error;

      setStatus(data);
      setLastChecked(new Date());

      if (data.ok) {
        toast({
          title: "✅ Stripe Live Verified",
          description: data.message,
        });
      } else {
        toast({
          title: "⚠️ Issues Found",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("[STRIPE-LIVE-STATUS]", error);
      toast({
        title: "Error",
        description: error.message || "Failed to check Stripe status",
        variant: "destructive",
      });

      setStatus({
        ok: false,
        message: "Failed to connect to diagnostics endpoint",
        errors: [error.message || "Unknown error"],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Stripe Live Status</h3>
            <p className="text-sm text-muted-foreground">
              Real-time verification of Stripe configuration
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkStatus(false)}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {status && (
          <>
            <Alert className={status.ok ? "border-green-500" : "border-red-500"}>
              <div className="flex items-start gap-2">
                {status.ok ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription className="font-medium">
                    {status.message}
                  </AlertDescription>
                  {status.errors && status.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {status.errors.map((error, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  )}
                </AlertDescription>
              </div>
            </Alert>

            {/* Environment Details */}
            {status.env && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Environment Variables</h4>
                <div className="grid gap-2 text-sm">
                  {status.env.publicKey && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-xs font-mono">STRIPE_PUBLIC_KEY</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {status.env.publicKey.masked || "Not set"}
                        </span>
                        {status.env.publicKey.isLive ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  )}

                  {status.env.secretKey && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-xs font-mono">
                        {status.env.secretKey.source || "STRIPE_SECRET_KEY"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {status.env.secretKey.masked || "Not set"}
                        </span>
                        {status.env.secretKey.isLive ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  )}

                  {status.env.webhookSecret && (
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-xs font-mono">
                        {status.env.webhookSecret.source || "STRIPE_WEBHOOK_SECRET"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {status.env.webhookSecret.masked || "Not set"}
                        </span>
                        {status.env.webhookSecret.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stripe Connection */}
            {status.stripe && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Stripe Account</h4>
                <div className="p-3 bg-muted rounded text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-mono text-xs">{status.stripe.accountId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Live Mode:</span>
                    <span className={status.stripe.livemode ? "text-green-500" : "text-red-500"}>
                      {status.stripe.livemode ? "Yes" : "No"}
                    </span>
                  </div>
                  {status.stripe.country && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country:</span>
                      <span>{status.stripe.country.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => checkStatus(true)}
                disabled={loading}
                className="justify-start text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Force recheck (clear cache)
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="justify-start text-xs"
              >
                <a href="/admin/stripe-diagnostics" target="_blank">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Full diagnostics page
                </a>
              </Button>
            </div>

            {lastChecked && (
              <p className="text-xs text-muted-foreground text-right">
                Last: {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </>
        )}

        {!status && !loading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Click "Refresh" to check Stripe configuration
          </div>
        )}
      </div>
    </Card>
  );
};