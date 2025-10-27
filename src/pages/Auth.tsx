import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import vibeCheckLogo from "@/assets/vibe-check-logo.png";
import { z } from "zod";
import { passwordSchema, type PasswordValidation } from "@/lib/validation/passwordPolicy";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";

// SECURITY: Enhanced input validation schema for signup with strong password policy
const SignupSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .trim(),
  password: passwordSchema, // Now enforces: 12 chars, upper/lower/number/symbol
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores")
    .trim(),
  ageGroup: z.enum(["child", "teen", "adult", "elder"]),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [ageGroup, setAgeGroup] = useState<"child" | "teen" | "adult">("adult");
  const [loading, setLoading] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);
  const [authTimeout, setAuthTimeout] = useState(false);
  const [lastAuthEvent, setLastAuthEvent] = useState<string>("");
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const AUTH_TIMEOUT_MS = 8000; // 8 second timeout
  const PREVIEW_URL = "https://2c588c7a-e9e9-4d3f-b2dd-79a1b8546184.lovableproject.com/auth";

  // Handle SW bypass on mount
  useEffect(() => {
    const bypassSw = searchParams.get('bypass-sw');
    if (bypassSw === '1') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach(reg => reg.unregister());
          toast({ title: "Service worker cleared", description: "Reloading app..." });
          setTimeout(() => {
            window.location.href = window.location.origin + '/auth';
          }, 1000);
        });
      }
    }
  }, [searchParams]);

  // Detect Safari Private Mode
  useEffect(() => {
    const detectPrivateMode = async () => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
      } catch (e) {
        setIsPrivateMode(true);
        toast({
          title: "Private Browsing Detected",
          description: "Please use standard browsing mode for login to work properly.",
          variant: "destructive",
        });
      }
    };
    detectPrivateMode();
  }, []);

  useEffect(() => {
    const redirectAfterLogin = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('language, selected_focus_areas, username')
          .eq('id', userId)
          .maybeSingle();

        if (!profile?.language) {
          navigate('/welcome/language');
        } else if (!profile?.selected_focus_areas || profile.selected_focus_areas.length === 0) {
          navigate('/onboarding');
        } else {
          toast({ 
            title: `Welcome back, ${profile?.username || 'friend'}!`,
            description: 'Good to see you again.'
          });
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        toast({ title: 'Error', description: 'Failed to load profile. Please try again.', variant: 'destructive' });
        // Fallback: never get stuck on /auth due to profile issues
        navigate('/dashboard');
      }
    };

    // 1) Listen for auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setLastAuthEvent(event);
      if (event === 'SIGNED_IN' && session?.user) {
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        redirectAfterLogin(session.user.id);
      }
    });

    // 2) Also handle existing session on first load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        redirectAfterLogin(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleClearCacheAndReload = async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(reg => reg.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  const handleRetryAuth = () => {
    setAuthTimeout(false);
    setLoading(false);
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthTimeout(false);

    // Start timeout timer
    authTimeoutRef.current = setTimeout(() => {
      setAuthTimeout(true);
      setLoading(false);
    }, AUTH_TIMEOUT_MS);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast({ 
          title: "Check your email", 
          description: "We've sent you a password reset link." 
        });
        setIsForgotPassword(false);
      } else if (isLogin) {
        // Prevent indefinite loading with a safety timeout
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        const session = data?.session;
        if (session) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('language, selected_focus_areas, username')
              .eq('id', session.user.id)
              .maybeSingle();

            if (!profile?.language) {
              navigate('/welcome/language');
            } else if (!profile?.selected_focus_areas || profile.selected_focus_areas.length === 0) {
              navigate('/onboarding');
            } else {
              toast({ 
                title: `Welcome back, ${profile.username || 'friend'}!`,
                description: "Good to see you again."
              });
              navigate('/dashboard');
            }
          } catch (err) {
            console.error('Post-login profile check failed:', err);
            navigate('/dashboard'); // Fallback to dashboard
          }
        }
        
        // Listener also handles other auth events
      } else {
        // SECURITY: Validate signup inputs
        const validationResult = SignupSchema.safeParse({
          email,
          password,
          username,
          ageGroup,
        });

        if (!validationResult.success) {
          const errors = validationResult.error.errors.map(e => e.message).join(", ");
          throw new Error(errors);
        }

        // STRICT: Require strong password validation
        if (!passwordValidation?.isValid) {
          throw new Error("Password does not meet security requirements. " + (passwordValidation?.errors[0] || ""));
        }

        // STRICT: Additional score check
        if (passwordValidation.score < 3) {
          throw new Error("Password is too weak. Please use a stronger password with mixed characters.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: {
              username,
              age_group: ageGroup,
            },
          },
        });
        if (error) throw error;
        toast({ title: "Account created! Please verify your email if required." });
        // Auth state change listener will handle navigation after sign up
      }
    } catch (error: any) {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      {authTimeout && (
        <Alert variant="destructive" className="fixed top-4 left-4 right-4 z-50 max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <div className="space-y-3">
              <p className="font-semibold">Authentication Timeout</p>
              <p className="text-sm">Login took too long. This may be due to network or SSL issues.</p>
              <div className="text-xs space-y-1 opacity-80">
                <p>Last auth event: {lastAuthEvent || 'None'}</p>
                <p>LocalStorage: {(() => { try { return localStorage ? 'Available' : 'Unavailable'; } catch { return 'Blocked'; }})()}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={handleRetryAuth}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Retry
                </Button>
                <Button size="sm" variant="outline" onClick={handleClearCacheAndReload}>
                  Clear Cache & Reload
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={PREVIEW_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" /> Use Preview
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="/auth?bypass-sw=1">Bypass Service Worker</a>
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <img src={vibeCheckLogo} alt="Vibe Check Logo" className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl text-center">
            {isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Join Vibe Check"}
          </CardTitle>
          <CardDescription className="text-center">
            {isForgotPassword
              ? "Enter your email to receive a password reset link"
              : isLogin
              ? "Sign in to continue your wellness journey"
              : "Start your journey to better mental health"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <RadioGroup value={ageGroup} onValueChange={(value: any) => setAgeGroup(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="child" id="child" />
                      <Label htmlFor="child">Child (under 13)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="teen" id="teen" />
                      <Label htmlFor="teen">Teen (13-17)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="adult" id="adult" />
                      <Label htmlFor="adult">Adult (18+)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {!isLogin && <span className="text-xs text-muted-foreground">(min 12 characters)</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isLogin ? 6 : 12}
                  aria-describedby={!isLogin ? "password-requirements" : undefined}
                />
                
                {/* Password strength indicator for signup */}
                {!isLogin && (
                  <div id="password-requirements">
                    <PasswordStrengthIndicator
                      password={password}
                      userInfo={{ email, displayName: username }}
                      onValidationChange={setPasswordValidation}
                    />
                    {passwordValidation && passwordValidation.errors.length > 0 && password.length > 0 && (
                      <p className="text-xs text-destructive mt-2" role="alert">
                        {passwordValidation.errors[0]}
                      </p>
                    )}
                  </div>
                )}
                
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => navigate('/auth/recovery')}
                    className="text-sm text-primary hover:underline min-h-[44px] touch-manipulation inline-flex items-center"
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full min-h-[44px] touch-manipulation" 
              disabled={loading || isPrivateMode || (!isLogin && !isForgotPassword && !passwordValidation?.isValid)}
            >
              {loading ? "Loading..." : isForgotPassword ? "Send Reset Link" : isLogin ? "Sign In" : "Sign Up"}
            </Button>
            {isPrivateMode && (
              <p className="text-sm text-destructive text-center mt-2">
                Private browsing mode detected. Please switch to standard mode to continue.
              </p>
            )}
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setIsForgotPassword(false);
              }}
              className="text-sm text-primary hover:underline min-h-[44px] touch-manipulation inline-flex items-center justify-center"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
            {isForgotPassword && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="block mx-auto mt-2 text-sm text-primary hover:underline min-h-[44px] touch-manipulation inline-flex items-center justify-center"
              >
                Back to sign in
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
