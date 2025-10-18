import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Award, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface UserBadge {
  id: string;
  badge_name: string;
  badge_description: string;
  earned_at: string;
  icon: string;
  badge_type: string;
}

const allPossibleBadges = [
  { name: "3-Day Starter", icon: "🔥", type: "streak", requirement: 3 },
  { name: "7-Day Consistency", icon: "⭐", type: "streak", requirement: 7 },
  { name: "2-Week Champion", icon: "🏆", type: "streak", requirement: 14 },
  { name: "Monthly Warrior", icon: "💪", type: "streak", requirement: 30 },
  { name: "60-Day Legend", icon: "👑", type: "streak", requirement: 60 },
  { name: "Century Club", icon: "💎", type: "streak", requirement: 100 },
  { name: "First Journal", icon: "📔", type: "journal", requirement: 1 },
  { name: "Reflection Master", icon: "✨", type: "journal", requirement: 10 },
  { name: "Mindful Writer", icon: "🧘", type: "journal", requirement: 30 },
  { name: "Family Care Champion", icon: "👨‍👩‍👧‍👦", type: "family", requirement: 1 },
  { name: "Community Helper", icon: "🤝", type: "community", requirement: 1 },
  { name: "Resource Explorer", icon: "🗺️", type: "help", requirement: 1 },
];

export const BadgesDisplay = () => {
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      setEarnedBadges(data || []);
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievement Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading badges...
          </div>
        </CardContent>
      </Card>
    );
  }

  const earnedBadgeNames = new Set(earnedBadges.map((b) => b.badge_name));

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Achievement Badges
            </CardTitle>
            <CardDescription>
              {earnedBadges.length} of {allPossibleBadges.length} unlocked
            </CardDescription>
          </div>
          {earnedBadges.length > 0 && (
            <Badge variant="secondary" className="text-lg">
              {earnedBadges.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {allPossibleBadges.map((badge) => {
            const earned = earnedBadges.find((eb) => eb.badge_name === badge.name);
            const isLocked = !earned;

            return (
              <div
                key={badge.name}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${
                    isLocked
                      ? "border-muted bg-muted/30 opacity-60"
                      : "border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 hover:scale-105"
                  }
                `}
              >
                {isLocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="text-center space-y-2">
                  <div className="text-4xl">{isLocked ? "🔒" : badge.icon}</div>
                  <div>
                    <p className="font-semibold text-sm">{badge.name}</p>
                    {earned && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(earned.earned_at), "MMM d, yyyy")}
                      </p>
                    )}
                    {isLocked && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {badge.type === "streak" && `${badge.requirement} day streak`}
                        {badge.type === "journal" && `${badge.requirement} entries`}
                        {badge.type === "family" && "Add family member"}
                        {badge.type === "community" && "Join a chat room"}
                        {badge.type === "help" && "Explore resources"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {earnedBadges.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Start your wellness journey to unlock badges!</p>
            <p className="text-sm mt-2">Check in daily, journal, and explore resources</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
