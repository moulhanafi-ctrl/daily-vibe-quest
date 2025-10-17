import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, Send, Clock, Users, CheckCircle, XCircle, AlertCircle, Download, Eye } from "lucide-react";
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
  error_details?: any;
}

export function DailyAIMessagesAdmin() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<JobLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
        `Messages sent! ${data.users_targeted} users, ${data.channels_sent} channels delivered, ${data.users_fully_failed} fully failed.`
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

  const downloadDetails = (log: JobLog) => {
    const dataStr = JSON.stringify(log.error_details || {}, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-ai-messages-${log.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openDetails = (log: JobLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const getChannelStats = (details: any) => {
    if (!details?.delivery_details) return null;
    
    const stats = {
      in_app_sent: 0,
      in_app_failed: 0,
      email_sent: 0,
      email_failed: 0,
      email_skipped: 0
    };

    details.delivery_details.forEach((d: any) => {
      if (d.channels?.in_app?.status === 'sent') stats.in_app_sent++;
      if (d.channels?.in_app?.status === 'failed') stats.in_app_failed++;
      if (d.channels?.email?.status === 'sent') stats.email_sent++;
      if (d.channels?.email?.status === 'provider_error' || d.channels?.email?.status === 'failed') stats.email_failed++;
      if (d.channels?.email?.status === 'skipped_invalid') stats.email_skipped++;
    });

    return stats;
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

                    {log.error_details && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetails(log)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadDetails(log)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download JSON
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Message Run Details</DialogTitle>
              <DialogDescription>
                Detailed breakdown of message delivery by user and channel
              </DialogDescription>
            </DialogHeader>

            {selectedLog?.error_details && (
              <div className="space-y-4">
                {/* Summary Stats */}
                {(() => {
                  const stats = getChannelStats(selectedLog.error_details);
                  return stats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <div className="text-sm font-medium">In-App Sent</div>
                        <div className="text-2xl font-bold text-green-600">{stats.in_app_sent}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Email Sent</div>
                        <div className="text-2xl font-bold text-green-600">{stats.email_sent}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Email Failed</div>
                        <div className="text-2xl font-bold text-red-600">{stats.email_failed}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Email Skipped</div>
                        <div className="text-2xl font-bold text-yellow-600">{stats.email_skipped}</div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Per-User Breakdown */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Per-User Delivery Status</h3>
                  {selectedLog.error_details.delivery_details?.map((detail: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{detail.first_name || 'User'}</div>
                          <div className="text-sm text-muted-foreground">{detail.email || detail.user_id}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(detail.attempted_at).toLocaleTimeString()}
                        </div>
                      </div>

                      {/* Channel Status */}
                      <div className="space-y-2">
                        {detail.channels?.in_app && (
                          <div className="flex items-center gap-2 text-sm">
                            {detail.channels.in_app.status === 'sent' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">In-App:</span>
                            <Badge variant={detail.channels.in_app.status === 'sent' ? 'default' : 'destructive'}>
                              {detail.channels.in_app.status}
                            </Badge>
                            {detail.channels.in_app.error && (
                              <span className="text-xs text-red-600">
                                {detail.channels.in_app.error}
                              </span>
                            )}
                          </div>
                        )}

                        {detail.channels?.email && (
                          <div className="flex items-start gap-2 text-sm">
                            {detail.channels.email.status === 'sent' ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                            ) : detail.channels.email.status === 'skipped_invalid' ? (
                              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Email:</span>
                                <Badge variant={
                                  detail.channels.email.status === 'sent' ? 'default' :
                                  detail.channels.email.status === 'skipped_invalid' ? 'secondary' :
                                  'destructive'
                                }>
                                  {detail.channels.email.status}
                                </Badge>
                                {detail.channels.email.attempts > 1 && (
                                  <span className="text-xs text-muted-foreground">
                                    ({detail.channels.email.attempts} attempts)
                                  </span>
                                )}
                              </div>
                              {detail.channels.email.to && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  To: {detail.channels.email.to}
                                </div>
                              )}
                              {(detail.channels.email.error || detail.channels.email.reason) && (
                                <div className="text-xs text-red-600 mt-1 font-mono">
                                  {detail.channels.email.error || detail.channels.email.reason}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Fatal Error */}
                      {detail.fatal_error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                          <div className="font-semibold text-red-700">Fatal Error:</div>
                          <div className="text-red-600 mt-1">{detail.fatal_error}</div>
                          {detail.stack_trace && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-red-700">Stack Trace</summary>
                              <pre className="mt-1 text-xs overflow-x-auto">{detail.stack_trace}</pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
