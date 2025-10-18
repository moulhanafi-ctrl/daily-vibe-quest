import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Key, 
  Activity,
  Shield,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DiagnosticResult {
  step: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: any;
}

interface DiagnosticResponse {
  liveReady: boolean;
  results: DiagnosticResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export default function StripeDiagnostics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "stripe-live-diagnostic",
        { body: {} }
      );

      if (fnError) throw fnError;
      
      setResults(data);
    } catch (err: any) {
      console.error("Diagnostic error:", err);
      setError(err.message || "Failed to run diagnostics");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Stripe Live Diagnostics</h1>
          <p className="text-muted-foreground">
            Verify your Stripe Live configuration and connectivity
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Diagnostic Check</h2>
          </div>
          <Button
            onClick={runDiagnostics}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                Run Diagnostics
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-2xl font-bold flex items-center gap-2 mt-1">
                  {results.liveReady ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      <span className="text-green-500">Ready</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-500" />
                      <span className="text-red-500">Not Ready</span>
                    </>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Passed</div>
                <div className="text-2xl font-bold text-green-500 mt-1">
                  {results.summary.passed}
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Failed</div>
                <div className="text-2xl font-bold text-red-500 mt-1">
                  {results.summary.failed}
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Warnings</div>
                <div className="text-2xl font-bold text-yellow-500 mt-1">
                  {results.summary.warnings}
                </div>
              </Card>
            </div>

            {/* Detailed Results */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key className="h-5 w-5" />
                Detailed Results
              </h3>

              {results.results.map((result, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold">{result.step}</h4>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            result.status === "pass"
                              ? "bg-green-100 text-green-800"
                              : result.status === "fail"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {result.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {result.message}
                      </p>
                      {result.details && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <pre className="whitespace-pre-wrap">
                            {typeof result.details === "string"
                              ? result.details
                              : JSON.stringify(result.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Recommendations */}
            {!results.liveReady && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">
                    Action Required
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {results.results
                      .filter((r) => r.status === "fail")
                      .map((r, i) => (
                        <li key={i}>{r.message}</li>
                      ))}
                  </ul>
                  <div className="mt-3 text-sm">
                    <strong>To fix:</strong> Go to Settings → Secrets in your backend
                    to update the required environment variables.
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!results && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Run Diagnostics" to check your Stripe Live configuration</p>
          </div>
        )}
      </Card>
    </div>
  );
}