import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PlayCircle, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { getAppSettings } from "@/lib/appSettings";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trackEvent } from "@/lib/analytics";

interface HealthRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  total: number;
  passed: number;
  failed: number;
  duration_ms: number | null;
  triggered_by: string;
}

interface HealthResult {
  id: string;
  test_key: string;
  category: string;
  status: string;
  duration_ms: number;
  error_text: string | null;
  created_at: string;
}

export default function HealthDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [runs, setRuns] = useState<HealthRun[]>([]);
  const [latestRun, setLatestRun] = useState<HealthRun | null>(null);
  const [results, setResults] = useState<HealthResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadHealthData();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('health_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_health_runs'
        },
        () => {
          loadHealthData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadHealthData = async () => {
    setIsLoading(true);
    try {
      // Load recent runs
      const { data: runsData, error: runsError } = await supabase
        .from('system_health_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (runsError) throw runsError;
      setRuns(runsData || []);

      if (runsData && runsData.length > 0) {
        const latest = runsData[0];
        setLatestRun(latest);

        // Load results for latest run
        const { data: resultsData, error: resultsError } = await supabase
          .from('system_health_results')
          .select('*')
          .eq('run_id', latest.id)
          .order('category', { ascending: true });

        if (resultsError) throw resultsError;
        setResults(resultsData || []);
      }
    } catch (error: any) {
      console.error('Error loading health data:', error);
      toast({
        title: "Error",
        description: "Failed to load health check data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('run-health-checks', {
        body: { triggered_by: 'manual' }
      });

      if (error) throw error;

      toast({
        title: "Health Check Started",
        description: `Running ${data.total} tests...`,
      });

      // Reload data after a short delay
      setTimeout(() => {
        loadHealthData();
        setIsRunning(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error running health check:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to run health check",
        variant: "destructive",
      });
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      pass: "default",
      fail: "destructive",
      partial: "outline",
      running: "secondary"
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, HealthResult[]>);

  function LeakedPasswordProtectionTile() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      checkStatus();
    }, []);

    const checkStatus = async () => {
      const settings = await getAppSettings();
      if (settings) {
        setIsEnabled(settings.security_flags.leaked_password_protection_enabled || false);
        
        // Track health check result
        trackEvent({
          eventType: settings.security_flags.leaked_password_protection_enabled 
            ? "health_auth_leaked_pw_check_pass" 
            : "health_auth_leaked_pw_check_fail"
        });
      }
      setLoading(false);
    };

    return (
      <>
        <Card className={`mb-6 ${isEnabled ? 'border-green-500' : 'border-amber-500'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className={`h-5 w-5 ${isEnabled ? 'text-green-500' : 'text-amber-500'}`} />
                <CardTitle className="text-lg">Auth: Leaked Password Protection</CardTitle>
              </div>
              <Badge variant={isEnabled ? "default" : "outline"} className={isEnabled ? "bg-green-500" : "bg-amber-500"}>
                {isEnabled ? "ENABLED" : "ACTION REQUIRED"}
              </Badge>
            </div>
            <CardDescription>
              {isEnabled 
                ? "Passwords are automatically checked against known breaches"
                : "Manual enable required in Supabase Studio"}
            </CardDescription>
          </CardHeader>
          {!isEnabled && (
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
                Open instructions
              </Button>
            </CardContent>
          )}
        </Card>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enable Leaked Password Protection (Supabase Studio)</DialogTitle>
              <DialogDescription>
                Follow these steps to enable password protection in your Supabase project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <ol className="list-decimal list-inside space-y-3">
                <li>Open <strong>Authentication</strong> in the left sidebar.</li>
                <li>Go to <strong>Settings → Email</strong> (or <strong>Providers → Email</strong> in some Studio versions).</li>
                <li>Scroll to <strong>Password security</strong>.</li>
                <li>Toggle <strong>Prevent the use of leaked passwords</strong> ON.</li>
                <li>Click <strong>Save</strong>.</li>
                <li>Return here and click <strong>Mark as Done</strong> to clear this warning.</li>
              </ol>
              <p className="text-muted-foreground italic text-xs mt-4">
                (If you can't find it, try <strong>Authentication → Settings → Passwords</strong>. On Free/Hobby, the toggle may be hidden or disabled.)
              </p>
              <p className="text-muted-foreground text-xs mt-2">
                <strong>Note:</strong> This is a one-time manual step in Studio. Your app can't change this setting via API.
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin/ops")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ops Admin
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">System Health Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                Automated health checks and monitoring
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadHealthData}
                disabled={isLoading || isRunning}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={runHealthCheck}
                disabled={isRunning}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {isRunning ? 'Running...' : 'Run All Now'}
              </Button>
            </div>
          </div>
        </div>

        {/* Leaked Password Protection Warning */}
        <LeakedPasswordProtectionTile />

        {/* Latest Run Summary */}
        {latestRun && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getStatusIcon(latestRun.status)}
                  {getStatusBadge(latestRun.status)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tests Passed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {latestRun.passed}/{latestRun.total}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tests Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {latestRun.failed}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestRun.duration_ms ? `${(latestRun.duration_ms / 1000).toFixed(2)}s` : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Results by Category */}
        <div className="grid gap-6 mb-6">
          {Object.entries(groupedResults).map(([category, categoryResults]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category}</CardTitle>
                <CardDescription>
                  {categoryResults.length} test{categoryResults.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {categoryResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-medium">{result.test_key.replace(/_/g, ' ')}</div>
                          {result.error_text && (
                            <div className="text-sm text-red-600 mt-1">{result.error_text}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.duration_ms}ms
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Run History */}
        <Card>
          <CardHeader>
            <CardTitle>Run History</CardTitle>
            <CardDescription>Last 50 health check runs</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Passed</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Triggered By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{getStatusBadge(run.status)}</TableCell>
                    <TableCell className="text-green-600 font-medium">{run.passed}</TableCell>
                    <TableCell className="text-red-600 font-medium">{run.failed}</TableCell>
                    <TableCell>
                      {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{run.triggered_by}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
