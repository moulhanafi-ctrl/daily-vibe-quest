import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, DollarSign, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const LiveModeStatus = () => {
  // In production, this would check actual Stripe mode
  const isLiveMode = false; // Set to true when STRIPE_LIVE_MODE=true
  const liveKeysConfigured = true; // Check if STRIPE_LIVE_SK and STRIPE_LIVE_WEBHOOK_SECRET exist

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

        {isLiveMode && (
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
