import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import vibeCheckLogo from "@/assets/vibe-check-logo.png";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

// SECURITY: Input validation
const ContactSchema = z.union([
  z.string().email("Please enter a valid email address"),
  z.string().regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format (+15551234567)")
]);

const Recovery = () => {
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimitKey, setRateLimitKey] = useState("");
  const [attemptCount, setAttemptCount] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Rate limiting: max 5 sends per hour
  useEffect(() => {
    const key = `otp_recovery_${new Date().getHours()}`;
    setRateLimitKey(key);
    const stored = localStorage.getItem(key);
    if (stored) {
      const { count, lastAttempt } = JSON.parse(stored);
      const now = Date.now();
      if (now - lastAttempt < 3600000) { // 1 hour
        setAttemptCount(count);
        if (count >= 5) {
          const remaining = Math.ceil((3600000 - (now - lastAttempt)) / 1000);
          setCooldownSeconds(remaining);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const isPhoneNumber = (value: string) => {
    return value.startsWith('+') && /^\+[1-9]\d{1,14}$/.test(value);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (attemptCount >= 5) {
      toast({
        title: "Rate limit exceeded",
        description: `Please try again in ${Math.ceil(cooldownSeconds / 60)} minutes.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // SECURITY: Validate input format
      ContactSchema.parse(contact);

      const isPhone = isPhoneNumber(contact);
      
      // SECURITY: Generic response - don't reveal if contact exists
      const { error } = await supabase.auth.signInWithOtp(
        isPhone ? { phone: contact } : { email: contact }
      );

      if (error) throw error;

      // Track attempt for rate limiting
      const newCount = attemptCount + 1;
      setAttemptCount(newCount);
      localStorage.setItem(rateLimitKey, JSON.stringify({
        count: newCount,
        lastAttempt: Date.now()
      }));

      // Audit log
      console.log('[AUDIT] OTP sent:', { type: isPhone ? 'sms' : 'email', timestamp: new Date().toISOString() });

      // Navigate to verification with masked contact
      const maskedContact = isPhone 
        ? contact.slice(0, -4).replace(/\d/g, '•') + contact.slice(-4)
        : contact.replace(/(.{2})(.*)(@.*)/, '$1••••$3');

      sessionStorage.setItem('recovery_contact', contact);
      sessionStorage.setItem('recovery_type', isPhone ? 'sms' : 'email');
      sessionStorage.setItem('recovery_masked', maskedContact);

      toast({
        title: "Code sent",
        description: "If this contact is registered, we've sent a 6-digit code.",
      });

      navigate('/auth/verify-code');
    } catch (error: any) {
      // SECURITY: Generic error message
      toast({
        title: "Error",
        description: "Unable to process request. Please try again.",
        variant: "destructive",
      });
      console.error('[AUDIT] OTP failed:', error);
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
          <CardTitle className="text-2xl text-center">Get a one-time code</CardTitle>
          <CardDescription className="text-center">
            Enter your email or mobile number to receive a 6-digit code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Email or Phone Number</Label>
              <Input
                id="contact"
                type="text"
                placeholder="you@example.com or +15551234567"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                disabled={cooldownSeconds > 0}
              />
              <p className="text-xs text-muted-foreground">
                Phone numbers must include country code (e.g., +1 for US)
              </p>
            </div>

            {cooldownSeconds > 0 && (
              <p className="text-sm text-destructive">
                Rate limit reached. Try again in {Math.ceil(cooldownSeconds / 60)} minutes.
              </p>
            )}

            <Button 
              type="submit" 
              className="w-full min-h-[44px]" 
              disabled={loading || cooldownSeconds > 0}
            >
              {loading ? "Sending..." : "Send Code"}
            </Button>
          </form>

          <Button
            variant="ghost"
            className="w-full mt-4 min-h-[44px]"
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

export default Recovery;
