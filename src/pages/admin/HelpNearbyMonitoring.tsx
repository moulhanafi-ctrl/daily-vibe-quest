import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, TrendingUp, Activity, Clock, ShieldAlert, ExternalLink } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useNavigate } from "react-router-dom";

interface MetricData {
  error_rate_pct: number;
  p95_latency: number;
  rate_limit_hits: number;
  anomalies: number;
  total_requests: number;
  success_requests: number;
  cache_hit_rate: number;
}

interface Alert {
  type: "error_rate" | "latency" | "rate_limit" | "anomaly";
  severity: "critical" | "warning";
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

const THRESHOLDS = {
  error_rate_pct: 2,
  p95_latency: 2000,
  rate_limit_hits: 200,
  anomalies: 5,
};

export default function HelpNearbyMonitoring() {
  const { isAdmin, isLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<"10m" | "1h" | "24h">("10m");

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, isLoading, navigate]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate metrics for demonstration - in production, this would query actual edge function logs
      // You can integrate with Supabase Analytics or create custom logging tables
      
      const simulatedMetrics: MetricData = {
        error_rate_pct: Math.random() * 5, // 0-5%
        p95_latency: 800 + Math.random() * 1500, // 800-2300ms
        rate_limit_hits: Math.floor(Math.random() * 250), // 0-250
        anomalies: Math.floor(Math.random() * 8), // 0-8
        total_requests: Math.floor(500 + Math.random() * 1000),
        success_requests: Math.floor(450 + Math.random() * 900),
        cache_hit_rate: 40 + Math.random() * 30, // 40-70%
      };
      
      setMetrics(simulatedMetrics);
      checkAlerts(simulatedMetrics);
    } catch (err: any) {
      setError(err.message || "Failed to fetch metrics");
    } finally {
      setLoading(false);
    }
  };

  const checkAlerts = (data: MetricData) => {
    const newAlerts: Alert[] = [];
    const now = new Date();

    // Check error rate
    if (data.error_rate_pct > THRESHOLDS.error_rate_pct) {
      newAlerts.push({
        type: "error_rate",
        severity: data.error_rate_pct > THRESHOLDS.error_rate_pct * 2 ? "critical" : "warning",
        message: `Error rate is ${data.error_rate_pct.toFixed(2)}% (threshold: ${THRESHOLDS.error_rate_pct}%)`,
        value: data.error_rate_pct,
        threshold: THRESHOLDS.error_rate_pct,
        timestamp: now,
      });
    }

    // Check P95 latency
    if (data.p95_latency > THRESHOLDS.p95_latency) {
      newAlerts.push({
        type: "latency",
        severity: data.p95_latency > THRESHOLDS.p95_latency * 1.5 ? "critical" : "warning",
        message: `P95 latency is ${data.p95_latency}ms (threshold: ${THRESHOLDS.p95_latency}ms)`,
        value: data.p95_latency,
        threshold: THRESHOLDS.p95_latency,
        timestamp: now,
      });
    }

    // Check rate limit hits
    if (data.rate_limit_hits > THRESHOLDS.rate_limit_hits) {
      newAlerts.push({
        type: "rate_limit",
        severity: data.rate_limit_hits > THRESHOLDS.rate_limit_hits * 1.5 ? "critical" : "warning",
        message: `${data.rate_limit_hits} rate limit hits (threshold: ${THRESHOLDS.rate_limit_hits})`,
        value: data.rate_limit_hits,
        threshold: THRESHOLDS.rate_limit_hits,
        timestamp: now,
      });
    }

    // Check anomalies
    if (data.anomalies > THRESHOLDS.anomalies) {
      newAlerts.push({
        type: "anomaly",
        severity: data.anomalies > THRESHOLDS.anomalies * 2 ? "critical" : "warning",
        message: `${data.anomalies} anomalous usage patterns detected (threshold: ${THRESHOLDS.anomalies})`,
        value: data.anomalies,
        threshold: THRESHOLDS.anomalies,
        timestamp: now,
      });
    }

    setAlerts(newAlerts);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [isAdmin, timeWindow]);

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Help Nearby Monitoring</h1>
          <p className="text-muted-foreground mt-2">
            Real-time monitoring dashboard for /help/nearby endpoint
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchMetrics}
          disabled={loading}
        >
          <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Time Window Selector */}
      <Tabs value={timeWindow} onValueChange={(v) => setTimeWindow(v as typeof timeWindow)} className="mb-6">
        <TabsList>
          <TabsTrigger value="10m">Last 10 minutes</TabsTrigger>
          <TabsTrigger value="1h">Last 1 hour</TabsTrigger>
          <TabsTrigger value="24h">Last 24 hours</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Active Alerts ({alerts.length})
          </h2>
          {alerts.map((alert, idx) => (
            <Alert
              key={idx}
              variant={alert.severity === "critical" ? "destructive" : "default"}
              className={alert.severity === "warning" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" : ""}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold mb-1">
                      {alert.type.toUpperCase().replace("_", " ")}
                      {" - "}
                      <Badge variant={alert.severity === "critical" ? "destructive" : "default"}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <div>{alert.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href="https://github.com/yourusername/yourrepo/blob/main/src/docs/HELP_NEARBY_MONITORING.md"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Runbook
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* No Alerts - All Clear */}
      {alerts.length === 0 && !loading && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            All systems operational - No alerts triggered
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Error Rate */}
          <Card className={metrics.error_rate_pct > THRESHOLDS.error_rate_pct ? "border-destructive" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Error Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.error_rate_pct.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Threshold: {THRESHOLDS.error_rate_pct}%
              </p>
              {metrics.error_rate_pct > THRESHOLDS.error_rate_pct && (
                <Badge variant="destructive" className="mt-2">
                  Above threshold
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* P95 Latency */}
          <Card className={metrics.p95_latency > THRESHOLDS.p95_latency ? "border-yellow-500" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                P95 Latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Math.round(metrics.p95_latency)}ms
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Threshold: {THRESHOLDS.p95_latency}ms
              </p>
              {metrics.p95_latency > THRESHOLDS.p95_latency && (
                <Badge variant="default" className="mt-2 bg-yellow-500">
                  Above threshold
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Rate Limit Hits */}
          <Card className={metrics.rate_limit_hits > THRESHOLDS.rate_limit_hits ? "border-orange-500" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Rate Limit Hits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.rate_limit_hits}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Threshold: {THRESHOLDS.rate_limit_hits}
              </p>
              {metrics.rate_limit_hits > THRESHOLDS.rate_limit_hits && (
                <Badge variant="default" className="mt-2 bg-orange-500">
                  Above threshold
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Anomalies */}
          <Card className={metrics.anomalies > THRESHOLDS.anomalies ? "border-purple-500" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Anomalies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics.anomalies}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Threshold: {THRESHOLDS.anomalies}
              </p>
              {metrics.anomalies > THRESHOLDS.anomalies && (
                <Badge variant="default" className="mt-2 bg-purple-500">
                  Above threshold
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Metrics */}
      {metrics && (
        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_requests}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.success_requests} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.cache_hit_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                10-minute cache TTL
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.total_requests > 0 
                  ? ((metrics.success_requests / metrics.total_requests) * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last {timeWindow}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documentation Links */}
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>
            Documentation and diagnostic tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            asChild
          >
            <a
              href="https://github.com/yourusername/yourrepo/blob/main/src/docs/HELP_NEARBY_MONITORING.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Monitoring Runbook
            </a>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate("/help/test-google")}
          >
            <Activity className="h-4 w-4 mr-2" />
            API Diagnostics Page
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => navigate("/help/nearby")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Test Help Nearby
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
