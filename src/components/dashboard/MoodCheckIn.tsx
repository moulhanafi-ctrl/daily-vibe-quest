import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { JournalPrompts } from "@/components/journal/JournalPrompts";
import { Book, Mic, Lightbulb } from "lucide-react";

const MOODS = [
  { emoji: "🤩", value: "excited", label: "Great" },
  { emoji: "😊", value: "happy", label: "Good" },
  { emoji: "😐", value: "calm", label: "Okay" },
  { emoji: "😕", value: "anxious", label: "Off" },
  { emoji: "😢", value: "sad", label: "Sad" },
];

const INTENSITY_EMOJIS = ["😐", "🙂", "😊", "😃", "🤩"];

interface MoodCheckInProps {
  userId: string;
  ageGroup: "child" | "teen" | "adult";
}

export const MoodCheckIn = ({ userId, ageGroup }: MoodCheckInProps) => {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState([3]);
  const [reflection, setReflection] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showReflectCard, setShowReflectCard] = useState(false);
  const [lastMoodId, setLastMoodId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedMood) {
      toast({ title: "Please select a mood", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Insert mood
      const { data: moodData, error: moodError } = await supabase
        .from("moods")
        .insert({
          user_id: userId,
          mood: selectedMood as any,
          intensity: intensity[0],
        })
        .select()
        .single();

      if (moodError) throw moodError;

      // Send notification to parent if child/teen has linked parent
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (ageGroup === "child" || ageGroup === "teen")) {
        const moodEmoji = MOODS.find(m => m.value === selectedMood)?.emoji || "😊";
        
        await supabase.functions.invoke('send-parent-notification', {
          body: {
            childId: userId,
            eventType: 'checkin',
            payload: {
              mood: selectedMood,
              emoji: moodEmoji,
              timestamp: new Date().toISOString()
            }
          }
        });
      }

      // Insert reflection if provided
      if (reflection.trim()) {
        const sharedWithParent = !isPrivate && (ageGroup === "child" || ageGroup === "teen");
        
        const { error: reflectionError } = await supabase
          .from("reflections")
          .insert({
            mood_id: moodData.id,
            content: reflection,
            is_private: isPrivate,
            shared_with_parent: sharedWithParent
          });

        if (reflectionError) throw reflectionError;

        // Send notification if shared with parent
        if (sharedWithParent) {
          await supabase.functions.invoke('send-parent-notification', {
            body: {
              childId: userId,
              eventType: 'journal_shared',
              payload: {
                title: reflection.substring(0, 50),
                preview: reflection.substring(0, 100),
                timestamp: new Date().toISOString()
              }
            }
          });
        }
      }

      toast({ title: "Mood checked in successfully!" });
      
      // Show reflect card
      setShowReflectCard(true);
      setLastMoodId(moodData.id);
      
      // Reset form
      setSelectedMood(null);
      setIntensity([3]);
      setReflection("");
      setIsPrivate(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAgeAppropriatePrompt = () => {
    if (ageGroup === "child") return "How's your vibe today? 👀";
    if (ageGroup === "teen") return "Drop your mood emoji 💭";
    return "What's the energy right now?";
  };

  return (
    <div className="space-y-4">
      {showReflectCard && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              Reflect?
            </CardTitle>
            <CardDescription>
              Take a moment to journal about how you're feeling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/journal")}
              >
                <Book className="w-4 h-4 mr-2" />
                Write
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/journal")}
              >
                <Mic className="w-4 h-4 mr-2" />
                Voice Note
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/journal")}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Use a Prompt
              </Button>
            </div>
            <JournalPrompts onSelectPrompt={(prompt) => navigate("/journal", { state: { prompt } })} limit={3} />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowReflectCard(false)}
              className="w-full"
            >
              Maybe later
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Card className="shadow-glow">
      <CardHeader>
        <CardTitle className="text-2xl">{getAgeAppropriatePrompt()}</CardTitle>
        <CardDescription>
          Pick the emoji that matches your vibe ✨
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              onClick={() => setSelectedMood(mood.value)}
              className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all hover:scale-105 ${
                selectedMood === mood.value
                  ? "border-primary bg-gradient-to-br from-primary/20 to-accent/20 shadow-glow"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="text-5xl emoji-pulse">{mood.emoji}</span>
              <span className="text-sm font-bold text-center">{mood.label}</span>
            </button>
          ))}
        </div>

        {selectedMood && (
          <>
            <div className="space-y-3">
              <Label>How intense is this feeling?</Label>
              <Slider
                value={intensity}
                onValueChange={setIntensity}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex items-center justify-center gap-2 text-center">
                <span className="text-3xl">{INTENSITY_EMOJIS[intensity[0] - 1]}</span>
                <span className="text-sm text-muted-foreground">
                  Level {intensity[0]} of 5
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="reflection">
                {ageGroup === "child"
                  ? "Wanna tell me about it? 🗣️"
                  : "What's on your mind? (optional)"}
              </Label>
              <Textarea
                id="reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder={
                  ageGroup === "child"
                    ? "What happened today?"
                    : "Share your thoughts..."
                }
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="private"
                checked={isPrivate}
                onCheckedChange={(checked) => setIsPrivate(checked as boolean)}
              />
              <Label htmlFor="private" className="text-sm font-normal">
                {(ageGroup === "child" || ageGroup === "teen") 
                  ? isPrivate ? "Private 🔒 (Only you can see)" : "Shared with Parent ✅" 
                  : "Keep this private (only you can see it)"
                }
              </Label>
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full shadow-glow">
              {loading ? "Saving..." : "Save My Vibe ✨"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
