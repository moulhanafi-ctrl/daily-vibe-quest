import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Flame, Tag, Calendar } from "lucide-react";

export const JournalProgress = () => {
  const [stats, setStats] = useState({
    streak: 0,
    totalEntries: 0,
    weeklyAvgMood: 0,
    topTags: [] as { tag: string; count: number }[],
    lastWeekCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all entries
      const { data: allEntries } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (!allEntries) return;

      // Calculate streak
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < allEntries.length; i++) {
        const entryDate = new Date(allEntries[i].date);
        entryDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === streak) {
          streak++;
        } else if (daysDiff > streak) {
          break;
        }
      }

      // Calculate last 7 days stats
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const lastWeekEntries = allEntries.filter(
        entry => new Date(entry.date) >= sevenDaysAgo
      );

      const avgMood = lastWeekEntries.length > 0
        ? lastWeekEntries.reduce((sum, e) => sum + (e.mood || 0), 0) / lastWeekEntries.length
        : 0;

      // Calculate top tags
      const tagCounts: { [key: string]: number } = {};
      allEntries.forEach(entry => {
        entry.tags?.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      const topTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        streak,
        totalEntries: allEntries.length,
        weeklyAvgMood: avgMood,
        topTags,
        lastWeekCount: lastWeekEntries.length,
      });
    } catch (error: any) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodEmoji = (mood: number) => {
    return ["😢", "😕", "😐", "🙂", "😊"][Math.round(mood) - 1] || "😐";
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading progress...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-2xl font-bold">{stats.streak}</span>
              </div>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalEntries}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">This Week</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Entries</span>
                <span className="font-medium">{stats.lastWeekCount}</span>
              </div>
              {stats.weeklyAvgMood > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Mood</span>
                  <span className="text-xl">{getMoodEmoji(stats.weeklyAvgMood)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {stats.topTags.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Top Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {stats.topTags.map(({ tag, count }) => (
                <Badge key={tag} variant="secondary">
                  {tag} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
