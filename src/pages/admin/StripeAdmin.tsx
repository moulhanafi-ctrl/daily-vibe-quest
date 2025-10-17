import { StripeModeToggle } from "@/components/admin/StripeModeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";

const StripeAdmin = () => {
  // Checklist for Phase 2 completion
  const checklist = [
    { item: "Live secret key added", done: true },
    { item: "Live webhook secret added", done: true },
    { item: "STRIPE_LIVE_MODE env var set", done: false },
    { item: "Webhook endpoint configured in Stripe", done: false },
    { item: "$1 test purchase completed", done: false },
    { item: "$1 test refund processed", done: false },
    { item: "Entitlements grant/revoke verified", done: false },
    { item: "Analytics events logged", done: false },
  ];

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Stripe Configuration</h1>
        <p className="text-muted-foreground">
          Manage payment processing and live mode settings
        </p>
      </div>

      <StripeModeToggle />

      <Card>
        <CardHeader>
          <CardTitle>Phase 2 Checklist: Live Mode Readiness</CardTitle>
          <CardDescription>
            Complete all items before enabling live mode in production
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklist.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                  {item.item}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Events</CardTitle>
          <CardDescription>
            Configured webhook events for payment processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">checkout.session.completed</p>
                <p className="text-sm text-muted-foreground">
                  Creates entitlements and updates order status
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">charge.refunded</p>
                <p className="text-sm text-muted-foreground">
                  Revokes entitlements and updates order to refunded
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">charge.dispute.created</p>
                <p className="text-sm text-muted-foreground">
                  Immediately revokes entitlements on chargeback
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
          <CardDescription>
            Complete these steps before going live
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 list-decimal list-inside">
            <li className="text-sm">
              <span className="font-medium">Set environment variable:</span>
              <code className="ml-2 p-1 bg-muted rounded">STRIPE_LIVE_MODE=true</code>
            </li>
            <li className="text-sm">
              <span className="font-medium">Create $1 test product</span> in Stripe dashboard
            </li>
            <li className="text-sm">
              <span className="font-medium">Make test purchase</span> with real card ($1)
            </li>
            <li className="text-sm">
              <span className="font-medium">Verify:</span> Order paid, entitlement granted, analytics logged
            </li>
            <li className="text-sm">
              <span className="font-medium">Issue refund</span> in Stripe dashboard
            </li>
            <li className="text-sm">
              <span className="font-medium">Verify:</span> Order refunded, entitlement revoked, analytics logged
            </li>
            <li className="text-sm">
              <span className="font-medium">Check edge function logs</span> for webhook processing
            </li>
            <li className="text-sm">
              <span className="font-medium">Record test results</span> in audit log
            </li>
          </ol>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
};

export default StripeAdmin;
