import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle, XCircle, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const MFASettings = () => {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const factors = await supabase.auth.mfa.listFactors();
        const hasActiveFactor = factors.data?.totp.some((factor) => factor.status === "verified");
        setMfaEnabled(hasActiveFactor || false);
      }
    } catch (error) {
      console.error("Error checking MFA status:", error);
    }
  };

  const enrollMFA = async () => {
    setLoading(true);
    try {
      // 1) Get existing factors
      const factors = await supabase.auth.mfa.listFactors();
      const allTotp = factors.data?.totp || [];
      const unverifiedFactors = allTotp.filter((f: any) => f.status !== "verified");

      // 2) Best-effort cleanup of any pending/unverified factors
      for (const factor of unverifiedFactors) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        } catch (e) {
          // ignore cleanup errors
        }
      }

      // 3) Attempt enrollment with the default friendly name
      let friendlyName = "Admin Account";
      let { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName,
      });

      // 4) Handle name conflict by checking for verified factor or retrying with unique name
      if (error && (error.message?.includes("friendly name") || (error as any).code === "mfa_factor_name_conflict")) {
        const refetch = await supabase.auth.mfa.listFactors();
        const refTotp = refetch.data?.totp || [];

        // If a verified factor already exists with that name, reflect enabled state
        const alreadyVerified = refTotp.some((f: any) => f.status === "verified" && (f.friendly_name === friendlyName || f.friendlyName === friendlyName));
        if (alreadyVerified) {
          setMfaEnabled(true);
          setQrCode(null);
          toast({ title: "2FA Already Enabled", description: "Your account already has a verified 2FA factor." });
          return;
        }

        // Otherwise, remove any lingering conflicting pending factors and retry with a unique name
        const conflicting = refTotp.filter((f: any) => (f.friendly_name === friendlyName || f.friendlyName === friendlyName) && f.status !== "verified");
        for (const f of conflicting) {
          try { await supabase.auth.mfa.unenroll({ factorId: f.id }); } catch {}
        }

        friendlyName = `Admin Account ${Date.now()}`;
        ({ data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName }));
      }

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        toast({
          title: "MFA Setup Started",
          description: "Scan the QR code with Google Authenticator",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message ?? "Unable to start MFA enrollment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      const totpFactor = factors.data?.totp.find((f) => f.status !== "verified");

      if (!totpFactor) {
        // Enrollment expired or was cleared - reset UI
        setQrCode(null);
        setVerifyCode("");
        throw new Error("MFA setup expired. Please click 'Enable 2FA' to start again.");
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: verifyCode,
      });

      if (error) throw error;

      setMfaEnabled(true);
      setQrCode(null);
      setVerifyCode("");
      toast({
        title: "Success!",
        description: "Two-factor authentication is now enabled",
      });
      window.dispatchEvent(new Event('readiness:refresh'));
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetEnrollment = () => {
    setQrCode(null);
    setVerifyCode("");
    toast({
      title: "Reset",
      description: "MFA setup cleared. Click 'Enable 2FA' to try again.",
    });
  };

  // Troubleshooting: remove all existing TOTP factors and start fresh
  const fixDuplicateFactors = async () => {
    setLoading(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      const totp = factors.data?.totp || [];
      let removed = 0;
      for (const f of totp) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
          removed++;
        } catch (e) {
          // ignore
        }
      }
      setQrCode(null);
      setVerifyCode("");
      toast({
        title: "Cleaned 2FA factors",
        description: `Removed ${removed} old factor${removed === 1 ? "" : "s"}. Generating a fresh QR...`,
      });
      await enrollMFA();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message ?? "Could not clean 2FA factors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const unenrollMFA = async () => {
    setLoading(true);
    try {
      const factors = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factors.data?.totp.find((f) => f.status === "verified");

      if (!verifiedFactor) throw new Error("No verified MFA factor found");

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

      if (error) throw error;

      setMfaEnabled(false);
      toast({
        title: "MFA Disabled",
        description: "Two-factor authentication has been disabled",
      });
      window.dispatchEvent(new Event('readiness:refresh'));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
              <p className="text-sm text-muted-foreground">
                Secure your admin account with Google Authenticator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mfaEnabled ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {mfaEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        {!mfaEnabled && !qrCode && (
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              Two-factor authentication adds an extra layer of security to your account.
              You'll need Google Authenticator app to set this up.
            </AlertDescription>
          </Alert>
        )}

        {!mfaEnabled && !qrCode && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={enrollMFA} disabled={loading}>
              Enable 2FA with Google Authenticator
            </Button>
            <Button variant="outline" onClick={fixDuplicateFactors} disabled={loading}>
              Troubleshoot 2FA
            </Button>
          </div>
        )}

        {qrCode && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Open Google Authenticator on your phone</li>
                  <li>Tap the + button to add a new account</li>
                  <li>Scan this QR code with your camera</li>
                  <li>Enter the 6-digit code from the app below</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex justify-center p-4 bg-white rounded-lg">
              <img src={qrCode} alt="MFA QR Code" className="max-w-xs" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Code</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
                <Button onClick={verifyMFA} disabled={loading || verifyCode.length !== 6}>
                  Verify
                </Button>
              </div>
              <Button 
                variant="outline" 
                onClick={resetEnrollment} 
                disabled={loading}
                className="w-full mt-2"
              >
                Start Over
              </Button>
            </div>
          </div>
        )}

        {mfaEnabled && (
          <div className="space-y-4">
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                Your account is protected with two-factor authentication. You'll be asked
                for a code from Google Authenticator when you log in.
              </AlertDescription>
            </Alert>

            <Button variant="destructive" onClick={unenrollMFA} disabled={loading}>
              Disable 2FA
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
