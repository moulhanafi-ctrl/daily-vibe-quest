import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InclusionBanner } from "@/components/InclusionBanner";
import { Heart, BookOpen, Users, TrendingUp } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface OnboardingOverviewProps {
  onStart: () => void;
}

export const OnboardingOverview = ({ onStart }: OnboardingOverviewProps) => {
  const handleStart = () => {
    trackEvent({ eventType: "onboarding_viewed", metadata: { step: "overview" } });
    onStart();
  };

  const steps = [
    {
      icon: Heart,
      title: "Check In",
      description: "Log your vibe daily. Quick, private, just for you.",
    },
    {
      icon: BookOpen,
      title: "Reflect",
      description: "Write or voice journal. Two lines is plenty. Future-you will thank you.",
    },
    {
      icon: Users,
      title: "Connect",
      description: "Join safe, moderated rooms with peers who get it.",
    },
    {
      icon: TrendingUp,
      title: "Grow",
      description: "See progress, get daily nudges from Arthur, stay consistent.",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-onboarding p-4">
      <div className="w-full max-w-4xl space-y-6">
        <InclusionBanner compact />
        
        <Card className="border-primary/20">
          <CardContent className="pt-8 pb-6 space-y-8">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Welcome to Vibe Check 👋
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Your mental health journey starts here. Four simple steps to build your daily practice.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <Card key={idx} className="border-border/50 hover:border-primary/30 transition-colors">
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h3 className="font-semibold text-base">{step.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleStart}
                size="lg"
                className="px-8"
              >
                Start My First Vibe Check
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
