import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FocusAreaStepProps {
  onNext: (focusAreas: string[]) => void;
  onBack: () => void;
}

const FOCUS_AREAS = [
  { id: "depression", label: "Depression", emoji: "😔", color: "bg-blue-100 border-blue-300 hover:border-blue-400" },
  { id: "anxiety", label: "Anxiety", emoji: "😰", color: "bg-purple-100 border-purple-300 hover:border-purple-400" },
  { id: "grief", label: "Grief / Loss", emoji: "💔", color: "bg-pink-100 border-pink-300 hover:border-pink-400" },
  { id: "stress", label: "Stress / Overthinking", emoji: "🧠", color: "bg-indigo-100 border-indigo-300 hover:border-indigo-400" },
  { id: "self-esteem", label: "Self-Esteem", emoji: "💬", color: "bg-cyan-100 border-cyan-300 hover:border-cyan-400" },
  { id: "relationships", label: "Relationships", emoji: "❤️", color: "bg-rose-100 border-rose-300 hover:border-rose-400" },
  { id: "loneliness", label: "Loneliness", emoji: "🧍", color: "bg-amber-100 border-amber-300 hover:border-amber-400" },
  { id: "pressure", label: "School or Work Pressure", emoji: "🎓", color: "bg-emerald-100 border-emerald-300 hover:border-emerald-400" },
  { id: "family", label: "Family Conflict", emoji: "👨‍👩‍👧", color: "bg-orange-100 border-orange-300 hover:border-orange-400" },
  { id: "sleep", label: "Sleep / Rest", emoji: "💤", color: "bg-sky-100 border-sky-300 hover:border-sky-400" },
  { id: "motivation", label: "Motivation & Purpose", emoji: "⚡", color: "bg-yellow-100 border-yellow-300 hover:border-yellow-400" },
];

export const FocusAreaStep = ({ onNext, onBack }: FocusAreaStepProps) => {
  const [selected, setSelected] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const selectArea = (id: string) => {
    setSelected(id);
  };

  const handleSubmit = async () => {
    if (selected) {
      setIsLoading(true);
      // Save focus area to profile and pass to next step
      onNext([selected]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-onboarding p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Select Your Focus Area</CardTitle>
          <CardDescription>
            Step 2 of 4 • Choose the main area where you'd like support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FOCUS_AREAS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => selectArea(area.id)}
                  disabled={isLoading}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                    area.color,
                    selected === area.id
                      ? "ring-2 ring-primary scale-105"
                      : "",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="text-2xl">{area.emoji}</span>
                  <span className="font-medium flex-1">{area.label}</span>
                  {selected === area.id && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {selected && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                <span className="text-sm text-muted-foreground">Selected:</span>
                {(() => {
                  const area = FOCUS_AREAS.find(a => a.id === selected);
                  return area ? (
                    <Badge variant="secondary">
                      {area.emoji} {area.label}
                    </Badge>
                  ) : null;
                })()}
              </div>
            )}

            {isLoading && (
              <div className="text-center text-sm text-muted-foreground animate-pulse">
                🌟 Setting up your support community...
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onBack} 
                disabled={isLoading}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1"
                disabled={!selected || isLoading}
              >
                {isLoading ? "Setting up..." : "Continue"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};