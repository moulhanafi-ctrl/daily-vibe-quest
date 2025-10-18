import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export const SystemLogsExport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logType, setLogType] = useState<string>("health");

  const exportLogs = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      let filename = "";

      switch (logType) {
        case "health":
          const { data: healthData } = await supabase
            .from("system_health_runs")
            .select("*")
            .order("started_at", { ascending: false })
            .limit(1000);
          data = healthData || [];
          filename = "health-checks";
          break;

        case "email":
          const { data: emailData } = await supabase
            .from("email_logs")
            .select("*")
            .order("sent_at", { ascending: false })
            .limit(1000);
          data = emailData || [];
          filename = "email-logs";
          break;

        case "analytics":
          const { data: analyticsData } = await supabase
            .from("analytics_events")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1000);
          data = analyticsData || [];
          filename = "analytics-events";
          break;

        case "ai_audit":
          const { data: aiData } = await supabase
            .from("ai_audit")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1000);
          data = aiData || [];
          filename = "ai-audit-logs";
          break;

        default:
          throw new Error("Invalid log type");
      }

      if (data.length === 0) {
        toast({
          title: "No data",
          description: "No logs found for the selected type",
        });
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(","),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle JSON objects
            if (typeof value === "object" && value !== null) {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            // Escape quotes in strings
            if (typeof value === "string") {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(",")
        )
      ].join("\n");

      // Download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Downloaded ${data.length} log entries`,
      });
    } catch (error: any) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export System Logs
        </CardTitle>
        <CardDescription>
          Download logs for analysis and compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={logType} onValueChange={setLogType}>
          <SelectTrigger>
            <SelectValue placeholder="Select log type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="health">Health Checks</SelectItem>
            <SelectItem value="email">Email Logs</SelectItem>
            <SelectItem value="analytics">Analytics Events</SelectItem>
            <SelectItem value="ai_audit">AI Audit Logs</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          onClick={exportLogs} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
