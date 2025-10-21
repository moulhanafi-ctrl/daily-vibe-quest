import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Settings } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";
import vibeCheckLogo from "@/assets/vibe-check-logo.png";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { trackEvent } from "@/lib/analytics";

const moods = [
  { emoji: "😊", label: "Great", color: "mint" },
  { emoji: "😌", label: "Good", color: "mint" },
  { emoji: "😐", label: "Okay", color: "lilac" },
  { emoji: "😔", label: "Low", color: "coral" },
  { emoji: "😢", label: "Struggling", color: "coral" },
];

export const Hero = () => {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const { isAdmin } = useAdminCheck();

  const handleMoodClick = (index: number, moodLabel: string) => {
    setSelectedMood(index);
    trackEvent({
      eventType: "homepage_mood_click",
      metadata: { mood: moodLabel, mood_index: index }
    });
  };

  const handleTrialCTAClick = () => {
    trackEvent({
      eventType: "homepage_trial_cta_click",
      metadata: { from_mood: selectedMood !== null ? moods[selectedMood].label : "unknown" }
    });
    navigate("/auth");
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Admin Link */}
      {isAdmin && (
        <div className="absolute top-4 right-4 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Admin
          </Button>
        </div>
      )}
      
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      </div>

      <div className="container px-4 md:px-6 relative z-10">
        <div className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 animate-fade-in">
            <img 
              src={vibeCheckLogo} 
              alt="Daily Vibe Check Logo" 
              className="w-16 h-16 md:w-20 md:h-20"
              width="80"
              height="80"
              loading="eager"
              fetchPriority="high"
            />
          </div>
          
          <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur px-4 py-2 rounded-full shadow-soft animate-fade-in border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary animate-pulse-soft" />
            <span className="text-sm font-medium">Your daily check-in awaits</span>
          </div>

          <div className="space-y-4 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              How's your <span className="text-primary animate-pulse-soft">vibe</span> today?
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
              Mental wellness made normal, safe, and even fun. Check in daily, reflect, and grow.
            </p>
          </div>

          <div className="w-full max-w-md space-y-6 animate-slide-up">
            {selectedMood === null ? (
              <div className="flex justify-center gap-4 flex-wrap" role="group" aria-label="Select your current mood">
                {moods.map((mood, index) => (
                  <button
                    key={index}
                    onClick={() => handleMoodClick(index, mood.label)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-smooth hover:scale-110 hover:-translate-y-1 active:scale-95 bg-card/80 backdrop-blur shadow-card"
                    style={{
                      animationDelay: `${index * 0.1}s`,
                    }}
                    aria-label={`Select ${mood.label} mood`}
                  >
                    <span className="text-4xl transition-smooth hover:scale-125" aria-hidden="true">{mood.emoji}</span>
                    <span className="text-sm font-medium">{mood.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="animate-fade-in space-y-4">
                <Button 
                  type="button"
                  size="lg" 
                  className="w-full min-h-[72px] text-2xl md:text-3xl font-bold touch-manipulation bg-gradient-to-r from-primary via-primary/90 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 shadow-[0_8px_32px_hsl(var(--primary)/0.4)] hover:shadow-[0_12px_48px_hsl(var(--primary)/0.6)] transition-all duration-300 animate-pulse-soft" 
                  onClick={handleTrialCTAClick}
                  onTouchStart={handleTrialCTAClick}
                  aria-label="Start your 7-day free trial"
                >
                  Start Your 7-Day Free Trial Now
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 w-full max-w-md">
            <Button 
              type="button"
              variant="signup" 
              size="lg" 
              onClick={() => navigate("/auth")}
              onTouchStart={() => navigate("/auth")}
              className="flex-1 min-h-[52px] text-base font-semibold animate-[signup-pulse_2s_ease-in-out_infinite_alternate] shadow-[var(--shadow-signup)] hover:shadow-[0_0_20px_hsl(340,75%,70%,0.5),0_0_35px_hsl(270,65%,75%,0.25)] touch-manipulation"
              aria-label="Sign up for Vibe Check"
            >
              Get Started Free
            </Button>
            <Button 
              type="button"
              variant="login" 
              size="lg" 
              onClick={() => navigate("/auth")}
              onTouchStart={() => navigate("/auth")}
              className="flex-1 min-h-[52px] text-base font-semibold animate-[login-pulse_2s_ease-in-out_infinite_alternate] shadow-[var(--shadow-login)] hover:shadow-[0_0_18px_hsl(270,65%,75%,0.5),0_0_30px_hsl(340,75%,70%,0.25)] touch-manipulation"
              aria-label="Log in to Vibe Check"
            >
              Log In
            </Button>
          </div>
          
          {/* $1 Test Product Button */}
          <div className="pt-4 w-full max-w-md">
            <Button
              type="button"
              size="lg"
              onClick={() => window.open("https://buy.stripe.com/6oUcN5guibSD9ZRbv5dnW00", "_blank")}
              onTouchStart={() => window.open("https://buy.stripe.com/6oUcN5guibSD9ZRbv5dnW00", "_blank")}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all touch-manipulation"
              aria-label="Buy $1 test product"
            >
              🎉 Buy Now – $1 Test Product
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Try our store with a $1 test purchase
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground pt-2">
            Free forever • No credit card required • 2-minute setup
          </p>
        </div>
      </div>

      {/* Decorative floating elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-mint/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-lilac/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/4 w-36 h-36 bg-coral/30 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-1/4 left-1/2 w-28 h-28 bg-primary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
    </section>
  );
};
