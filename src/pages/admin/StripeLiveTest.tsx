import { useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const StripeLiveTest = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testLiveCheckout = async () => {
    setTesting(true);
    setResult(null);

    try {
      // First verify the mode status
      const { data: statusData, error: statusError } = await supabase.functions.invoke(
        "stripe-live-status"
      );

      if (statusError) throw statusError;

      console.log("[STRIPE TEST] Status check:", statusData);

      // Create a test checkout session with the Individual plan
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            priceId: "price_1SGsgLF2eC6fAzEM0kcrecSd", // Individual plan from stripe.ts
          },
        }
      );

      if (checkoutError) throw checkoutError;

      setResult({
        success: true,
        mode: statusData?.stripe?.livemode ? "LIVE" : "TEST",
        checkoutUrl: checkoutData?.url,
        statusDetails: statusData,
      });

      toast({
        title: "✅ Live Mode Active",
        description: `Checkout session created in ${statusData?.stripe?.livemode ? "LIVE" : "TEST"} mode`,
      });

      // Open checkout in new tab
      if (checkoutData?.url) {
        window.open(checkoutData.url, "_blank");
      }
    } catch (error: any) {
      console.error("[STRIPE TEST] Error:", error);
      setResult({
        success: false,
        error: error.message || "Unknown error",
      });
      toast({
        title: "❌ Test Failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Stripe Live Mode Test</h1>
          <p className="text-muted-foreground">
            Test your Stripe live mode configuration by creating a checkout session
          </p>
        </div>

        <Alert>
          <AlertDescription>
            <strong>⚠️ Important:</strong> This will create a real checkout session in LIVE mode. 
            Use Stripe test card 4242 4242 4242 4242 for testing, or use your own card if you want to make a real purchase.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Live Checkout Test</CardTitle>
            <CardDescription>
              Creates a checkout session for the Individual plan ($5.99/month)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={testLiveCheckout}
              disabled={testing}
              size="lg"
              className="w-full"
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {testing ? "Creating Checkout Session..." : "Test Live Checkout"}
            </Button>

            {result && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-semibold">
                    {result.success ? "Success" : "Failed"}
                  </span>
                  {result.mode && (
                    <Badge variant={result.mode === "LIVE" ? "default" : "secondary"}>
                      {result.mode} MODE
                    </Badge>
                  )}
                </div>

                {result.success && result.statusDetails && (
                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold">Configuration Details:</h4>
                    <div className="space-y-1 text-sm">
                      <div>
                        <strong>Live Mode:</strong>{" "}
                        {result.statusDetails.stripe?.livemode ? "✅ Enabled" : "❌ Disabled"}
                      </div>
                      <div>
                        <strong>Account ID:</strong>{" "}
                        {result.statusDetails.stripe?.accountId || "N/A"}
                      </div>
                      <div>
                        <strong>Keys Configured:</strong>{" "}
                        {result.statusDetails.env?.liveKeysConfigured ? "✅ Yes" : "❌ No"}
                      </div>
                      {result.checkoutUrl && (
                        <div>
                          <strong>Checkout URL:</strong>{" "}
                          <a
                            href={result.checkoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Open checkout
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {result.error && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <strong>Error:</strong> {result.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Cards</CardTitle>
            <CardDescription>Use these test cards in the checkout</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <strong>Success:</strong> 4242 4242 4242 4242
            </div>
            <div>
              <strong>Decline:</strong> 4000 0000 0000 0002
            </div>
            <div>
              <strong>Requires Auth:</strong> 4000 0027 6000 3184
            </div>
            <div className="text-muted-foreground mt-2">
              Use any future expiration date, any 3-digit CVC, and any ZIP code
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
};

export default StripeLiveTest;
