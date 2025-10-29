import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Webhook, 
  DollarSign, 
  Shield,
  ExternalLink,
  Copy,
  RefreshCw
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export const StripeLiveSetupGuide = () => {
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState<string>("");
  
  const webhookUrl = "https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/stripe-webhook";
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedText(""), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Stripe Live Mode Setup Guide
        </CardTitle>
        <CardDescription>
          Complete these steps to enable live payment processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="step1" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="step1">Keys</TabsTrigger>
            <TabsTrigger value="step2">Webhooks</TabsTrigger>
            <TabsTrigger value="step3">Test</TabsTrigger>
            <TabsTrigger value="step4">Refund</TabsTrigger>
            <TabsTrigger value="step5">Go Live</TabsTrigger>
          </TabsList>

          {/* Step 1: Get Live Keys */}
          <TabsContent value="step1" className="space-y-4">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertTitle>Step 1: Get Your Stripe Live Keys</AlertTitle>
              <AlertDescription>
                You'll need your live secret key and webhook secret from Stripe
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Get Live Secret Key
                </h4>
                <ol className="text-sm space-y-2 ml-6 list-decimal">
                  <li>Open <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Stripe Dashboard <ExternalLink className="h-3 w-3" />
                  </a></li>
                  <li>Toggle to <Badge variant="default">Live mode</Badge> (switch in top right)</li>
                  <li>Navigate to <strong>Developers → API keys</strong></li>
                  <li>Copy your <strong>Secret key</strong> (starts with <code className="bg-muted px-1 rounded">sk_live_</code>)</li>
                </ol>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  Set Secret in Supabase
                </h4>
                <ol className="text-sm space-y-2 ml-6 list-decimal">
                  <li>Open <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Supabase Dashboard <ExternalLink className="h-3 w-3" />
                  </a></li>
                  <li>Go to <strong>Project Settings → Edge Functions → Secrets</strong></li>
                  <li>Find <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY</code></li>
                  <li>Update to your <code className="bg-muted px-1 rounded">sk_live_...</code> key</li>
                  <li>Click <strong>Save</strong></li>
                </ol>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Never</strong> commit live keys to your code or share them publicly. They must only be stored in Supabase secrets.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Step 2: Configure Webhooks */}
          <TabsContent value="step2" className="space-y-4">
            <Alert>
              <Webhook className="h-4 w-4" />
              <AlertTitle>Step 2: Configure Webhook Endpoint</AlertTitle>
              <AlertDescription>
                Webhooks notify your app when payments succeed, refunds occur, or disputes are created
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium">Your Webhook URL</h4>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
                    {webhookUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                  >
                    {copiedText === "Webhook URL" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Add Webhook in Stripe
                </h4>
                <ol className="text-sm space-y-2 ml-6 list-decimal">
                  <li>In Stripe Dashboard (live mode), go to <strong>Developers → Webhooks</strong></li>
                  <li>Click <Badge variant="default">Add endpoint</Badge></li>
                  <li>Paste your webhook URL (above)</li>
                  <li>Click <strong>Select events</strong></li>
                  <li>Select these 3 events:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li><code className="bg-muted px-1 rounded">checkout.session.completed</code></li>
                      <li><code className="bg-muted px-1 rounded">charge.refunded</code></li>
                      <li><code className="bg-muted px-1 rounded">charge.dispute.created</code></li>
                    </ul>
                  </li>
                  <li>Click <strong>Add endpoint</strong></li>
                  <li>Click to reveal <strong>Signing secret</strong> (starts with <code className="bg-muted px-1 rounded">whsec_</code>)</li>
                </ol>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  Set Webhook Secret in Supabase
                </h4>
                <ol className="text-sm space-y-2 ml-6 list-decimal">
                  <li>Copy the <code className="bg-muted px-1 rounded">whsec_...</code> signing secret from Stripe</li>
                  <li>In Supabase: <strong>Project Settings → Edge Functions → Secrets</strong></li>
                  <li>Find <code className="bg-muted px-1 rounded">STRIPE_LIVE_WEBHOOK_SECRET</code></li>
                  <li>Paste your webhook secret</li>
                  <li>Click <strong>Save</strong></li>
                </ol>
              </div>
            </div>
          </TabsContent>

          {/* Step 3: Test Purchase */}
          <TabsContent value="step3" className="space-y-4">
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertTitle>Step 3: Test $1 Live Purchase</AlertTitle>
              <AlertDescription>
                Make a real $1 purchase to verify everything works before going live
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>This will charge a real payment method!</strong> Use your own card and you'll refund it in the next step.
                </AlertDescription>
              </Alert>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Purchase Test Protocol
                </h4>
                <ol className="text-sm space-y-3 ml-6 list-decimal">
                  <li><strong>Open a new incognito/private browser window</strong></li>
                  <li>Log into your app with a test account</li>
                  <li>Navigate to <code className="bg-muted px-1 rounded">/store</code></li>
                  <li>Add any digital product to cart (or create a $1 test product first)</li>
                  <li>Go to <code className="bg-muted px-1 rounded">/cart</code> and click <Badge>Checkout</Badge></li>
                  <li><strong>Use your real payment card</strong> to complete purchase</li>
                  <li>After redirect, verify:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li>Order appears in <code className="bg-muted px-1 rounded">/orders</code> with status "paid"</li>
                      <li>Digital product appears in <code className="bg-muted px-1 rounded">/library</code> (if applicable)</li>
                    </ul>
                  </li>
                </ol>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Verify in Database
                </h4>
                <p className="text-sm text-muted-foreground">
                  Check these in Supabase → Table Editor:
                </p>
                <ul className="text-sm space-y-2 ml-6 list-disc">
                  <li><strong>orders</strong> table: status = "paid", stripe_payment_id filled</li>
                  <li><strong>entitlements</strong> table: status = "active" (if digital product)</li>
                  <li><strong>analytics_events</strong> table: events "purchase_succeeded" and "entitlement_granted"</li>
                </ul>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-primary" />
                  Check Webhook Logs
                </h4>
                <ol className="text-sm space-y-2 ml-6 list-decimal">
                  <li>Supabase → Edge Functions → <code className="bg-muted px-1 rounded">stripe-webhook</code> → Logs</li>
                  <li>Look for:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li><code className="text-xs">[WEBHOOK] Event received: checkout.session.completed</code></li>
                      <li><code className="text-xs">[WEBHOOK] Order completed successfully for user: ...</code></li>
                    </ul>
                  </li>
                </ol>
              </div>
            </div>
          </TabsContent>

          {/* Step 4: Test Refund */}
          <TabsContent value="step4" className="space-y-4">
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertTitle>Step 4: Test Refund Processing</AlertTitle>
              <AlertDescription>
                Issue a refund to verify entitlements are properly revoked
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Issue Refund in Stripe
                </h4>
                <ol className="text-sm space-y-2 ml-6 list-decimal">
                  <li>Go to Stripe Dashboard → <strong>Payments</strong></li>
                  <li>Find your $1 test payment</li>
                  <li>Click on the payment</li>
                  <li>Click <Badge variant="destructive">Refund payment</Badge></li>
                  <li>Refund <strong>full amount</strong> ($1.00)</li>
                  <li>Confirm refund</li>
                  <li><strong>Wait 30-60 seconds</strong> for webhook to process</li>
                </ol>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Verify Refund Processing
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Check these after waiting 30-60 seconds:
                </p>
                <ul className="text-sm space-y-2 ml-6 list-disc">
                  <li><code className="bg-muted px-1 rounded">/orders</code> → Order status shows "refunded"</li>
                  <li><code className="bg-muted px-1 rounded">/library</code> → Product is removed (if digital)</li>
                  <li><strong>Database</strong>:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li><strong>orders</strong> table: status = "refunded"</li>
                      <li><strong>entitlements</strong> table: status = "revoked"</li>
                      <li><strong>analytics_events</strong>: event "entitlement_revoked" with reason "refund"</li>
                    </ul>
                  </li>
                  <li><strong>Webhook logs</strong>:
                    <ul className="ml-6 mt-1 space-y-1 list-disc">
                      <li><code className="text-xs">[WEBHOOK] Event received: charge.refunded</code></li>
                      <li><code className="text-xs">[WEBHOOK] Revoked entitlements for order: ...</code></li>
                    </ul>
                  </li>
                </ul>
              </div>

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>Success!</strong> Your refund processed correctly and you got your $1 back. Live mode is working.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          {/* Step 5: Go Live */}
          <TabsContent value="step5" className="space-y-4">
            <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-600">Step 5: Go Live!</AlertTitle>
              <AlertDescription className="text-green-600">
                You've completed all tests. Your store is ready for real customers.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Pre-Launch Checklist
                </h4>
                <ul className="text-sm space-y-2 ml-6 list-none">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Live secret key set (<code className="bg-muted px-1 rounded">sk_live_...</code>)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Webhook endpoint configured in Stripe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Webhook secret set (<code className="bg-muted px-1 rounded">whsec_...</code>)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>$1 test purchase completed successfully</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>$1 test refund processed correctly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Entitlements grant/revoke verified</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Webhook logs show no errors</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium">Monitoring</h4>
                <p className="text-sm text-muted-foreground">
                  After launch, monitor your store at:
                </p>
                <ul className="text-sm space-y-1 ml-6 list-disc">
                  <li><code className="bg-muted px-1 rounded">/admin/publish</code> → Phase C: Monitoring</li>
                  <li><code className="bg-muted px-1 rounded">/admin/ops</code> → Operational Dashboard</li>
                  <li>Stripe Dashboard → Payments (for transactions)</li>
                  <li>Stripe Dashboard → Webhooks (for delivery status)</li>
                </ul>
              </div>

              <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 p-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Emergency Rollback
                </h4>
                <p className="text-sm text-muted-foreground">
                  If issues occur, go to <code className="bg-muted px-1 rounded">/admin/publish</code> → Phase C and toggle:
                </p>
                <ul className="text-sm space-y-1 ml-6 list-disc">
                  <li><code className="bg-muted px-1 rounded">ff.store_pause</code> = <Badge variant="destructive">true</Badge> (stops all purchases)</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button variant="default" size="lg" className="flex-1" asChild>
                  <Link to="/admin/ops" className="inline-flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    View Monitoring Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="/docs/STRIPE_LIVE_TEST_TEMPLATE.md" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                    Test Template <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
