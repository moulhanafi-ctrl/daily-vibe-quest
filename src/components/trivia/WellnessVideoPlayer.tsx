import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Video, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WellnessVideoPlayerProps {
  userId: string;
  weekKey: string;
  breakPosition: number;
  title: string;
  content: string;
  durationSeconds: number;
  videoUrl: string;
  onComplete: () => void;
  onResumeLater: () => void;
  isDemoMode?: boolean;
}

export const WellnessVideoPlayer = ({
  userId,
  weekKey,
  breakPosition,
  title,
  content,
  durationSeconds,
  videoUrl,
  onComplete,
  onResumeLater,
  isDemoMode = false
}: WellnessVideoPlayerProps) => {
  const { toast } = useToast();
  const [secondsWatched, setSecondsWatched] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isDemoMode) {
      loadProgress();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isDemoMode && secondsWatched > 0 && secondsWatched % 5 === 0) {
      saveProgress();
    }
  }, [secondsWatched]);

  const loadProgress = async () => {
    try {
      const { data } = await supabase
        .from('trivia_break_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('week_key', weekKey)
        .eq('break_position', breakPosition)
        .single();

      if (data) {
        setSecondsWatched(data.seconds_watched);
        setHasCompleted(data.completed);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveProgress = async () => {
    if (isDemoMode) return;

    try {
      const completed = secondsWatched >= durationSeconds;
      await supabase
        .from('trivia_break_progress')
        .upsert({
          user_id: userId,
          week_key: weekKey,
          break_position: breakPosition,
          seconds_watched: secondsWatched,
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,week_key,break_position'
        });

      if (completed && !hasCompleted) {
        setHasCompleted(true);
        toast({
          title: "Break Complete!",
          description: "You can now continue to the next session"
        });
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setSecondsWatched(prev => {
          const next = prev + 1;
          if (next >= durationSeconds) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsPlaying(false);
            return durationSeconds;
          }
          return next;
        });
      }, 1000);
    }
  };

  const handleComplete = async () => {
    if (!isDemoMode) {
      await saveProgress();
    }
    onComplete();
  };

  const progress = (secondsWatched / durationSeconds) * 100;
  const remainingSeconds = durationSeconds - secondsWatched;
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecondsDisplay = remainingSeconds % 60;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            Wellness Break: {title}
          </CardTitle>
          <CardDescription>
            {remainingMinutes > 0 ? `${remainingMinutes}m ${remainingSecondsDisplay}s remaining` : `${remainingSecondsDisplay}s remaining`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Player Placeholder */}
          <div className="bg-muted rounded-lg aspect-video flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
            <Button
              size="lg"
              variant="secondary"
              onClick={togglePlay}
              className="relative z-10"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-6 w-6 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-6 w-6 mr-2" />
                  Play
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>

          {/* Content */}
          <div className="bg-muted p-6 rounded-lg">
            <p className="text-lg mb-4">{content}</p>
            <p className="text-sm text-muted-foreground italic">
              Informational only — this is not medical advice
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleComplete}
              disabled={!hasCompleted && secondsWatched < durationSeconds}
              className="flex-1"
              size="lg"
            >
              {hasCompleted || secondsWatched >= durationSeconds
                ? "Continue to Next Session"
                : `Watch ${Math.ceil(remainingSeconds / 60)} more minutes to continue`}
            </Button>
            <Button
              variant="outline"
              onClick={onResumeLater}
              size="lg"
            >
              Resume Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
