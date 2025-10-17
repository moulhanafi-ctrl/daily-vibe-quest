import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Clock, Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminGuard } from "./AdminGuard";

interface JobLog {
  id: string;
  run_time: string;
  window_start: string;
  window_end: string;
  users_targeted: number;
  sent_count: number;
  error_count: number;
  status: string;
  completed_at: string;
}

export function AIDigestAdmin() {
  const [loading, setLoading] = useState(false);
  const [testUserId, setTestUserId] = useState("");
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("digest_job_logs")
        .select("*")
        .order("run_time", { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("Failed to load job logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const triggerDigest = async (manual = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-ai-generation-digests", {
        body: {
          manual,
          testUserId: testUserId || undefined,
        },
      });

      if (error) throw error;

      toast.success(
        `Digest ${manual ? "manually" : ""} triggered successfully! ${data.users_targeted} users targeted, ${data.sent_count} notifications sent.`
      );

      // Reload logs
      await loadLogs();
    } catch (error) {
      console.error("Error triggering digest:", error);
      toast.error("Failed to trigger digest");
    } finally {
      setLoading(false);
    }
  };

  const triggerTestDigest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setTestUserId(user.id);
    await triggerDigest(true);
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              AI Generation Digest Management
            </CardTitle>
            <CardDescription>
              Manage and test twice-daily AI generation notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Digests are automatically sent at 09:00 and 18:00 America/Detroit time to active subscribers
              </AlertDescription>
            </Alert>

            {/* Manual trigger */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Manual Trigger</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Test the digest system by sending to yourself or a specific user
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-user">Target User ID (optional)</Label>
                <Input
                  id="test-user"
                  placeholder="Leave empty to send to all eligible users"
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a specific user ID to test, or leave empty for all users
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={triggerTestDigest} disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test to Myself
                </Button>
                <Button onClick={() => triggerDigest(true)} disabled={loading} variant="secondary">
                  <Send className="h-4 w-4 mr-2" />
                  {testUserId ? "Send to Specific User" : "Send to All Users"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Job Runs
            </CardTitle>
            <CardDescription>Last 10 digest job executions</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No job runs yet</div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {new Date(log.run_time).toLocaleString()}
                        </span>
                      </div>
                      <Badge
                        variant={
                          log.status === "completed"
                            ? "default"
                            : log.status === "running"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {log.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Targeted:</span>
                        <span className="font-medium">{log.users_targeted}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">Sent:</span>
                        <span className="font-medium">{log.sent_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-muted-foreground">Errors:</span>
                        <span className="font-medium">{log.error_count}</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Window: {new Date(log.window_start).toLocaleTimeString()} -{" "}
                      {new Date(log.window_end).toLocaleTimeString()}
                    </div>

                    {log.completed_at && (
                      <div className="text-xs text-muted-foreground">
                        Completed: {new Date(log.completed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
