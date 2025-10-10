import { useState } from "react";
import { Button } from "@/components/ui/button";

const moods = [
  { emoji: "😊", label: "Great", color: "mint" },
  { emoji: "😌", label: "Good", color: "mint" },
  { emoji: "😐", label: "Okay", color: "lilac" },
  { emoji: "😔", label: "Low", color: "coral" },
  { emoji: "😢", label: "Struggling", color: "coral" },
];

export const Hero = () => {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center gradient-hero overflow-hidden">
      <div className="container px-4 md:px-6 relative z-10">
        <div className="flex flex-col items-center text-center space-y-8 max-w-3xl mx-auto">
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              How's your <span className="text-primary">vibe</span> today?
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
              Mental wellness made normal, safe, and even fun. Check in daily, reflect, and grow.
            </p>
          </div>

          <div className="w-full max-w-md space-y-6">
            <div className="flex justify-center gap-4 flex-wrap">
              {moods.map((mood, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedMood(index)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-smooth hover:scale-110 ${
                    selectedMood === index
                      ? "bg-card shadow-soft ring-2 ring-primary"
                      : "bg-card/50 shadow-card"
                  }`}
                >
                  <span className="text-4xl">{mood.emoji}</span>
                  <span className="text-sm font-medium">{mood.label}</span>
                </button>
              ))}
            </div>

            {selectedMood !== null && (
              <div className="animate-fade-in space-y-4">
                <p className="text-muted-foreground">
                  Thanks for sharing! Let's make today better together.
                </p>
                <Button variant="hero" size="lg" className="w-full">
                  Start Your Journey
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button variant="hero" size="lg">
              Get Started Free
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-mint/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-lilac/20 rounded-full blur-3xl animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-coral/20 rounded-full blur-3xl animate-pulse delay-1000" />
    </section>
  );
};
