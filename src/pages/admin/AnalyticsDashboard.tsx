import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Activity, Search, Users, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface KPIs {
  totalEvents: number;
  helpSearches: number;
  uniqueUsers: number;
  avgLatency: number;
}

interface DailyCount {
  date: string;
  count: number;
}

interface TopZip {
  code: string;
  count: number;
  avgLatency: number;
}

export default function AnalyticsDashboard() {
  const navigate = useNavigate();

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["analytics-kpis"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Total events
      const { count: totalEvents, error: e1 } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (e1) throw e1;

      // Help searches
      const { count: helpSearches, error: e2 } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "help_search")
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (e2) throw e2;

      // Unique users
      const { data: users, error: e3 } = await supabase
        .from("analytics_events")
        .select("user_id")
        .not("user_id", "is", null)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (e3) throw e3;

      const uniqueUsers = new Set(users?.map((u) => u.user_id)).size;

      // Avg latency for help_search
      const { data: latencyEvents, error: e4 } = await supabase
        .from("analytics_events")
        .select("event_metadata")
        .eq("event_type", "help_search")
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (e4) throw e4;

      const latencies = latencyEvents
        ?.map((e) => {
          const metadata = e.event_metadata as Record<string, any>;
          return metadata?.latency;
        })
        .filter((l) => typeof l === "number");

      const avgLatency =
        latencies && latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : 0;

      return {
        totalEvents: totalEvents || 0,
        helpSearches: helpSearches || 0,
        uniqueUsers,
        avgLatency,
      } as KPIs;
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch daily chart data
  const { data: dailyCounts, isLoading: chartLoading } = useQuery({
    queryKey: ["analytics-daily-counts"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("analytics_events")
        .select("created_at")
        .eq("event_type", "help_search")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by day
      const countsByDay: Record<string, number> = {};
      data?.forEach((event) => {
        const day = format(new Date(event.created_at), "yyyy-MM-dd");
        countsByDay[day] = (countsByDay[day] || 0) + 1;
      });

      return Object.entries(countsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch top ZIP codes
  const { data: topZips, isLoading: zipsLoading } = useQuery({
    queryKey: ["analytics-top-zips"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_metadata")
        .eq("event_type", "help_search")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .limit(1000);

      if (error) throw error;

      // Extract codes and latencies
      const zipStats: Record<string, { count: number; totalLatency: number }> = {};

      data?.forEach((event) => {
        const metadata = event.event_metadata as Record<string, any>;
        const code = metadata?.code;
        const latency = metadata?.latency;

        if (code) {
          if (!zipStats[code]) {
            zipStats[code] = { count: 0, totalLatency: 0 };
          }
          zipStats[code].count += 1;
          if (typeof latency === "number") {
            zipStats[code].totalLatency += latency;
          }
        }
      });

      return Object.entries(zipStats)
        .map(([code, stats]) => ({
          code,
          count: stats.count,
          avgLatency: stats.count > 0 ? Math.round(stats.totalLatency / stats.count) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <AdminGuard requireMFA={false}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Button variant="ghost" onClick={() => navigate("/admin/analytics")} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Events
              </Button>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Last 30 days performance metrics</p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{kpis?.totalEvents.toLocaleString() || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">All tracked events</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Help Searches</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{kpis?.helpSearches.toLocaleString() || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Help nearby searches</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{kpis?.uniqueUsers.toLocaleString() || 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Active users</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{kpis?.avgLatency || 0}ms</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Help search latency</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Help Searches per Day</CardTitle>
              <CardDescription>Last 30 days activity</CardDescription>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : dailyCounts && dailyCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyCounts}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      name="Searches"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No analytics yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Data will appear as users search</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top ZIP Codes Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top ZIP Codes</CardTitle>
              <CardDescription>Most searched locations (last 30 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {zipsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : topZips && topZips.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ZIP/Postal Code</TableHead>
                        <TableHead className="text-right">Searches</TableHead>
                        <TableHead className="text-right">Avg Latency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topZips.map((zip) => (
                        <TableRow key={zip.code}>
                          <TableCell className="font-mono">{zip.code}</TableCell>
                          <TableCell className="text-right font-medium">{zip.count}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {zip.avgLatency}ms
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No search data yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ZIP codes will appear as users perform searches
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminGuard>
  );
}
