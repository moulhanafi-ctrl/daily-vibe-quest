import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

interface FocusAreasPopupProps {
  userId: string;
  onClose: () => void;
}

export const FocusAreasPopup = ({ userId, onClose }: FocusAreasPopupProps) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadCurrentFocusAreas();
  }, [userId]);

  const loadCurrentFocusAreas = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("selected_focus_areas")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (data?.selected_focus_areas) {
        setSelected(data.selected_focus_areas);
      }
    } catch (error) {
      console.error("Error loading focus areas:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const toggleArea = (id: string) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      toast({ 
        title: "Please select at least one focus area",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ selected_focus_areas: selected })
        .eq("id", userId);

      if (error) throw error;

      toast({ title: "Focus areas updated! ✨" });
      onClose();
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

  if (initialLoading) {
    return null;
  }

  return (
    <div 
      className="animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-areas-title"
    >
      <Card className="shadow-[0_8px_32px_rgba(192,166,255,0.2)] border-[hsl(270,65%,75%)] backdrop-blur-sm bg-[hsl(30,40%,95%)]/95 dark:bg-[hsl(280,25%,12%)]/95">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle 
                id="focus-areas-title"
                className="text-xl bg-gradient-to-r from-[hsl(270,65%,75%)] to-[hsl(340,75%,70%)] bg-clip-text text-transparent"
              >
                Select Your Focus Areas ✨
              </CardTitle>
              <CardDescription>
                Choose areas where you'd like support
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              aria-label="Close focus areas"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FOCUS_AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => toggleArea(area.id)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                  "hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(122,241,199,0.3)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(180,70%,70%)] focus-visible:ring-offset-2",
                  selected.includes(area.id)
                    ? "border-[hsl(180,70%,70%)] bg-gradient-to-br from-[hsl(180,70%,70%)]/10 to-[hsl(270,65%,75%)]/10 shadow-[0_0_12px_rgba(122,241,199,0.4)] scale-105"
                    : "border-border/50 bg-card/50"
                )}
                tabIndex={0}
              >
                <span className="text-2xl animate-[emoji-pulse_2s_ease-in-out_infinite]">
                  {area.emoji}
                </span>
                <span className="font-semibold text-sm">{area.label}</span>
              </button>
            ))}
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Selected:</span>
              {selected.map(id => {
                const area = FOCUS_AREAS.find(a => a.id === id);
                return area ? (
                  <Badge 
                    key={id} 
                    variant="secondary"
                    className="bg-gradient-to-r from-[hsl(180,70%,70%)]/20 to-[hsl(270,65%,75%)]/20"
                  >
                    {area.emoji} {area.label}
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1 bg-gradient-to-r from-[hsl(180,70%,70%)] to-[hsl(270,65%,75%)] hover:opacity-90 transition-opacity"
              disabled={loading || selected.length === 0}
            >
              {loading ? "Saving..." : "Save Changes ✨"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};