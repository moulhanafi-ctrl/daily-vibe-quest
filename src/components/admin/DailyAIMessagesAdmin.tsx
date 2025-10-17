import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Heart, Send, Clock, Users, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminGuard } from "./AdminGuard";

interface JobLog {
  id: string;
  run_time: string;
  window_type: string;
  users_targeted: number;
  sent_count: number;
  error_count: number;
  status: string;
  completed_at: string;
}

export function DailyAIMessagesAdmin() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_ai_message_logs")
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

  const sendMessage = async (windowType: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-daily-ai-messages", {
        body: { windowType },
      });

      if (error) throw error;

      toast.success(
        `Messages sent! ${data.users_targeted} users targeted, ${data.sent_count} notifications sent.`
      );

      await loadLogs();
    } catch (error) {
      console.error("Error sending messages:", error);
      toast.error("Failed to send messages");
    } finally {
      setLoading(false);
    }
  };

  const sendTestToSelf = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-daily-ai-messages", {
        body: { 
          windowType: "manual",
          testUserId: user.id 
        },
      });

      if (error) throw error;

      toast.success(
        `Test message sent to you! Preview: "${data.message_preview}"`
      );

      await loadLogs();
    } catch (error) {
      console.error("Error sending test:", error);
      toast.error("Failed to send test message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Daily AI Messages from Mostapha
            </CardTitle>
            <CardDescription>
              Manage twice-daily AI-generated support messages (9 AM & 8 PM)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Messages are automatically sent at 9:00 AM and 8:00 PM daily to all opted-in users
              </AlertDescription>
            </Alert>

            <Alert variant="default" className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                Manual sends bypass all subscription and activity filters - they will send to any user with notifications enabled
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Manual Controls</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Test or manually trigger message sends
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={sendTestToSelf} disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test to Myself
                </Button>
                <Button onClick={() => sendMessage("manual")} disabled={loading} variant="secondary">
                  <Send className="h-4 w-4 mr-2" />
                  Send to All Users Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Message Runs
            </CardTitle>
            <CardDescription>Last 10 message job executions</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No message runs yet</div>
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
                        <Badge variant="outline">{log.window_type}</Badge>
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
