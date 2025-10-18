import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Trophy, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string;
}

export const StreakDisplay = () => {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setStreak(data);
    } catch (error) {
      console.error("Error loading streak:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc("update_user_streak", {
        p_user_id: user.id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        
        // Reload streak data
        await loadStreak();

        // Show confetti if badge earned
        if (result.badge_earned) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          
          // Award badge
          await awardBadge(result.current_streak);
        }
      }
    } catch (error) {
      console.error("Error updating streak:", error);
    }
  };

  const awardBadge = async (streakDays: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const badges: Record<number, { name: string; description: string; icon: string }> = {
      3: { name: "3-Day Starter", description: "Checked in for 3 days straight!", icon: "🔥" },
      7: { name: "7-Day Consistency", description: "A full week of wellness!", icon: "⭐" },
      14: { name: "2-Week Champion", description: "Two weeks of dedication!", icon: "🏆" },
      30: { name: "Monthly Warrior", description: "30 days of self-care!", icon: "💪" },
      60: { name: "60-Day Legend", description: "Two months of commitment!", icon: "👑" },
      100: { name: "Century Club", description: "100 days! You're unstoppable!", icon: "💎" },
    };

    const badge = badges[streakDays];
    if (!badge) return;

    await supabase.from("user_badges").insert({
      user_id: user.id,
      badge_type: "streak",
      badge_name: badge.name,
      badge_description: badge.description,
      icon: badge.icon,
    });
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            Check-In Streak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const nextMilestone = [3, 7, 14, 30, 60, 100].find((m) => m > currentStreak) || 100;

  return (
    <Card className="animate-fade-in relative overflow-hidden">
      {currentStreak >= 7 && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-full blur-3xl -z-10" />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            Check-In Streak
          </CardTitle>
          {currentStreak >= 7 && (
            <Badge variant="secondary" className="animate-pulse">
              On Fire! 🔥
            </Badge>
          )}
        </div>
        <CardDescription>Keep your wellness momentum going!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-lg">
            <div className="text-3xl font-bold text-orange-500">{currentStreak}</div>
            <p className="text-sm text-muted-foreground">Current Streak</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-3xl font-bold">
              <Trophy className="h-6 w-6 text-yellow-500" />
              {longestStreak}
            </div>
            <p className="text-sm text-muted-foreground">Best Streak</p>
          </div>
        </div>

        {currentStreak > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Next Milestone</span>
              <span className="font-semibold flex items-center gap-1">
                <Target className="h-4 w-4" />
                {nextMilestone} days
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500"
                style={{
                  width: `${Math.min((currentStreak / nextMilestone) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {nextMilestone - currentStreak} more {nextMilestone - currentStreak === 1 ? 'day' : 'days'} to unlock a badge!
            </p>
          </div>
        )}

        {currentStreak === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Start your wellness journey today!</p>
            <p className="text-xs mt-1">Check in to begin your streak 🎯</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
