import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Play, Calendar } from "lucide-react";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";

export const SaturdayTriviaCard = ({ userId, ageGroup }: { userId: string; ageGroup: string }) => {
  const navigate = useNavigate();
  const triviaEnabled = useFeatureFlag("ff.trivia");
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isWeekend, setIsWeekend] = useState(false);

  useEffect(() => {
    if (!triviaEnabled) {
      setLoading(false);
      return;
    }
    checkTriviaStatus();
  }, [userId, ageGroup, triviaEnabled]);

  const checkTriviaStatus = async () => {
    try {
      // Check if it's Saturday or Sunday
      const now = new Date();
      const day = now.getDay();
      setIsWeekend(day === 6 || day === 0); // 6 = Saturday, 0 = Sunday

      // Get current week's Saturday
      const currentDay = now.getDay();
      const daysUntilSaturday = (6 - currentDay + 7) % 7;
      const thisSaturday = new Date(now);
      thisSaturday.setDate(now.getDate() + daysUntilSaturday - (currentDay === 0 ? 7 : 0));
      thisSaturday.setHours(0, 0, 0, 0);
      
      const saturdayStr = thisSaturday.toISOString().split('T')[0];

      // Check if round exists
      const { data: round } = await supabase
        .from('trivia_rounds')
        .select('*')
        .eq('date', saturdayStr)
        .eq('age_group', ageGroup as 'child' | 'teen' | 'adult' | 'elder')
        .single();

      if (round) {
        setCurrentRound(round);

        // Check if user already played
        const { data: progress } = await supabase
          .from('trivia_progress')
          .select('streak')
          .eq('user_id', userId)
          .eq('round_id', round.id)
          .single();

        if (progress) {
          setHasPlayed(true);
          setStreak(progress.streak);
        } else {
          // Get latest streak
          const { data: latestProgress } = await supabase
            .from('trivia_progress')
            .select('streak')
            .eq('user_id', userId)
            .order('played_at', { ascending: false })
            .limit(1)
            .single();

          if (latestProgress) {
            setStreak(latestProgress.streak);
          }
        }
      }
    } catch (error) {
      console.error("Error checking trivia status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!triviaEnabled || loading) {
    return null;
  }

  // Always show the card
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle>Saturday Trivia 🎉</CardTitle>
          </div>
          {streak > 0 && (
            <Badge variant="secondary" className="gap-1">
              <span className="text-lg">🔥</span>
              {streak} week{streak !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <CardDescription>
          5 quick questions to play together
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentRound && isWeekend && !hasPlayed ? (
          <>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                What you'll learn:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Identifying and expressing feelings</li>
                <li>• Healthy coping strategies</li>
                <li>• Empathy and communication</li>
              </ul>
            </div>
            <Button 
              className="w-full"
              onClick={() => navigate('/trivia/sessions')}
            >
              <Play className="h-4 w-4 mr-2" />
              Play Now
            </Button>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/trivia/demo')}
            >
              Try Demo Version
            </Button>
          </>
        ) : currentRound && isWeekend && hasPlayed ? (
          <>
            <div className="text-center py-4">
              <Trophy className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
              <p className="font-semibold">Great job!</p>
              <p className="text-sm text-muted-foreground">
                Come back next Saturday for a new round.
              </p>
            </div>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/trivia/sessions')}
            >
              View Scoreboard
            </Button>
          </>
        ) : (
          <>
            <div className="text-center py-4">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Saturday Trivia opens every Saturday at midnight and runs through Sunday.
              </p>
              <p className="text-sm font-semibold mt-2">
                Check back this Saturday!
              </p>
            </div>
            <Button 
              className="w-full"
              onClick={() => navigate('/trivia/demo')}
            >
              <Play className="h-4 w-4 mr-2" />
              Run Full Demo Now
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
