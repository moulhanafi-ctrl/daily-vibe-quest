import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import vibeCheckLogo from "@/assets/vibe-check-logo.png";
import { CheckCircle2, XCircle } from "lucide-react";
import { z } from "zod";

// SECURITY: Strong password validation
const PasswordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one symbol");

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validations, setValidations] = useState({
    minLength: false,
    hasNumber: false,
    hasSymbol: false,
  });

  useEffect(() => {
    // SECURITY: Verify user has gone through OTP flow
    const resetRequired = sessionStorage.getItem('password_reset_required');
    const userId = sessionStorage.getItem('temp_session_user_id');

    if (!resetRequired || !userId) {
      toast({
        title: "Unauthorized",
        description: "Please verify your identity first.",
        variant: "destructive",
      });
      navigate('/auth/recovery');
    }
  }, [navigate]);

  useEffect(() => {
    // Update password strength indicators
    setValidations({
      minLength: newPassword.length >= 12,
      hasNumber: /[0-9]/.test(newPassword),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    // SECURITY: Validate password strength
    try {
      PasswordSchema.parse(newPassword);
    } catch (error: any) {
      toast({
        title: "Weak password",
        description: error.errors?.[0]?.message || "Password doesn't meet requirements.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Clear session flags
      sessionStorage.removeItem('password_reset_required');
      sessionStorage.removeItem('temp_session_user_id');
      sessionStorage.removeItem('recovery_contact');
      sessionStorage.removeItem('recovery_type');
      sessionStorage.removeItem('recovery_masked');
      localStorage.removeItem('otp_failed_attempts');

      // Audit log
      console.log('[AUDIT] Password reset:', { timestamp: new Date().toISOString() });

      toast({
        title: "Password updated",
        description: "You're all set! Redirecting to dashboard...",
      });

      // Refresh session
      await supabase.auth.refreshSession();

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const allValidationsPassed = validations.minLength && validations.hasNumber && validations.hasSymbol;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <img src={vibeCheckLogo} alt="Vibe Check Logo" className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl text-center">Create a new password</CardTitle>
          <CardDescription className="text-center">
            Choose a strong password to secure your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium mb-2">Password Requirements:</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {validations.minLength ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={validations.minLength ? "text-green-600" : ""}>
                    At least 12 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {validations.hasNumber ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={validations.hasNumber ? "text-green-600" : ""}>
                    Contains a number
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {validations.hasSymbol ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={validations.hasSymbol ? "text-green-600" : ""}>
                    Contains a symbol (!@#$%^&*)
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={loading || !allValidationsPassed || newPassword !== confirmPassword}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
