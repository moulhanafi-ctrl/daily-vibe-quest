import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

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

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
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
            <div className="flex justify-center gap-4 flex-wrap">
              {moods.map((mood, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedMood(index)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-smooth hover:scale-110 hover:-translate-y-1 active:scale-95 ${
                    selectedMood === index
                      ? "bg-card shadow-soft ring-2 ring-primary scale-105"
                      : "bg-card/80 backdrop-blur shadow-card"
                  }`}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  <span className="text-4xl transition-smooth hover:scale-125">{mood.emoji}</span>
                  <span className="text-sm font-medium">{mood.label}</span>
                </button>
              ))}
            </div>

            {selectedMood !== null && (
              <div className="animate-fade-in space-y-4">
                <p className="text-muted-foreground">
                  Thanks for sharing! Let's make today better together.
                </p>
                <Button variant="hero" size="lg" className="w-full" onClick={() => navigate("/auth")}>
                  Start Your Journey
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button variant="hero" size="lg" onClick={() => navigate("/auth")}>
              Get Started Free
            </Button>
            <Button variant="outline" size="lg" onClick={() => window.scrollTo({ top: document.getElementById('features')?.offsetTop || 0, behavior: 'smooth' })}>
              Learn More
            </Button>
          </div>
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
