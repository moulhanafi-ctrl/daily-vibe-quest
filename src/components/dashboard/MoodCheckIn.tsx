import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

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
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState([3]);
  const [reflection, setReflection] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);

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

      // Insert reflection if provided
      if (reflection.trim()) {
        const { error: reflectionError } = await supabase
          .from("reflections")
          .insert({
            mood_id: moodData.id,
            content: reflection,
            is_private: isPrivate,
          });

        if (reflectionError) throw reflectionError;
      }

      toast({ title: "Mood checked in successfully!" });
      
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
                Keep this private (only you can see it)
              </Label>
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full shadow-glow">
              {loading ? "Saving..." : "Save My Vibe ✨"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
