import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle, XCircle, AlertTriangle, RefreshCw, Copy, Send } from "lucide-react";
import { toast } from "sonner";

interface DomainInfo {
  id: string;
  name: string;
  status: string;
  records?: any[];
}

export function EmailProviderPanel() {
  const [loading, setLoading] = useState(false);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [currentDomain, setCurrentDomain] = useState<string>("");
  const [currentFromEmail, setCurrentFromEmail] = useState<string>("");
  const [configError, setConfigError] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    loadDomains();
    loadCurrentUserEmail();
  }, []);

  const loadCurrentUserEmail = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setTestEmail(user.email);
    }
  };

  const loadDomains = async () => {
    setLoading(true);
    setConfigError("");
    try {
      const { data, error } = await supabase.functions.invoke("send-daily-ai-messages", {
        body: { windowType: "get_domains" },
      });

      if (error) {
        setConfigError(error.message || "Failed to load configuration");
        throw error;
      }

      setDomains(data.domains || []);
      setCurrentDomain(data.currentDomain || "");
      setCurrentFromEmail(data.currentFromEmail || "");
      
      // Validate email format
      if (data.currentFromEmail) {
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailRegex.test(data.currentFromEmail)) {
          setConfigError(`Invalid email format detected: ${data.currentFromEmail.substring(0, 50)}...`);
        }
      } else {
        setConfigError("RESEND_FROM_EMAIL not configured");
      }
    } catch (error: any) {
      console.error("Error loading domains:", error);
      if (error.message?.includes("Email configuration invalid")) {
        setConfigError(error.message);
      } else {
        toast.error("Failed to load domain information");
      }
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    setTestSending(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-daily-ai-messages", {
        body: { 
          windowType: "test_email",
          testEmail 
        },
      });

      if (error) throw error;

      setTestResult(data);
      
      if (data.success) {
        toast.success(`✅ Test email sent successfully! Message ID: ${data.messageId}`);
      } else {
        toast.error(`❌ Test failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Failed to send test email");
      setTestResult({ success: false, error: "Network error" });
    } finally {
      setTestSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const currentDomainInfo = domains.find(d => d.name === currentDomain);
  const isVerified = currentDomainInfo?.status === 'verified';
  const hasConfigError = !!configError || !currentFromEmail;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Provider Configuration
        </CardTitle>
        <CardDescription>
          Manage Resend domain verification and test email delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Error Alert */}
        {hasConfigError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <div className="font-semibold">Email Provider Misconfigured</div>
                  <div className="text-sm mt-1">
                    {configError || "RESEND_FROM_EMAIL is not configured"}
                  </div>
                </div>
                
                <div className="bg-background/50 p-3 rounded border space-y-2">
                  <div className="text-sm font-medium">Required Configuration:</div>
                  <div className="text-xs space-y-1">
                    <div className="font-mono bg-background px-2 py-1 rounded">
                      Secret: <span className="text-blue-400">RESEND_FROM_EMAIL</span>
                    </div>
                    <div className="font-mono bg-background px-2 py-1 rounded">
                      Expected value: <span className="text-green-400">noreply@dailyvibecheck.com</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    The secret should contain ONLY the email address, not the full "Name &lt;email&gt;" format.
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast.info("Please update RESEND_FROM_EMAIL secret in your Lovable Cloud settings");
                    window.open("/settings?section=secrets", "_blank");
                  }}
                >
                  <AlertTriangle className="h-3 w-3 mr-2" />
                  Update Secret Configuration
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Configuration */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Current Configuration</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <div className="text-sm font-medium">Sender Email</div>
                <div className={`text-sm ${hasConfigError ? 'text-red-600 font-mono' : 'text-muted-foreground'}`}>
                  {currentFromEmail || "Not configured"}
                </div>
                {hasConfigError && currentFromEmail && (
                  <div className="text-xs text-red-500 mt-1">
                    ⚠️ This appears to be invalid (possibly an API key instead of an email)
                  </div>
                )}
              </div>
              {currentFromEmail && !hasConfigError && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(currentFromEmail)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>

            {currentDomain && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-sm font-medium">Domain</div>
                    <div className="text-sm text-muted-foreground">{currentDomain}</div>
                  </div>
                </div>
                <Badge variant={isVerified ? "default" : "secondary"}>
                  {isVerified ? (
                    <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                  ) : (
                    <><AlertTriangle className="h-3 w-3 mr-1" /> Unverified</>
                  )}
                </Badge>
              </div>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadDomains}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        {/* Domain Verification Status */}
        {!isVerified && currentDomain && currentDomainInfo && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <div className="font-semibold">Domain Not Verified</div>
                  <div className="text-sm mt-1">
                    Your sender domain <strong>{currentDomain}</strong> is not verified. 
                    Emails will still send but may have reduced deliverability.
                  </div>
                </div>

                {currentDomainInfo.records && currentDomainInfo.records.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Required DNS Records:</div>
                    {currentDomainInfo.records.map((record: any, idx: number) => (
                      <div key={idx} className="bg-background/50 p-3 rounded border space-y-1">
                        <div className="grid grid-cols-[80px_1fr] gap-2 text-xs">
                          <div className="font-medium">Type:</div>
                          <div className="font-mono">{record.type}</div>
                          
                          <div className="font-medium">Name:</div>
                          <div className="font-mono break-all">{record.name}</div>
                          
                          <div className="font-medium">Value:</div>
                          <div className="font-mono break-all">{record.value}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => copyToClipboard(record.value)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Value
                        </Button>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground mt-2">
                      Add these DNS records to your domain registrar, then click Refresh Status above.
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isVerified && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              ✅ Domain <strong>{currentDomain}</strong> is verified and ready for production sending
            </AlertDescription>
          </Alert>
        )}

        {/* Test Email Section */}
        <div className="space-y-3 pt-4 border-t">
          <h3 className="text-sm font-semibold">Send Test Email</h3>
          <p className="text-sm text-muted-foreground">
            Send a test email to verify your Resend configuration is working correctly
          </p>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="admin@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <Button
              onClick={sendTestEmail}
              disabled={testSending || !testEmail}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {testSending ? "Sending..." : "Send Provider Test Email"}
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">
                    {testResult.success ? "✅ Test Email Sent Successfully" : "❌ Test Email Failed"}
                  </div>
                  
                  {testResult.success && (
                    <div className="text-sm space-y-1">
                      <div>Message ID: <code className="text-xs">{testResult.messageId}</code></div>
                      <div>To: {testResult.to}</div>
                      <div>From: {testResult.from}</div>
                      <div>Timestamp: {new Date(testResult.timestamp).toLocaleString()}</div>
                      {!testResult.domainVerified && (
                        <div className="text-yellow-700 mt-2">
                          ⚠️ Note: Domain is unverified - email sent but deliverability may be reduced
                        </div>
                      )}
                    </div>
                  )}

                  {!testResult.success && (
                    <div className="text-sm space-y-1">
                      <div>Error: {testResult.error}</div>
                      {testResult.details && (
                        <div className="text-xs opacity-80 mt-1">
                          Details: {testResult.details}
                        </div>
                      )}
                      {testResult.statusCode && (
                        <div className="text-xs opacity-80">
                          Status Code: {testResult.statusCode}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* All Domains List */}
        {domains.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-sm font-semibold">All Domains in Resend</h3>
            <div className="space-y-2">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="text-sm font-medium">{domain.name}</div>
                  <Badge variant={domain.status === 'verified' ? "default" : "secondary"}>
                    {domain.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
