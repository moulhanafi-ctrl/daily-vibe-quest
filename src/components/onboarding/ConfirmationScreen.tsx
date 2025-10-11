import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConfirmationScreenProps {
  firstName: string;
  focusAreas: string[];
  onComplete: () => void;
}

const FOCUS_AREA_LABELS: Record<string, string> = {
  depression: "😔 Depression",
  anxiety: "😰 Anxiety",
  grief: "💔 Grief / Loss",
  stress: "🧠 Stress / Overthinking",
  "self-esteem": "💬 Self-Esteem",
  relationships: "❤️ Relationships",
  loneliness: "🧍 Loneliness",
  pressure: "🎓 School or Work Pressure",
  family: "👨‍👩‍👧 Family Conflict",
  sleep: "💤 Sleep / Rest",
  motivation: "⚡ Motivation & Purpose",
};

export const ConfirmationScreen = ({ 
  firstName, 
  focusAreas, 
  onComplete 
}: ConfirmationScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-onboarding p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-8 pb-6 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              You're all set, {firstName}! 🎉
            </h1>
            <p className="text-lg text-muted-foreground">
              Your vibe journey begins now.
            </p>
          </div>

          {focusAreas.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-center">Your focus areas:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {focusAreas.map(area => (
                  <Badge key={area} variant="secondary" className="text-base px-4 py-2">
                    {FOCUS_AREA_LABELS[area] || area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-center pt-4">
            <Button 
              onClick={onComplete} 
              size="lg"
              className="px-8"
            >
              Start My First Mood Check-In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
