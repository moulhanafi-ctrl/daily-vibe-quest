import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Check, DollarSign, TestTube } from "lucide-react";

export const StripeModeToggle = () => {
  // In a real implementation, this would check the STRIPE_LIVE_MODE env var
  // For now, we'll show the current configuration
  const [mode] = useState<"live" | "test">("test"); // Default to test

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Stripe Payment Mode
            </CardTitle>
            <CardDescription>
              Current payment processing configuration
            </CardDescription>
          </div>
          <Badge variant={mode === "live" ? "default" : "secondary"} className="text-lg">
            {mode === "live" ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                LIVE MODE
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-1" />
                TEST MODE
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "live" ? (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertTitle>Live Mode Active</AlertTitle>
            <AlertDescription>
              Real payments are being processed. Ensure all testing is complete.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Test Mode Active</AlertTitle>
            <AlertDescription>
              No real charges will be made. Set STRIPE_LIVE_MODE=true in production.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Configuration Status</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Secret Key:</span>
              <span className="font-mono">
                {mode === "live" ? "STRIPE_LIVE_SECRET_KEY" : "STRIPE_SECRET_KEY"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Webhook Secret:</span>
              <span className="font-mono">
                {mode === "live" ? "STRIPE_LIVE_WEBHOOK_SECRET" : "STRIPE_WEBHOOK_SECRET"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment:</span>
              <span className="font-mono">
                {mode === "live" ? "Production" : "Development"}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">How to Enable Live Mode</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Add STRIPE_LIVE_SECRET_KEY to Supabase secrets</li>
            <li>Add STRIPE_LIVE_WEBHOOK_SECRET to Supabase secrets</li>
            <li>Set STRIPE_LIVE_MODE=true in production environment</li>
            <li>Configure webhook endpoint in Stripe dashboard</li>
            <li>Run $1 test purchase + refund before going live</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
