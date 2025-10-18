import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DomainStatus {
  domain: string;
  status: string;
  dkim: {
    verified: boolean;
    status: string;
  };
  spf: {
    verified: boolean;
    status: string;
  };
  allVerified: boolean;
}

export const EmailVerificationBanner = () => {
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<DomainStatus[]>([]);
  const [hasVerifiedDomain, setHasVerifiedDomain] = useState(false);
  const { toast } = useToast();

  const checkDomainStatus = async () => {
    try {
      setLoading(true);
      console.log("Checking email domain verification status...");
      
      const { data, error } = await supabase.functions.invoke(
        "check-email-domain-status"
      );

      if (error) {
        console.error("Error checking domain status:", error);
        throw error;
      }

      console.log("Domain status response:", data);
      setDomains(data.domains || []);
      setHasVerifiedDomain(data.hasVerifiedDomain || false);
    } catch (error: any) {
      console.error("Failed to check domain status:", error);
      toast({
        title: "Error",
        description: "Failed to check email domain verification status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDomainStatus();
  }, []);

  if (loading) {
    return (
      <Alert className="border-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Checking email domain verification status...
        </AlertDescription>
      </Alert>
    );
  }

  if (hasVerifiedDomain) {
    return (
      <Alert className="border-success bg-success/10">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-success font-medium">
            Email verified ✅ - DKIM and SPF records configured
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkDomainStatus}
          >
            Refresh
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (domains.length === 0) {
    return (
      <Alert className="border-warning bg-warning/10">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-warning">
            No email domains configured. Add a domain in Resend to send emails.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkDomainStatus}
          >
            Refresh
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      {domains.map((domain) => (
        <Alert
          key={domain.domain}
          className="border-warning bg-warning/10"
        >
          <XCircle className="h-4 w-4 text-warning" />
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-medium text-warning">
                  {domain.domain} - Verification incomplete
                </p>
                <ul className="text-sm space-y-1">
                  <li>
                    DKIM: {domain.dkim.verified ? "✅ Verified" : `❌ ${domain.dkim.status}`}
                  </li>
                  <li>
                    SPF: {domain.spf.verified ? "✅ Verified" : `❌ ${domain.spf.status}`}
                  </li>
                </ul>
                <p className="text-xs mt-2">
                  Configure DNS records at{" "}
                  <a
                    href="https://resend.com/domains"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-warning/80"
                  >
                    resend.com/domains
                  </a>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={checkDomainStatus}
              >
                Refresh
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
