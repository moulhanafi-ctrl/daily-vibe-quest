import { useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, AlertCircle, Copy, ExternalLink, CreditCard, RefreshCw } from "lucide-react";

export default function StripeLiveSetup() {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [liveMode, setLiveMode] = useState<boolean | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const checkLiveMode = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-live-status');
      if (error) throw error;
      setLiveMode(data?.stripe?.livemode || false);
      toast({
        title: data?.stripe?.livemode ? "Live Mode Active" : "Test Mode Active",
        description: data?.message || "Stripe mode checked successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Check Failed",
        description: error.message,
      });
    } finally {
      setChecking(false);
    }
  };

  const createTestCheckout = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // First check if we're in live mode
      const { data: statusData } = await supabase.functions.invoke('stripe-live-status');
      
      // Create a test checkout session
      const { data, error } = await supabase.functions.invoke('create-product-checkout', {
        body: {
          priceId: 'price_1SGsgLF2eC6fAzEM0kcrecSd', // $5.99 individual plan
          successUrl: `${window.location.origin}/checkout-success`,
          cancelUrl: `${window.location.origin}/admin/stripe-live-setup`,
        }
      });

      if (error) throw error;

      setTestResult({
        success: true,
        mode: statusData?.stripe?.livemode ? 'live' : 'test',
        checkoutUrl: data.url,
        sessionId: data.sessionId,
      });

      // Open checkout in new tab
      window.open(data.url, '_blank');

      toast({
        title: "Test Checkout Created",
        description: `Checkout session created in ${statusData?.stripe?.livemode ? 'LIVE' : 'TEST'} mode`,
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message,
      });
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AdminGuard>
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Stripe Live Mode Setup & Testing</h1>
          <p className="text-muted-foreground">
            Configure Stripe for production and verify with a $1 test transaction
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> This page helps you switch to Stripe live mode and test real transactions.
            Make sure you have your live API keys configured before proceeding.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="status" className="space-y-4">
          <TabsList>
            <TabsTrigger value="status">Status Check</TabsTrigger>
            <TabsTrigger value="webhook">Webhook Setup</TabsTrigger>
            <TabsTrigger value="test">Test Transaction</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Stripe Mode</CardTitle>
                <CardDescription>
                  Check if Stripe is running in live or test mode
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Status</p>
                    {liveMode === null ? (
                      <Badge variant="outline">Unknown</Badge>
                    ) : liveMode ? (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Live Mode Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Test Mode Active
                      </Badge>
                    )}
                  </div>
                  <Button onClick={checkLiveMode} disabled={checking}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                    Check Status
                  </Button>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>To enable live mode:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Set STRIPE_LIVE_MODE environment variable to "true"</li>
                      <li>Configure STRIPE_LIVE_SECRET_KEY with your live secret key</li>
                      <li>Configure STRIPE_LIVE_WEBHOOK_SECRET with your live webhook secret</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Production Webhook Endpoint</CardTitle>
                <CardDescription>
                  Configure this endpoint in your Stripe Dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook URL</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted p-2 rounded text-sm break-all">
                      {webhookUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Setup Instructions:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Go to Stripe Dashboard → Developers → Webhooks</li>
                      <li>Click "Add endpoint" for production</li>
                      <li>Paste the webhook URL above</li>
                      <li>Select these events:
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li>checkout.session.completed</li>
                          <li>charge.refunded</li>
                          <li>customer.subscription.created</li>
                          <li>customer.subscription.updated</li>
                          <li>customer.subscription.deleted</li>
                        </ul>
                      </li>
                      <li>Copy the webhook signing secret and save it as STRIPE_LIVE_WEBHOOK_SECRET</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <Button
                  variant="outline"
                  onClick={() => window.open('https://dashboard.stripe.com/webhooks', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Stripe Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test $1 Transaction</CardTitle>
                <CardDescription>
                  Create a test checkout to verify live mode is working
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    This will create a real checkout session in {liveMode ? 'LIVE' : 'TEST'} mode.
                    You can complete the purchase with a test card and then refund it from the Stripe Dashboard.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={createTestCheckout}
                  disabled={testing}
                  className="w-full"
                >
                  <CreditCard className={`w-4 h-4 mr-2 ${testing ? 'animate-pulse' : ''}`} />
                  {testing ? 'Creating Test Checkout...' : 'Create Test Checkout'}
                </Button>

                {testResult && (
                  <div className="space-y-3">
                    {testResult.success ? (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Checkout Created Successfully!</strong>
                          <div className="mt-2 space-y-1">
                            <p>Mode: <Badge>{testResult.mode.toUpperCase()}</Badge></p>
                            <p className="text-xs">Session ID: {testResult.sessionId}</p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="bg-red-50 border-red-200">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>Test Failed</strong>
                          <p className="mt-1">{testResult.error}</p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">Test Card Numbers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid gap-2">
                      <div>
                        <strong>Successful payment:</strong>
                        <code className="ml-2 bg-background px-2 py-1 rounded">4242 4242 4242 4242</code>
                      </div>
                      <div>
                        <strong>Requires authentication:</strong>
                        <code className="ml-2 bg-background px-2 py-1 rounded">4000 0025 0000 3155</code>
                      </div>
                      <div>
                        <strong>Declined:</strong>
                        <code className="ml-2 bg-background px-2 py-1 rounded">4000 0000 0000 0002</code>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Use any future expiry date, any 3-digit CVC, and any postal code.
                    </p>
                  </CardContent>
                </Card>

                <Alert>
                  <AlertDescription>
                    <strong>After completing the test purchase:</strong>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Verify the payment appears in Stripe Dashboard</li>
                      <li>Check that the order is recorded in your database</li>
                      <li>Process a refund from Stripe Dashboard</li>
                      <li>Verify the refund webhook updates your database</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  );
}
