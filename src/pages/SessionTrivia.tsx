import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, Video, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import confetti from "canvas-confetti";

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

export default function SessionTrivia() {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  useEffect(() => {
    loadTriviaSession();
  }, []);

  const loadTriviaSession = async () => {
    try {
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

      if (error || !session) {
        console.log('No published session found');
        setLoading(false);
        return;
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
      // Session complete
      await saveSessionProgress();
      
      if (currentSessionNum < 3) {
        // Show mental health break
        const breakVideo = breakVideos.find(v => v.break_position === currentSessionNum);
        if (breakVideo) {
          setCurrentBreak(breakVideo);
          setShowingBreak(true);
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
    }
  };

  const saveSessionProgress = async () => {
    try {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading Saturday Trivia...</div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>No Trivia Available Yet</CardTitle>
              <CardDescription>
                Saturday Trivia publishes every Saturday at 7:00 PM EST. Check back then!
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // Show mental health break video
  if (showingBreak && currentBreak) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              Mental Health Break: {currentBreak.title}
            </CardTitle>
            <CardDescription>Take a {currentBreak.duration_seconds} second break</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-6 rounded-lg text-center">
              <p className="text-lg mb-4">{currentBreak.tip_content}</p>
              <p className="text-sm text-muted-foreground italic">
                Informational only — this is not medical advice
              </p>
            </div>
            <Button onClick={moveToNextSession} size="lg" className="w-full">
              Continue to Session {currentSessionNum + 1}
            </Button>
            <Button variant="outline" onClick={() => setShowingBreak(false)} className="w-full">
              Replay Break
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = getCurrentQuestions();
  const currentQ = questions[currentQuestionIdx];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit
          </Button>
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
            <span className="text-sm text-muted-foreground">
              Session {currentSessionNum} - Question {currentQuestionIdx + 1}/{questions.length}
            </span>
            <span className="text-sm font-semibold">Score: {sessionScore}</span>
          </div>
          <Progress value={progress} />
        </div>

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