import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Trash2, Mic, X, Share2 } from "lucide-react";
import { VoiceRecorder } from "./VoiceRecorder";

interface JournalComposerProps {
  moodId?: string;
  mood?: number;
  onSave?: () => void;
  onCancel?: () => void;
  editEntry?: any;
}

export const JournalComposer = ({ moodId, mood, onSave, onCancel, editEntry }: JournalComposerProps) => {
  const [title, setTitle] = useState(editEntry?.title || "");
  const [body, setBody] = useState(editEntry?.body || "");
  const [tags, setTags] = useState<string[]>(editEntry?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [sharedWithParent, setSharedWithParent] = useState(editEntry?.shared_with_parent || false);
  const [audioUrl, setAudioUrl] = useState(editEntry?.audio_url || "");
  const [transcript, setTranscript] = useState(editEntry?.transcript || "");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkIfMinor();
  }, []);

  const checkIfMinor = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("age_group")
      .eq("id", (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    setIsMinor(profile?.age_group === "child" || profile?.age_group === "teen");
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const entryData = {
        user_id: user.id,
        mood_id: moodId,
        mood: mood,
        title: title || null,
        body: body || null,
        audio_url: audioUrl || null,
        transcript: transcript || null,
        tags: tags,
        shared_with_parent: sharedWithParent,
      };

      if (editEntry) {
        const { error } = await supabase
          .from("journal_entries")
          .update(entryData)
          .eq("id", editEntry.id);
        
        if (error) throw error;
        toast({ title: "Entry updated" });
      } else {
        const { error } = await supabase
          .from("journal_entries")
          .insert(entryData);
        
        if (error) throw error;
        toast({ title: "Entry saved" });
      }

      onSave?.();
    } catch (error: any) {
      toast({
        title: "Error saving entry",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editEntry || !confirm("Delete this entry?")) return;
    
    try {
      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", editEntry.id);
      
      if (error) throw error;
      toast({ title: "Entry deleted" });
      onSave?.();
    } catch (error: any) {
      toast({
        title: "Error deleting entry",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{editEntry ? "Edit Entry" : "New Journal Entry"}</span>
          {mood && <span className="text-2xl">{["😢", "😕", "😐", "🙂", "😊"][mood - 1]}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          placeholder="What's on your mind?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="resize-none"
        />

        {showVoiceRecorder ? (
          <div className="space-y-2">
            <VoiceRecorder
              onRecordingComplete={(url, text) => {
                setAudioUrl(url);
                setTranscript(text);
                setShowVoiceRecorder(false);
                toast({ title: "Voice note added" });
              }}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowVoiceRecorder(true)}
            className="w-full"
          >
            <Mic className="w-4 h-4 mr-2" />
            Add Voice Note
          </Button>
        )}

        {audioUrl && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Voice Note</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAudioUrl("");
                  setTranscript("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <audio src={audioUrl} controls className="w-full" />
            {transcript && (
              <p className="text-sm text-muted-foreground">{transcript}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add tag (e.g., sleep, anxiety)"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
            />
            <Button onClick={handleAddTag}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {isMinor && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="share-toggle" className="font-medium">
                Share with parent
              </Label>
              <p className="text-xs text-muted-foreground">
                Let your parent see this entry
              </p>
            </div>
            <Switch
              id="share-toggle"
              checked={sharedWithParent}
              onCheckedChange={setSharedWithParent}
            />
          </div>
        )}

        {sharedWithParent && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Share2 className="w-4 h-4" />
            <span>This entry will be visible to your parent</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
          {editEntry && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
