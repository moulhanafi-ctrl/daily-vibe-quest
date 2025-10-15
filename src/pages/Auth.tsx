import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import vibeCheckLogo from "@/assets/vibe-check-logo.png";
import { z } from "zod";

// SECURITY: Input validation schema for signup
const SignupSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .trim(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be less than 72 characters"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores")
    .trim(),
  ageGroup: z.enum(["child", "teen", "adult", "elder"]),
});

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [ageGroup, setAgeGroup] = useState<"child" | "teen" | "adult">("adult");
  const [loading, setLoading] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState(false);

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
    const checkAuthAndLanguage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Check if user has language preference and onboarding status
        const { data: profile } = await supabase
          .from('profiles')
          .select('language, selected_focus_areas, username')
          .eq('id', session.user.id)
          .single();

        if (!profile?.language) {
          navigate('/welcome/language');
        } else if (!profile?.selected_focus_areas || profile.selected_focus_areas.length === 0) {
          navigate('/onboarding');
        } else {
          // Show welcome back message
          toast({ 
            title: `Welcome back, ${profile.username || 'friend'}!`,
            description: "Good to see you again."
          });
          navigate('/dashboard');
        }
      }
    };

    checkAuthAndLanguage();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkAuthAndLanguage();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Fetch user profile for welcome message
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', data.user.id)
            .single();
          
          toast({ 
            title: `Welcome back, ${profile?.username || 'friend'}!`,
            description: "Good to see you again."
          });
        }
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
        toast({ title: "Account created! Let's personalize your experience." });
        navigate("/onboarding");
      }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
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
              disabled={loading || isPrivateMode}
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
