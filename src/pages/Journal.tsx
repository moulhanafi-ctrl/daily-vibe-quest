import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JournalComposer } from "@/components/journal/JournalComposer";
import { JournalList } from "@/components/journal/JournalList";
import { JournalPrompts } from "@/components/journal/JournalPrompts";
import { JournalProgress } from "@/components/journal/JournalProgress";
import { StreakBadge } from "@/components/journal/StreakBadge";
import { PrivacyNotice } from "@/components/journal/PrivacyNotice";
import { supabase } from "@/integrations/supabase/client";
import { Plus, BookOpen, Lightbulb, TrendingUp } from "lucide-react";

export default function Journal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showComposer, setShowComposer] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [promptText, setPromptText] = useState("");
  const [isMinor, setIsMinor] = useState(false);

  useEffect(() => {
    checkIfMinor();
  }, []);

  useEffect(() => {
    // Auto-open composer for first entry
    if (searchParams.get("first_entry") === "true") {
      setShowComposer(true);
      // Clear the param
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const checkIfMinor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("age_group")
      .eq("id", user.id)
      .single();
    
    setIsMinor(profile?.age_group === "child" || profile?.age_group === "teen");
  };

  const handleSelectEntry = (entry: any) => {
    setSelectedEntry(entry);
    setShowComposer(true);
  };

  const handleSelectPrompt = (prompt: string) => {
    setPromptText(prompt);
    setSelectedEntry(null);
    setShowComposer(true);
  };

  const handleSave = () => {
    setShowComposer(false);
    setSelectedEntry(null);
    setPromptText("");
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Journal</h1>
          <StreakBadge />
        </div>
        {!showComposer && (
          <Button onClick={() => setShowComposer(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        )}
      </div>

      <PrivacyNotice isMinor={isMinor} />

      {showComposer ? (
        <div className="space-y-6">
          {promptText && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm">
                <strong>Prompt:</strong> {promptText}
              </p>
            </div>
          )}
          <JournalComposer
            editEntry={selectedEntry}
            onSave={handleSave}
            onCancel={() => {
              setShowComposer(false);
              setSelectedEntry(null);
              setPromptText("");
            }}
          />
        </div>
      ) : (
        <Tabs defaultValue="entries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="entries">
              <BookOpen className="w-4 h-4 mr-2" />
              Entries
            </TabsTrigger>
            <TabsTrigger value="prompts">
              <Lightbulb className="w-4 h-4 mr-2" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="progress">
              <TrendingUp className="w-4 h-4 mr-2" />
              Progress
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries">
            <JournalList onSelectEntry={handleSelectEntry} />
          </TabsContent>

          <TabsContent value="prompts">
            <JournalPrompts onSelectPrompt={handleSelectPrompt} />
          </TabsContent>

          <TabsContent value="progress">
            <JournalProgress />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
