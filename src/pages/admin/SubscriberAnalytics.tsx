import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Mail, Bell, Calendar, Download, TrendingUp, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

export default function SubscriberAnalytics() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["subscriber-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-subscriber-analytics", {
        body: { type: "kpis" }
      });
      
      if (error) throw error;
      
      // Log admin view
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("admin_audit_logs").insert({
          admin_id: user.id,
          event: "view_subscribers_analytics",
          metadata: { timestamp: new Date().toISOString() }
        });
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch trend data
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["subscriber-trends"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-subscriber-analytics", {
        body: { type: "trends" }
      });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      const csvData = [
        ["Metric", "Count"],
        ["Total Users", kpis?.totalUsers || 0],
        ["Push Subscribers", kpis?.pushSubscribers || 0],
        ["Daily Opt-In", kpis?.dailyOptIn || 0],
        ["Birthday Opt-In", kpis?.birthdayOptIn || 0],
      ].map(row => row.join(",")).join("\n");

      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subscriber-analytics-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      
      // Log export
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("admin_audit_logs").insert({
          admin_id: user.id,
          event: "export_subscriber_analytics",
          metadata: { timestamp: new Date().toISOString() }
        });
      }
      
      toast.success("CSV exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export CSV");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/admin")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Subscriber Analytics</h1>
            <p className="text-muted-foreground">
              Monitor user engagement and subscription metrics
            </p>
          </div>
          <Button onClick={handleExportCSV} disabled={downloading || kpisLoading}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{kpis?.totalUsers?.toLocaleString() || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">All registered users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Push Subscribers</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{kpis?.pushSubscribers?.toLocaleString() || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Push notification opt-ins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Opt-In</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{kpis?.dailyOptIn?.toLocaleString() || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Marketing opt-ins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Birthday Opt-In</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{kpis?.birthdayOptIn?.toLocaleString() || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">With birthday notifications</p>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Subscriber Growth Trend
            </CardTitle>
            <CardDescription>Daily subscriber count over the last 60 days</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-80 w-full" />
              </div>
            ) : trends && trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="day" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="total_users" 
                    stroke="hsl(var(--primary))" 
                    name="Total Users"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="push_subscribers" 
                    stroke="hsl(var(--chart-2))" 
                    name="Push Subscribers"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No trend data available yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Trend data will appear as users join over time
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
