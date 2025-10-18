import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, CheckCircle2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import confetti from "canvas-confetti";
import { DEMO_TRIVIA_DATA } from "@/lib/demoTriviaData";
import { AnswerFeedback } from "@/components/trivia/AnswerFeedback";
import { YouTubeBreak } from "@/components/trivia/YouTubeBreak";
import { MotivationalQuote } from "@/components/trivia/MotivationalQuote";
import { soundEffects } from "@/lib/soundEffects";
import { TriviaSettings, type TriviaSettings as TriviaSettingsType } from "@/components/trivia/TriviaSettings";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface TriviaSession {
  id: string;
  week_key: string;
  topics: string[];
  session_1_questions: any;
  session_2_questions: any;
  session_3_questions: any;
}

interface BreakVideo {
  id: string;
  break_position: number;
  title: string;
  tip_content: string;
  duration_seconds: number;
  video_url: string;
}

interface SessionTriviaProps {
  mode?: 'auto' | 'demo' | 'live';
}

export default function SessionTrivia({ mode = 'auto' }: SessionTriviaProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Determine demo mode: explicit route > query param > localStorage > auto-detection
  const queryDemo = searchParams.get('demo') === 'true';
  const storedMode = typeof window !== 'undefined' ? localStorage.getItem('triviaMode') : null;
  const forceDemo = mode === 'demo' || queryDemo || storedMode === 'demo';
  const [isDemoMode, setIsDemoMode] = useState(forceDemo);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<TriviaSession | null>(null);
  const [breakVideos, setBreakVideos] = useState<BreakVideo[]>([]);
  const [currentSessionNum, setCurrentSessionNum] = useState(1);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [completedSessions, setCompletedSessions] = useState<number[]>([]);
  const [showingBreak, setShowingBreak] = useState(false);
  const [currentBreak, setCurrentBreak] = useState<BreakVideo | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showMotivation, setShowMotivation] = useState(false);
  const [settings, setSettings] = useState<TriviaSettingsType>({
    animations_enabled: true,
    sounds_enabled: false,
    haptics_enabled: false
  });

  useEffect(() => {
    loadTriviaSession();
  }, [mode, forceDemo]);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    loadUser();
  }, []);

  const loadTriviaSession = async () => {
    try {
      // Force demo mode if explicitly requested
      if (forceDemo) {
        console.log('Trivia mode: demo (forced)');
        setCurrentSession(DEMO_TRIVIA_DATA.session);
        setBreakVideos(DEMO_TRIVIA_DATA.breakVideos);
        setIsDemoMode(true);
        setLoading(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('triviaMode', 'demo');
        }
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get current week's Saturday
      const now = new Date();
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
      const thisSaturday = new Date(now);
      thisSaturday.setDate(now.getDate() + daysUntilSaturday);
      const weekKey = thisSaturday.toISOString().split('T')[0];

      // Get published session for this week
      const { data: session, error } = await supabase
        .from('trivia_weekly_sessions')
        .select('*')
        .eq('week_key', weekKey)
        .eq('status', 'published')
        .single();

      // Auto-fallback to demo if no live data available
      if (error || !session) {
        console.log('Trivia mode: demo (fallback - no live data)', { reason: error ? 'error' : 'empty' });
        setCurrentSession(DEMO_TRIVIA_DATA.session);
        setBreakVideos(DEMO_TRIVIA_DATA.breakVideos);
        setIsDemoMode(true);
        setLoading(false);
        return;
      }

      console.log('Trivia mode: live');
      if (typeof window !== 'undefined') {
        localStorage.setItem('triviaMode', 'live');
      }

      setCurrentSession(session);

      // Get break videos
      const { data: videos } = await supabase
        .from('trivia_break_videos')
        .select('*')
        .eq('week_key', weekKey)
        .order('break_position');

      if (videos) setBreakVideos(videos);

      // Check which sessions user has completed
      const { data: progress } = await supabase
        .from('trivia_session_progress')
        .select('session_number')
        .eq('user_id', user.id)
        .eq('week_key', weekKey);

      if (progress) {
        const completed = progress.map(p => p.session_number);
        setCompletedSessions(completed);
        
        // Start at first incomplete session
        if (completed.length < 3) {
          const nextSession = [1, 2, 3].find(s => !completed.includes(s)) || 1;
          setCurrentSessionNum(nextSession);
        }
      }

      await trackEvent({
        eventType: "trivia_round_opened",
        metadata: { week_key: weekKey, topics: session.topics },
      });

    } catch (error) {
      console.error("Error loading trivia session:", error);
      toast({
        title: "Error",
        description: "Failed to load trivia session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentQuestions = () => {
    if (!currentSession) return [];
    const questions = currentSessionNum === 1 ? currentSession.session_1_questions :
                      currentSessionNum === 2 ? currentSession.session_2_questions :
                      currentSession.session_3_questions;
    return Array.isArray(questions) ? questions : [];
  };

  const handleAnswerSubmit = () => {
    const questions = getCurrentQuestions();
    const currentQ = questions[currentQuestionIdx];
    const isCorrect = selectedAnswer === currentQ.correct;
    
    if (isCorrect) {
      setSessionScore(sessionScore + 10);
    }
    
    // Show visual feedback
    setFeedbackCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleFeedbackComplete = () => {
    setShowFeedback(false);
    setShowResult(true);
  };

  const handleNext = async () => {
    const questions = getCurrentQuestions();
    
    if (currentQuestionIdx < questions.length - 1) {
      // Next question in current session
      setCurrentQuestionIdx(currentQuestionIdx + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Session complete - show motivational quote first
      setShowMotivation(true);
      await saveSessionProgress();
      
      // Play session complete sound
      if (settings.sounds_enabled) {
        soundEffects.playSessionComplete();
      }
      
      // Small delay before moving to next step
      setTimeout(() => {
        if (currentSessionNum < 3) {
          // Show mental health break
          const breakVideo = breakVideos.find(v => v.break_position === currentSessionNum);
          if (breakVideo) {
            setCurrentBreak(breakVideo);
            setShowingBreak(true);
            setShowMotivation(false);
          } else {
            moveToNextSession();
          }
        } else {
          // All sessions complete!
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
          toast({
            title: "🎉 All Sessions Complete!",
            description: "Amazing work! See you next Saturday!",
          });
          setCompletedSessions([1, 2, 3]);
        }
      }, 3000);
    }
  };

  const saveSessionProgress = async () => {
    try {
      // Skip saving in demo mode
      if (isDemoMode) {
        setCompletedSessions([...completedSessions, currentSessionNum]);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentSession) return;

      await supabase
        .from('trivia_session_progress')
        .insert({
          user_id: user.id,
          week_key: currentSession.week_key,
          session_number: currentSessionNum,
          answers: [],
          score: sessionScore,
        });

      setCompletedSessions([...completedSessions, currentSessionNum]);
      
      await trackEvent({
        eventType: "trivia_completed",
        metadata: {
          week_key: currentSession.week_key,
          session_number: currentSessionNum,
          score: sessionScore,
        },
      });
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const moveToNextSession = () => {
    setCurrentSessionNum(currentSessionNum + 1);
    setCurrentQuestionIdx(0);
    setSessionScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowingBreak(false);
    setCurrentBreak(null);
    setShowMotivation(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading Saturday Trivia...</div>
      </div>
    );
  }

  // Show mental health break video
  if (showingBreak && currentBreak && userId) {
    return (
      <YouTubeBreak
        userId={userId}
        weekKey={currentSession?.week_key || ''}
        breakPosition={currentBreak.break_position}
        onComplete={moveToNextSession}
        onResumeLater={() => navigate('/dashboard')}
        isDemoMode={isDemoMode}
      />
    );
  }

  const questions = getCurrentQuestions();
  const currentQ = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Answer Feedback Overlay */}
        {showFeedback && (
          <AnswerFeedback
            isCorrect={feedbackCorrect}
            onComplete={handleFeedbackComplete}
            enabled={settings.animations_enabled}
            soundsEnabled={settings.sounds_enabled}
          />
        )}

        <div className="mb-6 flex items-center justify-between gap-4">
          {isDemoMode && (
            <Badge variant="secondary" className="flex-shrink-0">
              🎮 Demo Mode
            </Badge>
          )}
          <div className="flex gap-2 flex-1 justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
            <div className="flex gap-2">
              {!isDemoMode && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  type="button"
                  aria-label="Run Demo Version"
                  onClick={(e) => { e.stopPropagation?.(); navigate('/trivia/demo'); }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Try Demo Version
                </Button>
              )}
              {userId && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" type="button" aria-label="Settings">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Settings</SheetTitle>
                      <SheetDescription>
                        Customize your trivia experience
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      <TriviaSettings 
                        userId={userId}
                        onSettingsChange={setSettings}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(num => (
              <Badge 
                key={num}
                variant={completedSessions.includes(num) ? "default" : num === currentSessionNum ? "secondary" : "outline"}
              >
                {completedSessions.includes(num) ? <CheckCircle2 className="h-4 w-4" /> : `S${num}`}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">
              Session {currentSessionNum} • Question {currentQuestionIdx + 1} of {questions.length}
            </span>
            <span className="text-sm font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
              Score: {sessionScore}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {showMotivation && (
          <div className="mb-6">
            <MotivationalQuote score={sessionScore} total={questions.length} />
          </div>
        )}

        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit mb-2">{currentQ.category}</Badge>
            <CardTitle className="text-2xl">{currentQ.q}</CardTitle>
            <CardDescription>Difficulty: {currentQ.difficulty}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {currentQ.options?.map((option: string, idx: number) => (
                <Button
                  key={idx}
                  variant={selectedAnswer === option ? "default" : "outline"}
                  className="h-auto py-4 px-6 text-left justify-start"
                  onClick={() => !showResult && setSelectedAnswer(option)}
                  disabled={showResult}
                >
                  <span className="flex-1">{option}</span>
                  {showResult && option === currentQ.correct && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </Button>
              ))}
            </div>

            {showResult && currentQ.explanation && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-semibold mb-1">Explanation:</p>
                <p className="text-sm text-muted-foreground">{currentQ.explanation}</p>
              </div>
            )}

            <div className="flex gap-3">
              {!showResult && (
                <Button 
                  onClick={handleAnswerSubmit}
                  disabled={!selectedAnswer}
                  className="flex-1"
                  size="lg"
                >
                  Submit Answer
                </Button>
              )}
              {showResult && (
                <Button onClick={handleNext} className="flex-1" size="lg">
                  {currentQuestionIdx < questions.length - 1 ? "Next Question" : 
                   currentSessionNum < 3 ? "Finish Session" : "Complete Trivia!"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}