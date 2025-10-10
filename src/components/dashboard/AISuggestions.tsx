import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AISuggestionsProps {
  userId: string;
}

export const AISuggestions = ({ userId }: AISuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [userId]);

  const loadSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_suggestions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    setGenerating(true);
    try {
      // Get recent moods for context
      const { data: moods } = await supabase
        .from("moods")
        .select("mood, intensity, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(7);

      const { data, error } = await supabase.functions.invoke("generate-ai-suggestions", {
        body: { userId, moods },
      });

      if (error) throw error;

      toast({ title: "New suggestions generated!" });
      loadSuggestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const markAsRead = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from("ai_suggestions")
        .update({ is_read: true })
        .eq("id", suggestionId);

      if (error) throw error;
      loadSuggestions();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Personalized Suggestions
            </CardTitle>
            <CardDescription>
              Based on your mood patterns and wellness journey
            </CardDescription>
          </div>
          <Button onClick={generateSuggestions} disabled={generating} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            Generate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No AI suggestions yet. Click Generate to get personalized recommendations!
            </p>
            <Button onClick={generateSuggestions} disabled={generating}>
              {generating ? "Generating..." : "Get Suggestions"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`p-4 rounded-lg border transition-colors ${
                  suggestion.is_read ? "bg-muted/50" : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2 capitalize">
                      {suggestion.suggestion_type.replace("_", " ")}
                    </h3>
                    <p className="text-sm">{suggestion.content}</p>
                  </div>
                  {!suggestion.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(suggestion.id)}
                    >
                      Mark Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
