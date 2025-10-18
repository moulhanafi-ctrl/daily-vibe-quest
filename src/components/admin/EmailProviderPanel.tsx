import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, XCircle, AlertCircle, RefreshCw, Send, Settings } from "lucide-react";
import { toast } from "sonner";

interface EmailStatus {
  senderEmailConfigured: boolean;
  senderEmail: string | null;
  senderDisplay: string;
  resendDomain: string;
  domainStatus: "not_found" | "unverified" | "verified" | "blocked";
  domainVerified: boolean;
  lastCheckAt: string;
}

export function EmailProviderPanel() {
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [testEmail, setTestEmail] = useState<string>("");
  const [testResult, setTestResult] = useState<any>(null);

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
        toast.error("Failed to load email provider status");
        return;
      }

      setEmailStatus(data);
    } catch (error: any) {
      console.error("Error in loadEmailStatus:", error);
      toast.error("Failed to connect to email provider");
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
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-email-test", {
        body: { to: testEmail },
      });

      if (error) {
        setTestResult({ success: false, error: error.message });
        toast.error(`Test email failed: ${error.message}`);
      } else if (data.ok) {
        setTestResult({ success: true, data });
        toast.success("Test email sent successfully!");
      } else {
        setTestResult({ success: false, error: data.message });
        toast.error(`Test failed: ${data.message}`);
      }
    } catch (error: any) {
      console.error("Error sending test email:", error);
      setTestResult({ success: false, error: error.message });
      toast.error("Network error: Failed to send test email");
    } finally {
      setLoading(false);
    }
  };

  const getDomainStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-600">Domain verified</Badge>;
      case "unverified":
        return <Badge variant="outline" className="border-amber-600 text-amber-600">Domain not verified</Badge>;
      case "blocked":
        return <Badge variant="destructive">API key invalid</Badge>;
      case "not_found":
        return <Badge variant="secondary">Domain not found in Resend</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const hasConfigError = emailStatus && !emailStatus.senderEmailConfigured;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Provider Configuration
        </CardTitle>
        <CardDescription>
          Resend email service configuration and domain verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusLoading && (
          <div className="text-sm text-muted-foreground">Loading email provider status...</div>
        )}

        {!statusLoading && hasConfigError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <div className="font-semibold">Email Provider Misconfigured</div>
                  <div className="text-sm mt-1">
                    {!emailStatus.senderEmail 
                      ? "RESEND_FROM_EMAIL secret is not configured" 
                      : "Invalid email format in RESEND_FROM_EMAIL"}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="font-medium">Required Configuration:</div>
                  <div className="bg-destructive/10 p-3 rounded border border-destructive/20">
                    <div className="font-mono text-xs space-y-1">
                      <div>Secret: <span className="font-semibold">RESEND_FROM_EMAIL</span></div>
                      <div>Example: <span className="text-green-600">noreply@dailyvibecheck.com</span></div>
                      <div className="text-yellow-600">⚠️ Must be a valid email address</div>
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
        )}

        {!statusLoading && emailStatus && (
          <>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Current Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sender Email:</span>
                  <span className={`font-mono ${!emailStatus.senderEmailConfigured ? 'text-red-600' : ''}`}>
                    {emailStatus.senderEmail || "Not configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Display Name:</span>
                  <span className="font-medium">{emailStatus.senderDisplay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Domain Status:</span>
                  {getDomainStatusBadge(emailStatus.domainStatus)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Check:</span>
                  <span className="text-xs">{new Date(emailStatus.lastCheckAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadEmailStatus}
                disabled={statusLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-2 ${statusLoading ? "animate-spin" : ""}`} />
                Refresh Status
              </Button>
            </div>

            {emailStatus.domainStatus === "unverified" && (
              <Alert variant="default" className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900">
                  <div className="space-y-2">
                    <div className="font-semibold">Domain Not Verified</div>
                    <div className="text-sm">
                      Verify DNS on Resend (SPF/DKIM) for {emailStatus.resendDomain}, then click Refresh Status.
                      Visit your Resend dashboard to add the required DNS records.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {emailStatus.domainStatus === "blocked" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold">API Key Invalid</div>
                  <div className="text-sm mt-1">
                    Your RESEND_API_KEY appears to be invalid or unauthorized. Please update it in the backend settings.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {emailStatus.senderEmailConfigured && (
              <div className="space-y-2 pt-4 border-t">
                <h3 className="text-sm font-semibold">Test Email Delivery</h3>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={sendTestEmail} disabled={loading || !testEmail}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </Button>
                </div>
                {testResult && (
                  <Alert variant={testResult.success ? "default" : "destructive"}>
                    <AlertDescription>
                      {testResult.success ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Test email sent successfully!
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            <span className="font-semibold">Test Failed</span>
                          </div>
                          <div className="text-sm">{testResult.error}</div>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
