import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, ShoppingCart, AlertCircle, Mail, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MonitoringDashboard = () => {
  // Mock data - in production these would be real queries
  const metrics = {
    errorRate: 0.5, // percentage
    webhookFailures: 0, // count
    purchaseSuccessRate: 98.5, // percentage
    incidentsPerThousand: 2.1, // rate
    notificationOpenRate: 45.3, // percentage
    newUsersToday: 12,
    purchasesToday: 8,
    incidentsToday: 3,
    topRoom: "Anxiety Support (teen)",
  };

  const getHealthStatus = (errorRate: number) => {
    if (errorRate < 1) return { label: "Healthy", variant: "default" as const, color: "text-green-600" };
    if (errorRate < 5) return { label: "Warning", variant: "secondary" as const, color: "text-yellow-600" };
    return { label: "Critical", variant: "destructive" as const, color: "text-red-600" };
  };

  const healthStatus = getHealthStatus(metrics.errorRate);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Real-time monitoring metrics</CardDescription>
            </div>
            <Badge variant={healthStatus.variant} className="text-lg px-4 py-2">
              {healthStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Error Rate
            </div>
            <p className={`text-2xl font-bold ${healthStatus.color}`}>{metrics.errorRate}%</p>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Webhook Failures
            </div>
            <p className="text-2xl font-bold">{metrics.webhookFailures}</p>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              Purchase Success
            </div>
            <p className="text-2xl font-bold text-green-600">{metrics.purchaseSuccessRate}%</p>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Day-1 Metrics</CardTitle>
          <CardDescription>Today's activity summary</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              New Users
            </div>
            <p className="text-2xl font-bold">{metrics.newUsersToday}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              Purchases
            </div>
            <p className="text-2xl font-bold">{metrics.purchasesToday}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Incidents
            </div>
            <p className="text-2xl font-bold">{metrics.incidentsToday}</p>
            <p className="text-xs text-muted-foreground">{metrics.incidentsPerThousand}/1k messages</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email Open Rate
            </div>
            <p className="text-2xl font-bold">{metrics.notificationOpenRate}%</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Activity</CardTitle>
          <CardDescription>Most active areas today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded border">
              <span className="text-sm">Most Active Room</span>
              <span className="font-medium">{metrics.topRoom}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Rollback Playbook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>If webhook failures &gt;2% for 10 min:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Check <code>/admin/flags</code> - toggle <code>ff.notifications_pause=true</code></li>
            <li>Review Stripe webhook logs in Supabase edge function logs</li>
            <li>If payment processing affected, pause store via <code>ff.store_pdp_v2=false</code></li>
          </ul>
          <p className="pt-2"><strong>Quick Kill Switches:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li><code>ff.notifications_pause</code> - Stop all Mostapha notifications</li>
            <li><code>ff.store_pdp_v2</code> - Revert store to basic mode</li>
            <li><code>ff.room_safety</code> - Disable room reporting features</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
