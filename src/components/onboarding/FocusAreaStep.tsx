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
    <div className="min-h-screen flex items-center justify-center bg-onboarding p-4">
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
                    area.color,
                    selected.includes(area.id)
                      ? "ring-2 ring-primary scale-105"
                      : ""
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
