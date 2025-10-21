import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import vibeCheckLogo from "@/assets/vibe-check-logo.png";
import { passwordSchema, type PasswordValidation } from "@/lib/validation/passwordPolicy";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);

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

  // Password validation is now handled by PasswordStrengthIndicator component

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
    if (!passwordValidation?.isValid) {
      toast({
        title: "Weak password",
        description: passwordValidation?.errors[0] || "Password doesn't meet requirements.",
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
                aria-describedby="password-requirements"
              />
              
              {/* Password strength indicator */}
              <div id="password-requirements">
                <PasswordStrengthIndicator
                  password={newPassword}
                  onValidationChange={setPasswordValidation}
                />
                {passwordValidation && passwordValidation.errors.length > 0 && newPassword.length > 0 && (
                  <p className="text-xs text-destructive mt-2" role="alert">
                    {passwordValidation.errors[0]}
                  </p>
                )}
              </div>
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
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive mt-1" role="alert">
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={loading || !passwordValidation?.isValid || newPassword !== confirmPassword}
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
