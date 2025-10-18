import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { TrendingUp, Smile } from "lucide-react";

interface MoodEntry {
  mood: string;
  intensity: number;
  created_at: string;
}

export const WeeklyVibeChart = () => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageMood, setAverageMood] = useState(0);

  useEffect(() => {
    loadMoodData();
  }, []);

  const loadMoodData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get mood check-ins from the last 7 days
      const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
      
      const { data: moods, error } = await supabase
        .from("moods")
        .select("mood, intensity, created_at")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Create data structure for chart (one point per day)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = startOfDay(subDays(new Date(), 6 - i));
        return {
          date: format(date, "MMM dd"),
          fullDate: date,
          mood: 0,
          count: 0,
        };
      });

      // Map mood types to numeric values for charting
      const moodValues: Record<string, number> = {
        "sad": 1,
        "anxious": 2,
        "calm": 3,
        "happy": 4,
        "excited": 5,
      };

      // Aggregate mood data by day
      moods?.forEach((moodEntry: MoodEntry) => {
        const moodDate = startOfDay(new Date(moodEntry.created_at));
        const dayIndex = last7Days.findIndex(
          (day) => day.fullDate.getTime() === moodDate.getTime()
        );

        if (dayIndex !== -1) {
          const moodValue = moodValues[moodEntry.mood] || 3;
          last7Days[dayIndex].mood += moodValue;
          last7Days[dayIndex].count += 1;
        }
      });

      // Calculate averages and remove days with no data
      const chartData = last7Days.map((day) => ({
        date: day.date,
        mood: day.count > 0 ? Math.round((day.mood / day.count) * 10) / 10 : null,
      }));

      // Calculate overall average mood
      const validDays = chartData.filter((d) => d.mood !== null);
      const avg = validDays.length > 0
        ? validDays.reduce((sum, d) => sum + (d.mood || 0), 0) / validDays.length
        : 0;

      setChartData(chartData);
      setAverageMood(Math.round(avg * 10) / 10);
    } catch (error) {
      console.error("Error loading mood data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodLabel = (value: number) => {
    if (value >= 4.5) return "Great vibes! 🌟";
    if (value >= 3.5) return "Good mood 😊";
    if (value >= 2.5) return "Neutral 😐";
    if (value >= 1.5) return "Low mood 😔";
    return "Struggling 💙";
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Vibe Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading your vibe data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = chartData.some((d) => d.mood !== null);

  if (!hasData) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Vibe Chart
          </CardTitle>
          <CardDescription>
            Track your emotional wellness over the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground">
            <Smile className="h-12 w-12 mb-4 opacity-50" />
            <p>Start tracking your mood to see your weekly vibe chart!</p>
            <p className="text-sm mt-2">Check in daily to build your emotional wellness data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Vibe Chart
            </CardTitle>
            <CardDescription>Your mood journey over the last 7 days</CardDescription>
          </div>
          {averageMood > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold">{averageMood}</p>
              <p className="text-sm text-muted-foreground">{getMoodLabel(averageMood)}</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              domain={[0, 5]} 
              ticks={[1, 2, 3, 4, 5]}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: any) => {
                if (value === null) return ["No data", "Mood"];
                return [getMoodLabel(value), "Mood"];
              }}
            />
            <Area
              type="monotone"
              dataKey="mood"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fill="url(#moodGradient)"
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
          <div className="space-y-1">
            <div className="h-2 bg-red-500 rounded" />
            <span>Very Low</span>
          </div>
          <div className="space-y-1">
            <div className="h-2 bg-orange-500 rounded" />
            <span>Low</span>
          </div>
          <div className="space-y-1">
            <div className="h-2 bg-yellow-500 rounded" />
            <span>Neutral</span>
          </div>
          <div className="space-y-1">
            <div className="h-2 bg-green-500 rounded" />
            <span>Good</span>
          </div>
          <div className="space-y-1">
            <div className="h-2 bg-primary rounded" />
            <span>Great</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
