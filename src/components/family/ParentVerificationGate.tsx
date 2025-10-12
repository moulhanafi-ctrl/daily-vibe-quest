/**
 * Parent Verification Gate Component
 * 
 * SECURITY: Prevents minors (child/teen) from accessing the app without
 * completing guardian verification. This enforces COPPA compliance.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Mail, Clock } from "lucide-react";

interface Profile {
  age_group: string;
  parent_id: string | null;
}

interface GuardianLink {
  status: string;
  guardian_email: string;
  verified_at: string | null;
}

export const ParentVerificationGate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guardianLink, setGuardianLink] = useState<GuardianLink | null>(null);
  const [guardianEmail, setGuardianEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get user's profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("age_group, parent_id")
        .eq("id", user.id)
        .single();

      if (!profileData) {
        toast.error("Profile not found");
        navigate("/auth");
        return;
      }

      setProfile(profileData);

      // If adult/elder or has verified parent, redirect to dashboard
      if (profileData.age_group === "adult" || profileData.age_group === "elder" || profileData.parent_id) {
        navigate("/dashboard");
        return;
      }

      // Check existing guardian link
      const { data: linkData } = await supabase
        .from("guardian_links")
        .select("status, guardian_email, verified_at")
        .eq("child_id", user.id)
        .maybeSingle();

      if (linkData) {
        setGuardianLink(linkData);
        setGuardianEmail(linkData.guardian_email);
        
        if (linkData.status === "verified" && linkData.verified_at) {
          // Verification complete, redirect
          navigate("/dashboard");
          return;
        }
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Error checking verification:", error);
      toast.error("Failed to check verification status");
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!guardianEmail || !/\S+@\S+\.\S+/.test(guardianEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSendingCode(true);
    try {
      const { error } = await supabase.functions.invoke("guardian-start", {
        body: { guardianEmail },
      });

      if (error) throw error;

      toast.success("Verification code sent! Check your parent's email.");
      await checkVerificationStatus(); // Refresh status
    } catch (error: any) {
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setVerifying(true);
    try {
      const { error } = await supabase.functions.invoke("guardian-verify", {
        body: {
          guardianEmail,
          code: verificationCode,
        },
      });

      if (error) throw error;

      toast.success("Parent verified! Welcome to Vibe Check.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/20 to-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle>Parent Verification Required</CardTitle>
          </div>
          <CardDescription>
            For your safety, we need a parent or guardian to verify your account before you can use Vibe Check.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!guardianLink || guardianLink.status === "pending" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="guardian-email">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Parent/Guardian Email
                </Label>
                <Input
                  id="guardian-email"
                  type="email"
                  placeholder="parent@example.com"
                  value={guardianEmail}
                  onChange={(e) => setGuardianEmail(e.target.value)}
                  disabled={sendingCode || !!guardianLink}
                />
              </div>

              {!guardianLink && (
                <Button
                  onClick={handleSendCode}
                  disabled={sendingCode}
                  className="w-full"
                >
                  {sendingCode ? "Sending..." : "Send Verification Code"}
                </Button>
              )}

              {guardianLink && guardianLink.status === "pending" && (
                <>
                  <div className="bg-secondary/20 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Code sent to {guardianEmail}</p>
                        <p className="text-muted-foreground mt-1">
                          Ask your parent to check their email and provide the 6-digit verification code.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code">6-Digit Verification Code</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                      disabled={verifying}
                    />
                  </div>

                  <Button
                    onClick={handleVerify}
                    disabled={verifying || verificationCode.length !== 6}
                    className="w-full"
                  >
                    {verifying ? "Verifying..." : "Verify Code"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSendCode}
                    disabled={sendingCode}
                    className="w-full"
                  >
                    Resend Code
                  </Button>
                </>
              )}
            </>
          ) : null}

          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            This verification helps us comply with child safety laws and ensures
            a parent or guardian is aware of your use of this mental health app.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
