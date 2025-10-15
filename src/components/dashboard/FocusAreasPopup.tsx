import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { slugForId } from "@/lib/focusAreas";

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
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

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
      if (data?.selected_focus_areas && data.selected_focus_areas.length > 0) {
        setSelected(data.selected_focus_areas[0]);
      }
    } catch (error) {
      console.error("Error loading focus areas:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const selectArea = (id: string) => {
    setSelected(id);
  };

  const handleSave = async () => {
    if (!selected) {
      toast({ 
        title: "Please select a focus area",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      // Update user's selected focus areas
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ selected_focus_areas: [selected] })
        .eq("id", userId);

      if (updateError) throw updateError;

      const selectedArea = FOCUS_AREAS.find(a => a.id === selected);
      
      // Track the event
      trackEvent({ 
        eventType: "focus_area_changed", 
        metadata: { 
          new_focus_area: selected
        } 
      });

      toast({ 
        title: "Joining your support chat...",
        description: `Taking you to ${selectedArea?.label}`
      });
      
      onClose();
      
      // Navigate to the chat room using focus area slug
      navigate(`/chat-rooms/${slugForId(selected)}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
                Select Your Focus Area ✨
              </CardTitle>
              <CardDescription className="text-sm">
                Choose the main area where you'd like support
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="h-10 w-10 p-0 flex-shrink-0 hover:bg-[hsl(270,65%,75%)]/10"
              aria-label="Close focus areas"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FOCUS_AREAS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => selectArea(area.id)}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-3 p-4 sm:p-3.5 rounded-xl border-2 transition-all duration-300 text-left min-h-[60px] touch-manipulation",
                    "active:scale-[0.98] sm:hover:scale-[1.02] sm:hover:shadow-[0_0_15px_rgba(122,241,199,0.3)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(180,70%,70%)] focus-visible:ring-offset-2",
                    selected === area.id
                      ? "border-[hsl(180,70%,70%)] bg-gradient-to-br from-[hsl(180,70%,70%)]/10 to-[hsl(270,65%,75%)]/10 shadow-[0_0_12px_rgba(122,241,199,0.4)] scale-[1.02]"
                      : "border-border/50 bg-card/50",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                  tabIndex={0}
                >
                  <span className="text-2xl sm:text-xl animate-[emoji-pulse_2s_ease-in-out_infinite] flex-shrink-0">
                    {area.emoji}
                  </span>
                  <span className="font-semibold text-base sm:text-sm flex-1">{area.label}</span>
                  {selected === area.id && (
                    <div className="w-5 h-5 rounded-full bg-[hsl(180,70%,70%)] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="flex flex-wrap gap-2 items-center p-3 bg-gradient-to-r from-[hsl(180,70%,70%)]/10 to-[hsl(270,65%,75%)]/10 rounded-lg">
              <span className="text-sm text-muted-foreground font-medium">Selected:</span>
              {(() => {
                const area = FOCUS_AREAS.find(a => a.id === selected);
                return area ? (
                  <Badge 
                    variant="secondary"
                    className="bg-gradient-to-r from-[hsl(180,70%,70%)]/20 to-[hsl(270,65%,75%)]/20 text-sm py-1 px-2.5"
                  >
                    {area.emoji} {area.label}
                  </Badge>
                ) : null;
              })()}
            </div>
          )}

          {loading && (
            <div className="text-center text-sm text-muted-foreground py-2 animate-pulse">
              🌟 Joining your support chat...
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <Button 
              onClick={handleSave} 
              className="w-full min-h-[44px] touch-manipulation bg-gradient-to-r from-[hsl(180,70%,70%)] to-[hsl(270,65%,75%)] hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(122,241,199,0.3)]"
              disabled={loading || !selected}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Chat ✨"
              )}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              disabled={loading}
              className="w-full min-h-[44px] touch-manipulation text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};