import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import vibeCheckLogo from "@/assets/vibe-check-logo.png";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft } from "lucide-react";

const VerifyCode = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [maskedContact, setMaskedContact] = useState("");
  const [contactType, setContactType] = useState<"email" | "sms">("email");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
    // Check if we have recovery data
    const masked = sessionStorage.getItem('recovery_masked');
    const type = sessionStorage.getItem('recovery_type') as "email" | "sms";
    
    if (!masked || !type) {
      navigate('/auth/recovery');
      return;
    }

    setMaskedContact(masked);
    setContactType(type);

    // Check for lockout
    const lockout = localStorage.getItem('otp_lockout');
    if (lockout) {
      const lockoutTime = parseInt(lockout);
      if (Date.now() < lockoutTime) {
        setLockoutUntil(lockoutTime);
      } else {
        localStorage.removeItem('otp_lockout');
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const timer = setTimeout(() => {
        if (Date.now() >= lockoutUntil) {
          setLockoutUntil(null);
          localStorage.removeItem('otp_lockout');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutUntil]);

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code.",
        variant: "destructive",
      });
      return;
    }

    // SECURITY: Check brute-force lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 60000);
      toast({
        title: "Account locked",
        description: `Too many failed attempts. Try again in ${remaining} minutes.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const contact = sessionStorage.getItem('recovery_contact');
      if (!contact) throw new Error("Session expired");

      const { data, error } = contactType === 'sms'
        ? await supabase.auth.verifyOtp({
            phone: contact,
            token: code,
            type: 'sms',
          })
        : await supabase.auth.verifyOtp({
            email: contact,
            token: code,
            type: 'email',
          });

      if (error) throw error;

      // Reset failed attempts on success
      setFailedAttempts(0);
      localStorage.removeItem('otp_failed_attempts');
      
      // Audit log
      console.log('[AUDIT] OTP verified:', { type: contactType, timestamp: new Date().toISOString() });

      // Mark session as requiring password reset
      sessionStorage.setItem('password_reset_required', 'true');
      sessionStorage.setItem('temp_session_user_id', data.user?.id || '');

      toast({
        title: "Verification successful",
        description: "Please create a new password to continue.",
      });

      navigate('/auth/reset-password');
    } catch (error: any) {
      // SECURITY: Track failed attempts for brute-force protection
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      localStorage.setItem('otp_failed_attempts', newFailedAttempts.toString());

      console.error('[AUDIT] OTP verification failed:', { attempts: newFailedAttempts, timestamp: new Date().toISOString() });

      if (newFailedAttempts >= 10) {
        // Lock for 15 minutes
        const lockout = Date.now() + (15 * 60 * 1000);
        setLockoutUntil(lockout);
        localStorage.setItem('otp_lockout', lockout.toString());
        
        toast({
          title: "Too many attempts",
          description: "Account locked for 15 minutes due to repeated failures.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invalid code",
          description: `Please check your code and try again. ${10 - newFailedAttempts} attempts remaining.`,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);

    try {
      const contact = sessionStorage.getItem('recovery_contact');
      if (!contact) throw new Error("Session expired");

      const { error } = await supabase.auth.signInWithOtp(
        contactType === 'sms' ? { phone: contact } : { email: contact }
      );

      if (error) throw error;

      setResendCooldown(30);
      
      console.log('[AUDIT] OTP resent:', { type: contactType, timestamp: new Date().toISOString() });

      toast({
        title: "Code resent",
        description: "A new code has been sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Unable to resend code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeContact = () => {
    sessionStorage.removeItem('recovery_contact');
    sessionStorage.removeItem('recovery_type');
    sessionStorage.removeItem('recovery_masked');
    navigate('/auth/recovery');
  };

  const remainingMinutes = lockoutUntil ? Math.ceil((lockoutUntil - Date.now()) / 60000) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <img src={vibeCheckLogo} alt="Vibe Check Logo" className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl text-center">Enter your code</CardTitle>
          <CardDescription className="text-center">
            We sent a 6-digit code to <span className="font-medium">{maskedContact}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              disabled={loading || (lockoutUntil !== null && Date.now() < lockoutUntil)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {lockoutUntil && Date.now() < lockoutUntil && (
            <p className="text-sm text-destructive text-center">
              Account locked for {remainingMinutes} minute{remainingMinutes !== 1 ? 's' : ''} due to repeated failures.
            </p>
          )}

          <Button
            onClick={handleVerifyCode}
            className="w-full min-h-[44px]"
            disabled={loading || code.length !== 6 || (lockoutUntil !== null && Date.now() < lockoutUntil)}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </Button>

          <div className="space-y-2 text-center text-sm">
            <p className="text-muted-foreground">
              Didn't get it?{" "}
              {resendCooldown > 0 ? (
                <span className="text-muted-foreground">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-primary hover:underline"
                  disabled={loading}
                >
                  Resend code
                </button>
              )}
            </p>
            <button
              onClick={handleChangeContact}
              className="text-primary hover:underline"
            >
              Change contact
            </button>
          </div>

          <Button
            variant="ghost"
            className="w-full min-h-[44px]"
            onClick={() => navigate('/auth')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyCode;
