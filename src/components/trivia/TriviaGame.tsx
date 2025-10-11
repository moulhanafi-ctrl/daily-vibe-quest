import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import confetti from "canvas-confetti";

interface Question {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string; emoji?: string }>;
  correct_option_id: string;
  explanation?: string;
  category: string;
}

interface TriviaGameProps {
  roundId: string;
  ageGroup: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const TriviaGame = ({ roundId, ageGroup, onComplete, onCancel }: TriviaGameProps) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selectedOptionId: string; correct: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data: round } = await supabase
        .from('trivia_rounds')
        .select('question_ids')
        .eq('id', roundId)
        .single();

      if (!round?.question_ids) {
        toast({
          title: "No questions found",
          description: "This round doesn't have questions yet",
          variant: "destructive",
        });
        onCancel();
        return;
      }

      const { data: questionsData } = await supabase
        .from('trivia_questions')
        .select('*')
        .in('id', round.question_ids)
        .eq('active', true);

      if (questionsData) {
        // Transform Json to proper Question type
        const transformedQuestions: Question[] = questionsData.map(q => ({
          id: q.id,
          prompt: q.prompt,
          options: Array.isArray(q.options) 
            ? q.options as Array<{ id: string; text: string; emoji?: string }>
            : [],
          correct_option_id: q.correct_option_id,
          explanation: q.explanation || undefined,
          category: q.category,
        }));
        setQuestions(transformedQuestions);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      toast({
        title: "Error loading questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = () => {
    if (!selectedOption) return;

    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedOption === currentQuestion.correct_option_id;
    
    if (isCorrect) {
      setScore(score + 10);
    }

    setAnswers([...answers, {
      questionId: currentQuestion.id,
      selectedOptionId: selectedOption,
      correct: isCorrect,
    }]);

    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      completeTrivia();
    }
  };

  const completeTrivia = async () => {
    try {
      const correctCount = answers.filter(a => a.correct).length + (selectedOption === questions[currentIndex].correct_option_id ? 1 : 0);
      
      const { data, error } = await supabase.functions.invoke('trivia-submit', {
        body: {
          roundId,
          answers,
          score,
          correct: correctCount,
          total: questions.length,
        }
      });

      if (error) throw error;

      // Celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      await trackEvent({
        eventType: "trivia_completed",
        metadata: {
          round_id: roundId,
          score,
          correct: correctCount,
          total: questions.length,
          age_group: ageGroup,
        },
      });

      if (data?.streak) {
        await trackEvent({
          eventType: "trivia_streak_updated",
          metadata: { streak: data.streak },
        });

        if (data.streak >= 3) {
          toast({
            title: `${data.streak} Week Streak! 🔥`,
            description: "Amazing consistency! Keep it up!",
          });
        }
      }

      onComplete();
    } catch (error) {
      console.error("Error submitting trivia:", error);
      toast({
        title: "Error saving results",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading questions...</div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p>No questions available</p>
            <Button onClick={onCancel} className="mt-4">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Exit
          </Button>
          <Badge variant="secondary">
            Question {currentIndex + 1} of {questions.length}
          </Badge>
        </div>

        <Progress value={progress} className="mb-6" />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">{currentQuestion.category}</Badge>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                Score: {score}
              </div>
            </div>
            <CardTitle className="text-2xl">{currentQuestion.prompt}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {currentQuestion.options.map((option) => (
                <Button
                  key={option.id}
                  variant={selectedOption === option.id ? "default" : "outline"}
                  className="h-auto py-4 px-6 text-left justify-start"
                  onClick={() => !showResult && setSelectedOption(option.id)}
                  disabled={showResult}
                >
                  <div className="flex items-center gap-3 w-full">
                    {option.emoji && <span className="text-2xl">{option.emoji}</span>}
                    <span className="flex-1">{option.text}</span>
                    {showResult && option.id === currentQuestion.correct_option_id && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {showResult && option.id === selectedOption && option.id !== currentQuestion.correct_option_id && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </Button>
              ))}
            </div>

            {showResult && currentQuestion.explanation && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-semibold mb-1">Explanation:</p>
                <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
              </div>
            )}

            <div className="flex gap-3">
              {!showResult && (
                <Button 
                  onClick={handleAnswer}
                  disabled={!selectedOption}
                  className="flex-1"
                  size="lg"
                >
                  Submit Answer
                </Button>
              )}
              {showResult && (
                <Button 
                  onClick={handleNext}
                  className="flex-1"
                  size="lg"
                >
                  {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};