import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";

interface FamilyScore {
  week: string;
  total_score: number;
  participants: number;
}

export const TriviaScoreboard = () => {
  const [scores, setScores] = useState<FamilyScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's family
      const { data: familyMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single();

      if (!familyMember) {
        setLoading(false);
        return;
      }

      // Get family scores
      const { data: familyScores } = await supabase
        .from('family_scores')
        .select(`
          total_score,
          participants,
          played_at,
          trivia_rounds!inner(date)
        `)
        .eq('family_id', familyMember.family_id)
        .order('played_at', { ascending: false })
        .limit(5);

      if (familyScores) {
        const formattedScores = familyScores.map((score: any) => ({
          week: new Date(score.trivia_rounds.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          total_score: score.total_score,
          participants: score.participants,
        }));
        setScores(formattedScores);
      }
    } catch (error) {
      console.error("Error loading family scores:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading scores...</div>;
  }

  if (scores.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No family scores yet</p>
        <p className="text-xs">Play together to start your family scoreboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scores.map((score, idx) => (
        <div 
          key={idx}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
              idx === 0 ? 'bg-yellow-500/20 text-yellow-700' : 'bg-muted'
            }`}>
              {idx === 0 ? <Trophy className="h-4 w-4" /> : <span className="text-sm">{idx + 1}</span>}
            </div>
            <div>
              <p className="font-semibold">{score.week}</p>
              <p className="text-xs text-muted-foreground">{score.participants} players</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-bold">
              {score.total_score} pts
            </Badge>
            {idx < scores.length - 1 && score.total_score > scores[idx + 1].total_score && (
              <TrendingUp className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};