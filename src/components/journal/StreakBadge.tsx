import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

export const StreakBadge = () => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateStreak();
  }, []);

  const calculateStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: entries } = await supabase
        .from("journal_entries")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (!entries || entries.length === 0) {
        setStreak(0);
        return;
      }

      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check each consecutive day
      for (let i = 0; i < entries.length; i++) {
        const entryDate = new Date(entries[i].date);
        entryDate.setHours(0, 0, 0, 0);
        
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - currentStreak);

        if (entryDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
        } else if (entryDate.getTime() < expectedDate.getTime()) {
          break;
        }
      }

      setStreak(currentStreak);
    } catch (error) {
      console.error("Error calculating streak:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (streak === 0) return null;

  return (
    <Badge variant="secondary" className="gap-1 text-base px-3 py-1">
      <Flame className="h-4 w-4 text-orange-500" />
      <span className="font-semibold">{streak}</span>
      <span className="text-muted-foreground">day streak</span>
    </Badge>
  );
};
