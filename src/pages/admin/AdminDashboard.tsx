import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  Shield,
  Heart,
  Settings,
  FileText,
  MessageSquare,
  Package,
  Bell,
  Activity,
  ShoppingCart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ServerStatus } from "@/components/admin/ServerStatus";
import { SystemLogsExport } from "@/components/admin/SystemLogsExport";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Fetch subscriber KPIs
  const { data: subscriberKpi, isLoading: kpiLoading } = useQuery({
    queryKey: ["admin-subscriber-kpi"],
    queryFn: async () => {
      // Log dashboard view
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from("analytics_events").insert({
          user_id: user.id,
          event_type: "admin_dashboard_view",
          event_metadata: { timestamp: new Date().toISOString() }
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("admin-subscriber-kpi");

      if (response.error) throw response.error;
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch store products count
  const { data: storeStats, isLoading: storeLoading } = useQuery({
    queryKey: ["admin-store-stats"],
    queryFn: async () => {
      const { count: totalCount } = await supabase
        .from("store_products")
        .select("*", { count: "exact", head: true });
      
      const { count: activeCount } = await supabase
        .from("store_products")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      return { total: totalCount || 0, active: activeCount || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch real analytics data
  const { data: analyticsStats } = useQuery({
    queryKey: ["admin-analytics-stats"],
    queryFn: async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const { count: totalEvents } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true });

      const { count: todayEvents } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneDayAgo.toISOString());

      const { data: uniqueUsers } = await supabase
        .from("analytics_events")
        .select("user_id")
        .gte("created_at", oneDayAgo.toISOString())
        .not("user_id", "is", null);

      const uniqueCount = new Set(uniqueUsers?.map(e => e.user_id)).size;

      return {
        totalEvents: totalEvents || 0,
        todayEvents: todayEvents || 0,
        uniqueUsers: uniqueCount,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleSubscribersClick = async () => {
    // Log card click
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      supabase.from("analytics_events").insert({
        user_id: user.id,
        event_type: "admin_subscribers_card_click",
        event_metadata: { timestamp: new Date().toISOString() }
      });
    }
    navigate("/admin/analytics/subscribers");
  };

  const renderWeeklyChange = () => {
    if (kpiLoading) return <Skeleton className="h-5 w-32" />;
    
    const delta = subscriberKpi?.weekly_delta || 0;

    if (delta > 0) {
      return (
        <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
          <TrendingUp className="h-4 w-4" />
          <span>+{delta} this week</span>
        </div>
      );
    }

    if (delta < 0) {
      return (
        <div className="flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
          <TrendingDown className="h-4 w-4" />
          <span>{delta} down this week</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span>No change this week</span>
      </div>
    );
  };

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system health and manage operations
          </p>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Subscribers KPI Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpiLoading ? (
                <Skeleton className="h-8 w-20 mb-2" />
              ) : (
                <div className="text-2xl font-bold mb-2">
                  {subscriberKpi?.total_push?.toLocaleString() || 0}
                </div>
              )}
              {renderWeeklyChange()}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={handleSubscribersClick}
              >
                View details
              </Button>
            </CardContent>
          </Card>

          {/* Store Merchandise KPI Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Store Merchandise</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {storeLoading ? (
                <Skeleton className="h-8 w-20 mb-2" />
              ) : (
                <div className="text-2xl font-bold mb-2">
                  {storeStats?.active || 0}
                </div>
              )}
              <div className="text-sm text-muted-foreground mb-2">
                {storeStats?.total || 0} total products
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => navigate("/admin/store")}
              >
                Manage Store
              </Button>
            </CardContent>
          </Card>

          {/* Analytics Card with Live Metrics */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/analytics")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analytics</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {analyticsStats?.todayEvents?.toLocaleString() || 0}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {analyticsStats?.uniqueUsers || 0} active users
                </Badge>
              </div>
              <CardDescription className="text-xs mb-2">
                {analyticsStats?.totalEvents?.toLocaleString() || 0} total events tracked
              </CardDescription>
              <Button variant="outline" size="sm" className="w-full mt-2">
                Open Analytics
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/ai")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VibeOps AI</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>AI-powered moderation and operations</CardDescription>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Open Assistant
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/health")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  99.8% uptime
                </Badge>
              </div>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Monitor services and check system status</CardDescription>
              <Button variant="outline" size="sm" className="w-full mt-4">
                View Health
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/flags")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Feature Flags</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Toggle features and manage rollouts</CardDescription>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Manage Flags
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/legal")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Legal & Compliance</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Manage policies and compliance docs</CardDescription>
              <Button variant="outline" size="sm" className="w-full mt-4">
                View Legal
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/ai-digests")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Digest Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Manage twice-daily AI generation digests</CardDescription>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Manage Digests
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/daily-ai-messages")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily AI Messages</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Manage daily support messages from Mostapha</CardDescription>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Manage Messages
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/orders")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>Monitor purchases and email receipts</CardDescription>
              <Button variant="outline" size="sm" className="w-full mt-4">
                View Orders
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Monitoring Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <ServerStatus showUptime />
          <SystemLogsExport />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" onClick={() => navigate("/admin/products")}>
                Manage Products
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin/trivia")}>
                Manage Trivia
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin/help-locations")}>
                Help Locations
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin/stripe")}>
                Stripe Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
