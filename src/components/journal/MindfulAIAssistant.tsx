import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface JournalPrompt {
  prompt: string;
  focus_area: string;
}

interface MindfulAIAssistantProps {
  currentMood?: string;
  onPromptSelect?: (prompt: string) => void;
}

const focusAreaColors: Record<string, string> = {
  gratitude: "bg-green-500/10 text-green-700 border-green-500/20",
  self_reflection: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  emotions: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  growth: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  relationships: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  goals: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
};

export const MindfulAIAssistant = ({ currentMood, onPromptSelect }: MindfulAIAssistantProps) => {
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generatePrompts = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("mindful-ai-assistant", {
        body: {
          mood: currentMood || "neutral",
          recentEntries: [], // Could pass recent journal topics
        },
      });

      if (error) {
        if (error.message.includes("429")) {
          toast({
            title: "Rate limit reached",
            description: "Too many requests. Please wait a moment and try again.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setPrompts(data.prompts || []);
      toast({
        title: "✨ Prompts Generated",
        description: "Here are some mindful journaling ideas for you",
      });
    } catch (error: any) {
      console.error("Error generating prompts:", error);
      toast({
        title: "Error",
        description: "Failed to generate prompts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="animate-fade-in border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Mindful AI Assistant
            </CardTitle>
            <CardDescription>
              Get personalized journal prompts to guide your reflection
            </CardDescription>
          </div>
          {prompts.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={generatePrompts}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {prompts.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
            <p className="text-muted-foreground mb-4">
              Get AI-powered journal prompts tailored to your mood
            </p>
            <Button onClick={generatePrompts} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Prompts
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {prompts.map((prompt, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border-2 hover:border-primary/40 transition-all cursor-pointer group"
                onClick={() => onPromptSelect?.(prompt.prompt)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {prompt.prompt}
                  </p>
                  <Badge
                    variant="outline"
                    className={`${focusAreaColors[prompt.focus_area] || ""} shrink-0`}
                  >
                    {prompt.focus_area.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            ))}
            <p className="text-xs text-center text-muted-foreground pt-2">
              Click any prompt to use it in your journal entry
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
