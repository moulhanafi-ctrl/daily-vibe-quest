import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, RefreshCw } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface JournalPromptsProps {
  onSelectPrompt: (prompt: string) => void;
  limit?: number;
}

export const JournalPrompts = ({ onSelectPrompt, limit }: JournalPromptsProps) => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("age_group")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("journal_prompts")
        .select("*")
        .eq("age_group", profile.age_group)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Randomize and limit if specified
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      setPrompts(limit ? shuffled.slice(0, limit) : shuffled);
    } catch (error: any) {
      console.error("Error loading prompts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading prompts...</p>;
  }

  if (prompts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <CardTitle>Writing Prompts</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadPrompts}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {prompts.map((prompt) => (
            <Card
              key={prompt.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => {
                trackEvent({ 
                  eventType: "prompt_used", 
                  metadata: { category: prompt.category, prompt_id: prompt.id } 
                });
                onSelectPrompt(prompt.prompt);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm">{prompt.prompt}</p>
                    <Badge variant="outline" className="text-xs">
                      {prompt.category}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
