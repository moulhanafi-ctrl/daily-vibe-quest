import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Users, ArrowLeft, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { TriviaGame } from "@/components/trivia/TriviaGame";
import { TriviaScoreboard } from "@/components/trivia/TriviaScoreboard";

interface TriviaRound {
  id: string;
  date: string;
  age_group: string;
}

export default function Trivia() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const triviaEnabled = useFeatureFlag("ff.trivia");
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState<TriviaRound | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);

  useEffect(() => {
    loadTriviaState();
  }, []);

  const loadTriviaState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get user's age group
      const { data: profile } = await supabase
        .from('profiles')
        .select('age_group')
        .eq('id', user.id)
        .single();

      if (!profile) {
        toast({
          title: "Profile not found",
          description: "Please complete your profile first",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      setAgeGroup(profile.age_group);

      // Get current week's Saturday date
      const now = new Date();
      const currentDay = now.getDay();
      const daysUntilSaturday = (6 - currentDay + 7) % 7;
      const thisSaturday = new Date(now);
      thisSaturday.setDate(now.getDate() + daysUntilSaturday - (currentDay === 0 ? 7 : 0));
      thisSaturday.setHours(0, 0, 0, 0);
      
      const saturdayStr = thisSaturday.toISOString().split('T')[0];

      // Check if round exists for this week
      const { data: round } = await supabase
        .from('trivia_rounds')
        .select('*')
        .eq('date', saturdayStr)
        .eq('age_group', profile.age_group)
        .single();

      if (round) {
        setCurrentRound(round);

        // Check if user already played this round
        const { data: progress } = await supabase
          .from('trivia_progress')
          .select('id')
          .eq('user_id', user.id)
          .eq('round_id', round.id)
          .single();

        setHasPlayed(!!progress);
      }

      await trackEvent({
        eventType: "trivia_round_opened",
        metadata: {
          age_group: profile.age_group,
          has_round: !!round,
        },
      });

    } catch (error) {
      console.error("Error loading trivia:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayComplete = () => {
    setPlaying(false);
    setHasPlayed(true);
    loadTriviaState();
  };

  if (!triviaEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Trivia feature is not available</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (playing && currentRound) {
    return (
      <TriviaGame 
        roundId={currentRound.id}
        ageGroup={ageGroup || 'adult'}
        onComplete={handlePlayComplete}
        onCancel={() => setPlaying(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')} 
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Saturday Trivia 🎉</h1>
            <p className="text-muted-foreground">
              Weekly family fun about feelings, coping, and connection
            </p>
          </div>

          {!currentRound && (
            <Card>
              <CardHeader>
                <CardTitle>No Round Available</CardTitle>
                <CardDescription>
                  Saturday Trivia opens every Saturday at midnight and runs through Sunday.
                  Check back this Saturday!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                  <span>Next round: This Saturday</span>
                </div>
              </CardContent>
            </Card>
          )}

          {currentRound && !hasPlayed && (
            <Card className="border-primary shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">This Week's Challenge</CardTitle>
                    <CardDescription>5-7 questions • Takes ~5 minutes</CardDescription>
                  </div>
                  <Badge variant="default" className="text-lg px-4 py-2">
                    <Play className="h-5 w-5 mr-2" />
                    Ready to Play
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">What you'll learn:</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Identifying and expressing feelings</li>
                    <li>Healthy coping strategies</li>
                    <li>Empathy and communication</li>
                    <li>Building stronger connections</li>
                  </ul>
                </div>
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => {
                    setPlaying(true);
                    trackEvent({
                      eventType: "trivia_started",
                      metadata: { round_id: currentRound.id, age_group: ageGroup },
                    });
                  }}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Playing
                </Button>
              </CardContent>
            </Card>
          )}

          {currentRound && hasPlayed && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  You've Completed This Week!
                </CardTitle>
                <CardDescription>
                  Great job! Check back next Saturday for a new round.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Family Scoreboard
                </CardTitle>
                <CardDescription>Private family-only scores</CardDescription>
              </CardHeader>
              <CardContent>
                <TriviaScoreboard />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Streak</CardTitle>
                <CardDescription>Keep playing weekly to build your streak</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-6xl font-bold text-primary mb-2">🔥</div>
                  <p className="text-muted-foreground text-sm">Play this week to start your streak!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}