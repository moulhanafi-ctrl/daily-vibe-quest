import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Video, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface YouTubeBreakProps {
  userId: string;
  weekKey: string;
  breakPosition: number;
  onComplete: () => void;
  onResumeLater: () => void;
  isDemoMode?: boolean;
}

// Fallback video for when fetch fails
const FALLBACK_VIDEO = {
  videoId: 'inpok4MKVLM',
  title: 'Mindful Moment',
  channelTitle: 'Wellness Break',
  duration: 45,
};

export const YouTubeBreak = ({
  userId,
  weekKey,
  breakPosition,
  onComplete,
  onResumeLater,
  isDemoMode = false
}: YouTubeBreakProps) => {
  const { toast } = useToast();
  const [videoData, setVideoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [secondsWatched, setSecondsWatched] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadVideoData();
    if (!isDemoMode) {
      loadProgress();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadVideoData = async () => {
    try {
      const { data, error } = await supabase
        .from('trivia_break_videos')
        .select('*')
        .eq('week_key', weekKey)
        .eq('break_position', breakPosition)
        .single();

      if (error || !data) {
        console.warn('Using fallback video:', error);
        setVideoData({
          youtube_video_id: FALLBACK_VIDEO.videoId,
          title: FALLBACK_VIDEO.title,
          channel_name: FALLBACK_VIDEO.channelTitle,
          duration_seconds: FALLBACK_VIDEO.duration,
          tip_content: 'Take a moment to relax and center yourself.',
        });
      } else {
        // Extract video ID from URL if needed
        const videoId = data.youtube_video_id || extractVideoId(data.video_url);
        setVideoData({
          ...data,
          youtube_video_id: videoId,
        });
      }
    } catch (error) {
      console.error('Error loading video:', error);
      setVideoData({
        youtube_video_id: FALLBACK_VIDEO.videoId,
        title: FALLBACK_VIDEO.title,
        channel_name: FALLBACK_VIDEO.channelTitle,
        duration_seconds: FALLBACK_VIDEO.duration,
        tip_content: 'Take a moment to relax and center yourself.',
      });
    } finally {
      setLoading(false);
    }
  };

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

  const saveProgress = async (watched: number, completed: boolean) => {
    if (isDemoMode) return;

    try {
      await supabase
        .from('trivia_break_progress')
        .upsert({
          user_id: userId,
          week_key: weekKey,
          break_position: breakPosition,
          seconds_watched: watched,
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

  useEffect(() => {
    if (!videoData) return;

    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId: videoData.youtube_video_id,
        playerVars: {
          autoplay: 0,
          cc_load_policy: 1, // Captions on by default
          cc_lang_pref: 'en',
          modestbranding: 1,
          rel: 0,
          start: secondsWatched,
        },
        events: {
          onStateChange: onPlayerStateChange,
        },
      });
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoData]);

  const onPlayerStateChange = (event: any) => {
    if (event.data === (window as any).YT.PlayerState.PLAYING) {
      startTracking();
    } else {
      stopTracking();
    }

    if (event.data === (window as any).YT.PlayerState.ENDED) {
      const duration = videoData?.duration_seconds || 45;
      setSecondsWatched(duration);
      saveProgress(duration, true);
    }
  };

  const startTracking = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        const currentTime = Math.floor(playerRef.current.getCurrentTime());
        setSecondsWatched(currentTime);
        
        if (currentTime % 5 === 0) {
          const duration = videoData?.duration_seconds || 45;
          saveProgress(currentTime, currentTime >= duration);
        }
      }
    }, 1000);
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  };

  const handleComplete = () => {
    stopTracking();
    onComplete();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-3xl w-full">
          <CardContent className="p-12 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
            <p className="text-muted-foreground">Loading wellness break...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const duration = videoData?.duration_seconds || 45;
  const progress = (secondsWatched / duration) * 100;
  const remainingSeconds = Math.max(0, duration - secondsWatched);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            Wellness Break: {videoData.title}
          </CardTitle>
          <CardDescription>
            {videoData.channel_name && (
              <span className="text-sm">From {videoData.channel_name} • </span>
            )}
            {remainingSeconds > 0 ? `${remainingSeconds}s remaining` : 'Complete'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* YouTube Player */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            <div id="youtube-player" className="w-full h-full"></div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>

          {/* Content */}
          {videoData.tip_content && (
            <div className="bg-muted p-6 rounded-lg">
              <p className="text-lg mb-4">{videoData.tip_content}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <p className="italic">Informational only — this is not medical advice</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleComplete}
              disabled={!hasCompleted && secondsWatched < duration}
              className="flex-1"
              size="lg"
            >
              {hasCompleted || secondsWatched >= duration
                ? "Continue to Next Session"
                : `Watch ${Math.ceil(remainingSeconds)} more seconds to continue`}
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

function extractVideoId(url: string): string {
  const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/);
  return match ? match[1] : FALLBACK_VIDEO.videoId;
}
