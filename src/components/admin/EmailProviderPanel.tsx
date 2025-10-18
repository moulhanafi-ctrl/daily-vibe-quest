import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, CheckCircle, XCircle, AlertCircle, RefreshCw, Send, ExternalLink, Settings } from "lucide-react";
import { toast } from "sonner";

interface EmailStatus {
  senderEmailConfigured: boolean;
  senderEmail: string | null;
  senderDisplay: string;
  domain: string;
  domainStatus: "verified" | "unverified" | "not_found" | "blocked";
  domainVerified: boolean;
  connectivity: {
    dnsOk: boolean;
    httpsOk: boolean;
  };
  lastCheckAt: string;
}

interface TestResult {
  timestamp: string;
  success: boolean;
  to: string;
  error?: string;
  errorCode?: string;
  details?: string;
}

export function EmailProviderPanel() {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  useEffect(() => {
    loadCurrentUserEmail();
    loadEmailStatus();
  }, []);

  const loadCurrentUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setTestEmail(user.email);
      }
    } catch (error) {
      console.error("Error loading user email:", error);
    }
  };

  const loadEmailStatus = async () => {
    setStatusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-email-status");

      if (error) {
        console.error("Error loading email status:", error);
        toast.error("Failed to load email status");
        return;
      }

      setEmailStatus(data);
    } catch (error) {
      console.error("Failed to load email status:", error);
      toast.error("Failed to connect to email service");
    } finally {
      setStatusLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }

    setLoading(true);
    const timestamp = new Date().toISOString();
    
    try {
      const { data, error } = await supabase.functions.invoke("admin-email-test", {
        body: { to: testEmail },
      });

      if (error) throw error;

      const result: TestResult = {
        timestamp,
        to: testEmail,
        success: data?.ok || false,
        error: data?.message || data?.error,
        errorCode: data?.code,
        details: data?.details,
      };

      setTestResults(prev => [result, ...prev].slice(0, 5));

      if (data?.ok) {
        toast.success(`Test email sent to ${testEmail}`);
      } else {
        toast.error(getErrorMessage(data?.errorCode, data?.message));
      }
    } catch (error: any) {
      console.error("Error sending test email:", error);
      const result: TestResult = {
        timestamp,
        to: testEmail,
        success: false,
        error: error.message || "Network error",
        errorCode: "NETWORK_ERROR",
      };
      setTestResults(prev => [result, ...prev].slice(0, 5));
      toast.error("Failed to send test email");
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code?: string, fallback?: string) => {
    const errorMap: Record<string, string> = {
      invalid_api_key: "Resend API key is invalid or unauthorized",
      invalid_from_address: "Sender email address is invalid or domain not verified in Resend",
      rate_limited: "Rate limit exceeded, try again later",
      resend_service_issue: "Resend service temporarily unavailable",
      network_error: "Network error connecting to email service",
      missing_api_key: "RESEND_API_KEY secret not configured",
      missing_from_email: "RESEND_FROM_EMAIL secret not configured",
      missing_recipient: "Recipient email address required",
      unknown_error: "Unknown error occurred",
    };
    return errorMap[code?.toLowerCase() || ""] || fallback || "Unknown error occurred";
  };

  const getDomainStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-3 w-3 mr-1" /> Verified
          </Badge>
        );
      case "unverified":
        return (
          <Badge variant="secondary" className="border-amber-600 text-amber-600">
            <AlertCircle className="h-3 w-3 mr-1" /> Unverified
          </Badge>
        );
      case "blocked":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> Blocked
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" /> Not Found
          </Badge>
        );
    }
  };

  const getActionButton = () => {
    if (!emailStatus) return null;

    if (!emailStatus.senderEmailConfigured) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            toast.info("Opening backend settings...");
            window.open("#", "_self");
            setTimeout(() => {
              const event = new CustomEvent('open-backend-settings');
              window.dispatchEvent(event);
            }, 100);
          }}
        >
          <Settings className="h-3 w-3 mr-2" />
          Update Sender Email
        </Button>
      );
    }

    if (emailStatus.domainStatus === "not_found" || emailStatus.domainStatus === "unverified") {
      return (
        <Button variant="outline" size="sm" asChild>
          <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-1" />
            Open Resend Domains
          </a>
        </Button>
      );
    }

    if (emailStatus.domainStatus === "blocked") {
      return (
        <Button variant="outline" size="sm" asChild>
          <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-1" />
            Check API Keys
          </a>
        </Button>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Provider Status
            </CardTitle>
            <CardDescription>
              Monitor email configuration and test message delivery
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadEmailStatus}
            disabled={statusLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${statusLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        {statusLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !emailStatus ? (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>Failed to load email provider status</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Configuration Status */}
            {!emailStatus.senderEmailConfigured ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold">Sender Email Not Configured</div>
                      <p className="text-sm mt-1">
                        The sender email (RESEND_FROM_EMAIL) is either missing or invalid. Configure it to enable email sending.
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="font-medium">Required Format:</div>
                      <div className="bg-destructive/10 p-3 rounded border border-destructive/20">
                        <div className="font-mono text-xs space-y-1">
                          <div>Secret: <span className="font-semibold">RESEND_FROM_EMAIL</span></div>
                          <div>Example: <span className="text-green-600">noreply@dailyvibecheck.com</span></div>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        toast.info("Opening backend settings...");
                        window.open("#", "_self");
                        setTimeout(() => {
                          const event = new CustomEvent('open-backend-settings');
                          window.dispatchEvent(event);
                        }, 100);
                      }}
                    >
                      <Settings className="h-3 w-3 mr-2" />
                      Update Secret Configuration
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Sender Info Card */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Sender Email</div>
                      <div className="text-sm text-muted-foreground">
                        {emailStatus.senderDisplay} &lt;{emailStatus.senderEmail}&gt;
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Domain: {emailStatus.domain}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        DNS {emailStatus.connectivity.dnsOk ? '✓' : '✗'} | HTTPS {emailStatus.connectivity.httpsOk ? '✓' : '✗'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getDomainStatusBadge(emailStatus.domainStatus)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      Last checked: {new Date(emailStatus.lastCheckAt).toLocaleString()}
                    </div>
                    {getActionButton()}
                  </div>
                </div>

                {/* Status-specific Alerts */}
                {!emailStatus.connectivity.httpsOk && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-semibold">API Connection Failed</div>
                        <p className="text-sm">
                          Unable to connect to Resend API. Check your network connection or API key configuration.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {emailStatus.domainStatus === "unverified" && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-900">
                      <div className="space-y-2">
                        <div className="font-semibold">Domain Verification Required</div>
                        <p className="text-sm">
                          Your sender domain is not verified. Add SPF and DKIM DNS records in your domain provider to verify, then click Refresh Status.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {emailStatus.domainStatus === "blocked" && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-semibold">API Access Blocked</div>
                        <p className="text-sm">
                          Your Resend API key (RESEND_API_KEY) is invalid or has been revoked. Generate a new API key and update the secret.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {emailStatus.domainStatus === "not_found" && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-semibold">Domain Not Found in Resend</div>
                        <p className="text-sm">
                          This domain hasn't been added to your Resend account. Add it in Resend to start sending.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        )}

        {/* Test Email Section */}
        {emailStatus?.senderEmailConfigured && (
          <div className="space-y-3 pt-4 border-t">
            <div>
              <h3 className="text-sm font-semibold mb-1">Test Email Delivery</h3>
              <p className="text-xs text-muted-foreground">
                Send a test email to verify your configuration
              </p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="test-email" className="sr-only">
                  Test Email Address
                </Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button 
                onClick={sendTestEmail} 
                disabled={loading || !testEmail}
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : "Send Test"}
              </Button>
            </div>

            {/* Recent Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-2 pt-3">
                <div className="text-xs font-medium text-muted-foreground">
                  Recent Test Results (Last 5)
                </div>
                <div className="space-y-2">
                  {testResults.map((result, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border text-sm ${
                        result.success
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                              {result.success 
                                ? `Success → ${result.to}` 
                                : getErrorMessage(result.errorCode, result.error)}
                            </div>
                            {result.details && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {result.details}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
