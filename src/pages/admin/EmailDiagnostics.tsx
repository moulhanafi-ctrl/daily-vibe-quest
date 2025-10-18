import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, CheckCircle, XCircle, AlertTriangle, RefreshCw, Send, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";

interface DiagnosticResult {
  runtime?: {
    nodeEnv?: string;
    buildTarget?: string;
    runtime?: string;
  };
  secrets?: {
    resendApiKeyPresent: boolean;
    resendApiKeyLength?: number;
    resendApiKeyLast4?: string;
    resendFromEmailPresent: boolean;
    resendFromEmail?: string;
    resendFromEmailValid?: boolean;
    resendFromEmailComposed?: string;
    resendFromEmailError?: string;
  };
  healthCheck?: {
    statusCode: number;
    response: any;
    category: string;
    timestamp: string;
  };
  testSend?: {
    success: boolean;
    statusCode?: number;
    messageId?: string;
    error?: string;
    response?: any;
    timestamp?: string;
    verdict?: string;
    usedFallback?: boolean;
    originalError?: string;
    attempts?: number;
  };
}

export default function EmailDiagnostics() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult>({});
  const [testEmail, setTestEmail] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    loadCurrentUserEmail();
    runDiagnostics();
  }, []);

  const loadCurrentUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setTestEmail(user.email);
    }
  };

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-diagnostics", {
        body: { action: "full_diagnostics" },
      });

      if (error) throw error;
      setResult(data);
    } catch (error) {
      console.error("Error running diagnostics:", error);
      toast.error("Failed to run diagnostics");
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-diagnostics", {
        body: { action: "health_check" },
      });

      if (error) throw error;
      setResult(prev => ({ ...prev, healthCheck: data.healthCheck }));
      toast.success("Health check completed");
    } catch (error) {
      console.error("Error running health check:", error);
      toast.error("Failed to run health check");
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("email-diagnostics", {
        body: { 
          action: "test_send",
          testEmail 
        },
      });

      if (error) throw error;
      
      setResult(prev => ({ ...prev, testSend: data.testSend }));
      
      if (data.testSend?.success) {
        toast.success(`✅ Test email sent! Message ID: ${data.testSend.messageId}`);
      } else {
        toast.error(`❌ Test failed: ${data.testSend?.error}`);
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "ok":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> OK</Badge>;
      case "401_invalid_key":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Invalid Key</Badge>;
      case "403_forbidden":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Forbidden</Badge>;
      case "429_rate_limit":
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" /> Rate Limited</Badge>;
      case "5xx_provider":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Provider Error</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "sent":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Sent</Badge>;
      case "sender_unverified":
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" /> Unverified Sender</Badge>;
      case "sender_unverified_fallback":
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" /> Fallback Sender</Badge>;
      case "test_mode_only":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Test Mode Only</Badge>;
      case "invalid_from":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Invalid From</Badge>;
      case "403_forbidden":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Forbidden</Badge>;
      case "invalid_key":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Invalid Key</Badge>;
      case "network_error":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Network Error</Badge>;
      default:
        return <Badge variant="outline">{verdict}</Badge>;
    }
  };

  return (
    <AdminGuard>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Email Diagnostics</h1>
          <p className="text-muted-foreground">
            Comprehensive email provider configuration and testing
          </p>
        </div>

        {/* Runtime Environment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Runtime Environment
            </CardTitle>
            <CardDescription>Current execution environment and build target</CardDescription>
          </CardHeader>
          <CardContent>
            {result.runtime ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="font-medium">Node Environment:</div>
                  <div className="font-mono">{result.runtime.nodeEnv || "N/A"}</div>
                  
                  <div className="font-medium">Build Target:</div>
                  <div className="font-mono">{result.runtime.buildTarget || "N/A"}</div>
                  
                  <div className="font-medium">Runtime:</div>
                  <div className="font-mono">{result.runtime.runtime || "N/A"}</div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Run diagnostics to see environment info</div>
            )}
          </CardContent>
        </Card>

        {/* Secrets Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Secrets Configuration
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSecrets(!showSecrets)}
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </CardTitle>
            <CardDescription>API keys and sender configuration (masked for security)</CardDescription>
          </CardHeader>
          <CardContent>
            {result.secrets ? (
              <div className="space-y-4">
                <div className="grid grid-cols-[200px_1fr] gap-4 text-sm">
                  <div className="font-medium">RESEND_API_KEY:</div>
                  <div className="flex items-center gap-2">
                    {result.secrets.resendApiKeyPresent ? (
                      <>
                        <Badge className="bg-green-600">Present</Badge>
                        {showSecrets && (
                          <span className="font-mono text-xs">
                            Length: {result.secrets.resendApiKeyLength}, 
                            Last 4: ...{result.secrets.resendApiKeyLast4}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="destructive">Missing</Badge>
                    )}
                  </div>
                  
                  <div className="font-medium">RESEND_FROM_EMAIL:</div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {result.secrets.resendFromEmailPresent ? (
                        <>
                          <Badge className="bg-green-600">Present</Badge>
                          {showSecrets && (
                            <span className="font-mono text-xs">
                              {result.secrets.resendFromEmail}
                            </span>
                          )}
                        </>
                      ) : (
                        <Badge variant="destructive">Missing</Badge>
                      )}
                    </div>
                    
                    {result.secrets.resendFromEmailPresent && (
                      <>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Valid Format:</span>
                          {result.secrets.resendFromEmailValid ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">✓ Valid</Badge>
                          ) : (
                            <Badge variant="destructive">✗ Invalid</Badge>
                          )}
                        </div>
                        
                        {showSecrets && result.secrets.resendFromEmailComposed && (
                          <div className="mt-1">
                            <span className="text-xs text-muted-foreground">Composed From:</span>
                            <div className="font-mono text-xs bg-muted p-2 rounded mt-1">
                              {result.secrets.resendFromEmailComposed}
                            </div>
                          </div>
                        )}
                        
                        {result.secrets.resendFromEmailError && (
                          <Alert variant="destructive" className="mt-2">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              {result.secrets.resendFromEmailError}
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {(!result.secrets.resendApiKeyPresent || !result.secrets.resendFromEmailPresent || !result.secrets.resendFromEmailValid) && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Configuration Issue</div>
                      {!result.secrets.resendApiKeyPresent && <div className="text-sm">• RESEND_API_KEY is missing</div>}
                      {!result.secrets.resendFromEmailPresent && <div className="text-sm">• RESEND_FROM_EMAIL is missing</div>}
                      {result.secrets.resendFromEmailPresent && !result.secrets.resendFromEmailValid && (
                        <div className="text-sm">• RESEND_FROM_EMAIL format is invalid (must be a valid email address only, no name/brackets)</div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">Run diagnostics to check secrets</div>
            )}
          </CardContent>
        </Card>

        {/* Health Check */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              API Health Check
            </CardTitle>
            <CardDescription>Test connectivity to Resend API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runHealthCheck} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Run Health Check
            </Button>

            {result.healthCheck && (
              <div className="space-y-3">
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Status:</span>
                  {getCategoryBadge(result.healthCheck.category)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="font-medium">HTTP Status:</div>
                  <div className="font-mono">{result.healthCheck.statusCode}</div>
                  
                  <div className="font-medium">Timestamp:</div>
                  <div className="text-xs">{new Date(result.healthCheck.timestamp).toLocaleString()}</div>
                </div>

                <div>
                  <div className="font-medium mb-2 text-sm">API Response:</div>
                  <pre className="bg-muted p-3 rounded-lg overflow-auto text-xs max-h-64">
                    {JSON.stringify(result.healthCheck.response, null, 2)}
                  </pre>
                </div>

                {result.healthCheck.category !== "ok" && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Health Check Failed</div>
                      {result.healthCheck.category === "401_invalid_key" && (
                        <div className="text-sm">
                          Your RESEND_API_KEY is invalid or expired. Please update it in your environment secrets.
                        </div>
                      )}
                      {result.healthCheck.category === "403_forbidden" && (
                        <div className="text-sm">
                          Access forbidden. Check your API key permissions in Resend.
                        </div>
                      )}
                      {result.healthCheck.category === "429_rate_limit" && (
                        <div className="text-sm">
                          Rate limit exceeded. Wait a few minutes and try again.
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Send */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Provider Test Email
            </CardTitle>
            <CardDescription>Send a real test email through Resend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="admin@example.com"
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <Button onClick={sendTestEmail} disabled={loading || !testEmail}>
                <Send className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </div>

            {result.testSend && (
              <div className="space-y-3">
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Verdict:</span>
                  {result.testSend.verdict && getVerdictBadge(result.testSend.verdict)}
                </div>

                {result.testSend.usedFallback && (
                  <Alert variant="default" className="border-blue-500 bg-blue-50">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <div className="font-semibold mb-1">🔄 Fallback Sender Used</div>
                      <div className="text-sm">
                        Primary domain failed verification, so we used <code className="px-1 py-0.5 bg-blue-100 rounded">onboarding@resend.dev</code> as fallback.
                        <br />
                        <strong>Original Error:</strong> {result.testSend.originalError}
                        <br />
                        <strong>Action Required:</strong> Verify your domain in Resend to use your custom sender.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="font-medium">Success:</div>
                  <div>{result.testSend.success ? "✅ Yes" : "❌ No"}</div>
                  
                  {result.testSend.attempts && (
                    <>
                      <div className="font-medium">Attempts:</div>
                      <div className="font-mono">{result.testSend.attempts}</div>
                    </>
                  )}
                  
                  {result.testSend.statusCode && (
                    <>
                      <div className="font-medium">HTTP Status:</div>
                      <div className="font-mono">{result.testSend.statusCode}</div>
                    </>
                  )}
                  
                  {result.testSend.messageId && (
                    <>
                      <div className="font-medium">Message ID:</div>
                      <div className="font-mono text-xs">{result.testSend.messageId}</div>
                    </>
                  )}
                  
                  {result.testSend.timestamp && (
                    <>
                      <div className="font-medium">Timestamp:</div>
                      <div className="text-xs">{new Date(result.testSend.timestamp).toLocaleString()}</div>
                    </>
                  )}
                </div>

                {result.testSend.verdict === "test_mode_only" && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Account in Test Mode</div>
                      <div className="text-sm">
                        Resend currently allows sending only to the account owner's email.
                        To email your users, verify your domain and set RESEND_FROM_EMAIL to an address on that domain.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {result.testSend.response && (
                  <div>
                    <div className="font-medium mb-2 text-sm">Full Response:</div>
                    <pre className="bg-muted p-3 rounded-lg overflow-auto text-xs max-h-64">
                      {JSON.stringify(result.testSend.response, null, 2)}
                    </pre>
                  </div>
                )}

                {!result.testSend.success && result.testSend.error && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Test Send Failed</div>
                      <div className="text-sm">{result.testSend.error}</div>
                    </AlertDescription>
                  </Alert>
                )}

                {result.testSend.success && result.testSend.verdict === "sender_unverified" && !result.testSend.usedFallback && (
                  <Alert variant="default" className="border-yellow-500 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-900">
                      <div className="font-semibold mb-1">⚠️ Sender Domain Unverified</div>
                      <div className="text-sm">
                        Email was sent but your domain is not verified in Resend. 
                        Add DNS records (DKIM/SPF) to improve deliverability.
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={loading} variant="default">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Run Full Diagnostics
          </Button>
        </div>
      </div>
    </AdminGuard>
  );
}
