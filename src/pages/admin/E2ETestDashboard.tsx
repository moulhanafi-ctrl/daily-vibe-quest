import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  name: string;
  status: "pending" | "running" | "pass" | "fail";
  message?: string;
  data?: any;
  duration?: number;
}

export default function E2ETestDashboard() {
  const { toast } = useToast();
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Health Endpoint", status: "pending" },
    { name: "ZIP 10001 (NYC)", status: "pending" },
    { name: "ZIP 90210 (Beverly Hills)", status: "pending" },
    { name: "Postal M5V 2T6 (Toronto)", status: "pending" },
    { name: "Postal H2Y 1C6 (Montreal)", status: "pending" },
    { name: "Invalid ABC12345", status: "pending" },
  ]);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const runHealthTest = async () => {
    const index = 0;
    updateTest(index, { status: "running" });
    const start = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke("geo-lookup/health", {
        method: "GET"
      });
      
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      if (data?.ok === true) {
        updateTest(index, {
          status: "pass",
          message: `Geocoder: ${data.geocoder}, Cache: ${data.cacheStatus}`,
          data,
          duration
        });
      } else {
        updateTest(index, {
          status: "fail",
          message: "Health check returned ok: false",
          data,
          duration
        });
      }
    } catch (error: any) {
      updateTest(index, {
        status: "fail",
        message: error.message,
        duration: Date.now() - start
      });
    }
  };

  const runZipTest = async (code: string, testIndex: number, expected: string) => {
    updateTest(testIndex, { status: "running" });
    const start = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke("geo-lookup", {
        body: { code }
      });
      
      const duration = Date.now() - start;
      
      if (error) {
        updateTest(testIndex, {
          status: "fail",
          message: error.message,
          duration
        });
        return;
      }
      
      const localCount = data?.locals?.length || 0;
      const nationalCount = data?.nationals?.length || 0;
      const geocoder = data?.geocoder || "none";
      const latency = data?.latencyMs || duration;
      
      if (code === "ABC12345") {
        // Expect error
        if (data.error) {
          updateTest(testIndex, {
            status: "pass",
            message: `Correctly rejected: ${data.error}`,
            data,
            duration
          });
        } else {
          updateTest(testIndex, {
            status: "fail",
            message: "Should have rejected invalid format",
            data,
            duration
          });
        }
      } else {
        // Expect results
        if (nationalCount >= 1) {
          updateTest(testIndex, {
            status: "pass",
            message: `${localCount} local + ${nationalCount} national | ${geocoder} | ${latency}ms`,
            data,
            duration
          });
        } else {
          updateTest(testIndex, {
            status: "fail",
            message: `Missing national resources`,
            data,
            duration
          });
        }
      }
    } catch (error: any) {
      updateTest(testIndex, {
        status: "fail",
        message: error.message,
        duration: Date.now() - start
      });
    }
  };

  const runAllTests = async () => {
    await runHealthTest();
    await runZipTest("10001", 1, "NYC area");
    await runZipTest("90210", 2, "Beverly Hills area");
    await runZipTest("M5V 2T6", 3, "Toronto area");
    await runZipTest("H2Y 1C6", 4, "Montreal area");
    await runZipTest("ABC12345", 5, "Invalid");
  };

  const webhookUrl = "https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/stripe-webhook";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">E2E Test Dashboard</h1>
          <p className="text-muted-foreground">
            Smoke tests for geo-lookup, Stripe, and Resend integrations
          </p>
        </div>

        {/* Stripe Webhook Setup */}
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-500" />
              Action Required: Fix Stripe Webhook
            </CardTitle>
            <CardDescription>
              Your webhook URL is incorrect and needs to be updated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription className="space-y-2">
                <p className="font-semibold">Current (Wrong):</p>
                <code className="block bg-muted p-2 rounded text-sm">
                  https://www.dailyvibecheck.com/api/stripe/webhook
                </code>
                
                <p className="font-semibold mt-4">Correct URL:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-sm">
                    {webhookUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-medium">Steps to fix:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open Stripe Dashboard → Developers → Webhooks</li>
                <li>Click on your existing webhook</li>
                <li>Update the endpoint URL to the correct URL above</li>
                <li>Ensure events include: checkout.session.completed, charge.refunded</li>
                <li>Copy the webhook signing secret</li>
                <li>Update STRIPE_LIVE_WEBHOOK_SECRET in your environment</li>
              </ol>
            </div>

            <Button 
              onClick={() => window.open("https://dashboard.stripe.com/webhooks", "_blank")}
              className="w-full"
            >
              Open Stripe Dashboard
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Geo-Lookup Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Geo-Lookup Tests</CardTitle>
            <CardDescription>
              Testing ZIP/postal code validation and provider lookup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runAllTests} className="w-full">
              Run All Tests
            </Button>

            <div className="space-y-2">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {test.status === "pending" && (
                      <div className="h-5 w-5 rounded-full border-2" />
                    )}
                    {test.status === "running" && (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    )}
                    {test.status === "pass" && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {test.status === "fail" && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    
                    <div className="flex-1">
                      <p className="font-medium">{test.name}</p>
                      {test.message && (
                        <p className="text-sm text-muted-foreground">{test.message}</p>
                      )}
                      {test.duration && (
                        <p className="text-xs text-muted-foreground">
                          Duration: {test.duration}ms
                        </p>
                      )}
                    </div>
                  </div>

                  {index === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={runHealthTest}
                      disabled={test.status === "running"}
                    >
                      Test
                    </Button>
                  )}
                  {index > 0 && index < 6 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const codes = ["10001", "90210", "M5V 2T6", "H2Y 1C6", "ABC12345"];
                        runZipTest(codes[index - 1], index, "");
                      }}
                      disabled={test.status === "running"}
                    >
                      Test
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email Test */}
        <Card>
          <CardHeader>
            <CardTitle>Email Delivery Test</CardTitle>
            <CardDescription>
              Test Resend email delivery from support@dailyvibecheck.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Email tests require authenticated user. Sign in first, then use the "Send Test Email" button in Settings.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => window.location.href = "/settings"}
              variant="outline"
              className="w-full"
            >
              Go to Settings
            </Button>
          </CardContent>
        </Card>

        {/* Stripe Test Purchase */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe $1 Test Purchase</CardTitle>
            <CardDescription>
              After fixing webhook URL, test live mode checkout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <p className="font-semibold mb-2">Pre-requisites:</p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Fix webhook URL (see card above)</li>
                  <li>Verify STRIPE_LIVE_MODE=true in environment</li>
                  <li>Ensure live secret key is configured</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-medium">Test card (Stripe test mode):</p>
              <code className="block bg-muted p-2 rounded text-sm">
                4242 4242 4242 4242 | Any future date | Any 3 digits
              </code>
            </div>

            <Button 
              onClick={() => window.location.href = "/store"}
              className="w-full"
            >
              Go to Store
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
