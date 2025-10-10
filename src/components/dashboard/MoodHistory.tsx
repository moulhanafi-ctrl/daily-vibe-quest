import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  anxious: "😰",
  sad: "😢",
  angry: "😠",
  excited: "🤩",
  tired: "😴",
};

interface MoodHistoryProps {
  userId: string;
}

export const MoodHistory = ({ userId }: MoodHistoryProps) => {
  const [moods, setMoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMoods();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("mood-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "moods",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadMoods();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadMoods = async () => {
    try {
      const { data, error } = await supabase
        .from("moods")
        .select(`
          *,
          reflections (*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setMoods(data || []);
    } catch (error) {
      console.error("Error loading moods:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Mood Journey</CardTitle>
        <CardDescription>Track how you've been feeling over time</CardDescription>
      </CardHeader>
      <CardContent>
        {moods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No mood check-ins yet. Start by checking in your mood!
          </div>
        ) : (
          <div className="space-y-4">
            {moods.map((mood) => (
              <div
                key={mood.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="text-4xl">{MOOD_EMOJIS[mood.mood]}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize">{mood.mood}</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(mood.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Intensity: {mood.intensity}/5
                  </div>
                  {mood.reflections?.length > 0 && (
                    <div className="text-sm mt-2 p-3 bg-muted/50 rounded">
                      {mood.reflections[0].content}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
