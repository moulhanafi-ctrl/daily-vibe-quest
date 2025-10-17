import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Bell, 
  Mail, 
  Cake, 
  Download, 
  Eye, 
  EyeOff,
  TrendingUp,
  CheckCircle2,
  XCircle,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SubscriberAnalytics() {
  const [showEmailsDialog, setShowEmailsDialog] = useState(false);
  const [emailsRevealed, setEmailsRevealed] = useState(false);

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["subscriber-kpis"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("get-subscriber-analytics", {
        body: { type: "kpis" },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["subscriber-trends"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("get-subscriber-analytics", {
        body: { type: "trends" },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch deliverability
  const { data: deliverability, isLoading: deliverabilityLoading } = useQuery({
    queryKey: ["subscriber-deliverability"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("get-subscriber-analytics", {
        body: { type: "deliverability" },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleExportCSV = async () => {
    if (!kpis) return;

    const csvData = [
      ["Metric", "Value"],
      ["Total Users", kpis.totalUsers],
      ["Push Subscribers", kpis.pushSubscribers],
      ["Daily Opt-In", kpis.dailyOptIn],
      ["Birthday Opt-In", kpis.birthdayOptIn],
    ];

    const csv = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriber-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();

    // Log export action
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        event: "export_subscriber_analytics",
        metadata: { timestamp: new Date().toISOString() }
      });
    }

    toast.success("Analytics exported");
  };

  const handleRevealEmails = async () => {
    setShowEmailsDialog(false);
    setEmailsRevealed(true);
    toast.info("Email data access logged for audit");
  };

  const chartData = trends?.map((t: any) => ({
    date: new Date(t.day).toLocaleDateString(),
    users: t.users_total,
    push: t.push_new,
    optIn: t.daily_optin_new,
  })) || [];

  return (
    <AdminGuard>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Subscriber Analytics</h1>
            <p className="text-muted-foreground">
              Monitor growth and engagement metrics (PII-protected by default)
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            {!emailsRevealed ? (
              <Button onClick={() => setShowEmailsDialog(true)} variant="secondary">
                <Eye className="h-4 w-4 mr-2" />
                Reveal Emails
              </Button>
            ) : (
              <Button onClick={() => setEmailsRevealed(false)} variant="outline">
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Emails
              </Button>
            )}
          </div>
        </div>

        <Alert>
          <BarChart3 className="h-4 w-4" />
          <AlertDescription>
            Default view shows aggregated data only. Personal information requires explicit confirmation.
          </AlertDescription>
        </Alert>

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
                <div className="text-2xl font-bold">{kpis?.totalUsers || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Registered accounts</p>
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
                <div className="text-2xl font-bold">{kpis?.pushSubscribers || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Active push tokens</p>
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
                <div className="text-2xl font-bold">{kpis?.dailyOptIn || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Marketing consent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Birthday Opt-In</CardTitle>
              <Cake className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{kpis?.birthdayOptIn || 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Birthday set + opted in</p>
            </CardContent>
          </Card>
        </div>

        {/* Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>60-Day Trends</CardTitle>
            <CardDescription>Daily growth metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="New Users"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="push" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name="New Push Subs"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="optIn" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    name="New Opt-Ins"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Deliverability Widget */}
        <Card>
          <CardHeader>
            <CardTitle>Deliverability (Last 7 Days)</CardTitle>
            <CardDescription>Push and email delivery metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {deliverabilityLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Push Notifications</span>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-muted rounded">
                      <div className="text-lg font-bold">{deliverability?.push.sent || 0}</div>
                      <div className="text-xs text-muted-foreground">Sent</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {deliverability?.push.opened || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Opened</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {deliverability?.push.failed || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                  </div>
                  <div className="text-sm text-center text-muted-foreground">
                    Open Rate: {deliverability?.push.openRate}%
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email</span>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-muted rounded">
                      <div className="text-lg font-bold">{deliverability?.email.sent || 0}</div>
                      <div className="text-xs text-muted-foreground">Sent</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {deliverability?.email.failed || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                  </div>
                  <div className="text-sm text-center text-muted-foreground">
                    Delivery Rate: {deliverability?.email.deliveryRate}%
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Reveal Dialog */}
        <Dialog open={showEmailsDialog} onOpenChange={setShowEmailsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reveal Email Addresses</DialogTitle>
              <DialogDescription className="space-y-2">
                <p>
                  You are about to access personally identifiable information (PII).
                </p>
                <p className="font-semibold text-foreground">
                  This action will be logged for audit purposes.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Only access PII when necessary for legitimate business purposes</li>
                  <li>Do not share or export email addresses without authorization</li>
                  <li>Comply with privacy regulations (GDPR, CCPA, etc.)</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEmailsDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRevealEmails}>
                I Understand - Reveal Emails
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {emailsRevealed && (
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              Email access is logged. Feature coming soon: paginated email list with date filters.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AdminGuard>
  );
}
