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
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      
      if (prev.length >= 3) {
        toast({ 
          title: "Maximum 3 focus areas",
          description: "You can select up to 3 areas to focus on",
          variant: "destructive" 
        });
        return prev;
      }
      
      return [...prev, id];
    });
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
      className="animate-slide-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-areas-title"
    >
      <Card className="shadow-[0_8px_32px_rgba(192,166,255,0.2)] border-[hsl(270,65%,75%)] backdrop-blur-sm bg-[hsl(30,40%,95%)]/95 dark:bg-[hsl(280,25%,12%)]/95 rounded-2xl max-w-4xl mx-auto">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle 
                id="focus-areas-title"
                className="text-lg sm:text-xl bg-gradient-to-r from-[hsl(270,65%,75%)] to-[hsl(340,75%,70%)] bg-clip-text text-transparent font-semibold"
              >
                Select Your Focus Areas ✨
              </CardTitle>
              <CardDescription className="text-sm">
                Choose areas where you'd like support
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 p-0 flex-shrink-0 hover:bg-[hsl(270,65%,75%)]/10"
              aria-label="Close focus areas"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            {selected.length >= 3 && (
              <p className="text-xs text-muted-foreground text-center animate-fade-in">
                💡 Maximum 3 areas selected. Deselect one to choose another.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FOCUS_AREAS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => toggleArea(area.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 sm:p-3.5 rounded-xl border-2 transition-all duration-300 text-left min-h-[60px] touch-manipulation",
                    "active:scale-[0.98] sm:hover:scale-[1.02] sm:hover:shadow-[0_0_15px_rgba(122,241,199,0.3)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(180,70%,70%)] focus-visible:ring-offset-2",
                    selected.includes(area.id)
                      ? "border-[hsl(180,70%,70%)] bg-gradient-to-br from-[hsl(180,70%,70%)]/10 to-[hsl(270,65%,75%)]/10 shadow-[0_0_12px_rgba(122,241,199,0.4)] scale-[1.02]"
                      : selected.length >= 3
                      ? "border-border/30 bg-card/30 opacity-50 cursor-not-allowed"
                      : "border-border/50 bg-card/50"
                  )}
                  tabIndex={0}
                  disabled={!selected.includes(area.id) && selected.length >= 3}
                >
                  <span className="text-2xl sm:text-xl animate-[emoji-pulse_2s_ease-in-out_infinite] flex-shrink-0">
                    {area.emoji}
                  </span>
                  <span className="font-semibold text-base sm:text-sm">{area.label}</span>
                </button>
              ))}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground font-medium">Selected:</span>
              {selected.map(id => {
                const area = FOCUS_AREAS.find(a => a.id === id);
                return area ? (
                  <Badge 
                    key={id} 
                    variant="secondary"
                    className="bg-gradient-to-r from-[hsl(180,70%,70%)]/20 to-[hsl(270,65%,75%)]/20 text-sm py-1 px-2.5"
                  >
                    {area.emoji} {area.label}
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={handleSave} 
              className="w-full min-h-[44px] touch-manipulation bg-gradient-to-r from-[hsl(180,70%,70%)] to-[hsl(270,65%,75%)] hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(122,241,199,0.3)]"
              disabled={loading || selected.length === 0}
            >
              {loading ? "Saving..." : "Save Focus Areas ✨"}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              className="w-full min-h-[44px] touch-manipulation text-muted-foreground hover:text-foreground"
            >
              Skip for Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};