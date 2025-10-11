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
  { id: "depression", label: "Depression", emoji: "😔" },
  { id: "anxiety", label: "Anxiety", emoji: "😰" },
  { id: "grief", label: "Grief / Loss", emoji: "💔" },
  { id: "stress", label: "Stress / Overthinking", emoji: "🧠" },
  { id: "self-esteem", label: "Self-Esteem", emoji: "💬" },
  { id: "relationships", label: "Relationships", emoji: "❤️" },
  { id: "loneliness", label: "Loneliness", emoji: "🧍" },
  { id: "pressure", label: "School or Work Pressure", emoji: "🎓" },
  { id: "family", label: "Family Conflict", emoji: "👨‍👩‍👧" },
  { id: "sleep", label: "Sleep / Rest", emoji: "💤" },
  { id: "motivation", label: "Motivation & Purpose", emoji: "⚡" },
];

export const FocusAreaStep = ({ onNext, onBack }: FocusAreaStepProps) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleArea = (id: string) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (selected.length > 0) {
      onNext(selected);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Select Your Focus Areas</CardTitle>
          <CardDescription>
            Step 2 of 4 • Choose one or more areas where you'd like support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FOCUS_AREAS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => toggleArea(area.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
                    selected.includes(area.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{area.emoji}</span>
                  <span className="font-medium">{area.label}</span>
                </button>
              ))}
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Selected:</span>
                {selected.map(id => {
                  const area = FOCUS_AREAS.find(a => a.id === id);
                  return area ? (
                    <Badge key={id} variant="secondary">
                      {area.emoji} {area.label}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1"
                disabled={selected.length === 0}
              >
                Continue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
