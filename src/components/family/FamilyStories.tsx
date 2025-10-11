import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Heart, Smile, Eye, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Story {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds: number;
  view_count: number;
  created_at: string;
  expires_at: string;
  username?: string;
  first_name?: string;
}

export const FamilyStories = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStories();

    // Subscribe to new stories
    const channel = supabase
      .channel('family_stories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_stories'
        },
        () => {
          loadStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's family
      const { data: familyMember } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", user.id)
        .single();

      if (!familyMember) {
        setStories([]);
        return;
      }

      // Get family stories
      const { data: storiesData, error } = await supabase
        .from("family_stories")
        .select("*")
        .eq("family_id", familyMember.family_id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user data for each story
      if (storiesData && storiesData.length > 0) {
        const userIds = [...new Set(storiesData.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, first_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedStories = storiesData.map(story => {
          const profile = profileMap.get(story.user_id);
          return {
            ...story,
            username: profile?.username,
            first_name: profile?.first_name
          };
        });

        setStories(enrichedStories);
      } else {
        setStories([]);
      }
    } catch (error: any) {
      console.error("Error loading stories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoryClick = async (story: Story) => {
    setSelectedStory(story);

    // Track view
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("story_views").insert({
        story_id: story.id,
        viewer_id: user.id
      });

      await trackEvent({
        eventType: "help_viewed",
        metadata: { story_id: story.id, duration: story.duration_seconds }
      });
    } catch (error) {
      console.error("Error tracking view:", error);
    }
  };

  const handleReaction = async (reaction: string) => {
    if (!selectedStory) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("story_reactions").upsert({
        story_id: selectedStory.id,
        user_id: user.id,
        reaction
      });

      toast({
        title: "Reaction added",
        description: "Your reaction has been sent",
      });
    } catch (error: any) {
      console.error("Error adding reaction:", error);
    }
  };

  const handleUploadClick = () => {
    toast({
      title: "Story Upload",
      description: "Video recording feature coming soon. Max 45 seconds.",
    });
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours === 1) return "1h ago";
    return `${hours}h ago`;
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading stories...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Story Rail */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {/* Add Story Button */}
        <button
          onClick={handleUploadClick}
          className="flex flex-col items-center gap-2 min-w-[80px]"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Plus className="h-8 w-8 text-white" />
          </div>
          <span className="text-xs font-medium">Your Story</span>
        </button>

        {/* Story Avatars */}
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => handleStoryClick(story)}
            className="flex flex-col items-center gap-2 min-w-[80px]"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 p-0.5">
              <Avatar className="w-full h-full border-2 border-background">
                <AvatarFallback>
                  {(story.first_name?.[0] || story.username?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium truncate max-w-[80px]">
                {story.first_name || story.username}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {getTimeAgo(story.created_at)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {stories.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No family stories yet</p>
          <p className="text-sm text-muted-foreground">
            Share a moment with your family. Stories disappear after 24 hours.
          </p>
        </Card>
      )}

      {/* Story Viewer Dialog */}
      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-md p-0 bg-black border-none">
          {selectedStory && (
            <div className="relative h-[80vh] flex flex-col">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-white">
                      <AvatarFallback>
                        {(selectedStory.first_name?.[0] || selectedStory.username?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">
                        {selectedStory.first_name || selectedStory.username}
                      </p>
                      <p className="text-white/80 text-xs">
                        {getTimeAgo(selectedStory.created_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white"
                    onClick={() => setSelectedStory(null)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Video */}
              <div className="flex-1 flex items-center justify-center">
                <video
                  src={selectedStory.video_url}
                  className="max-h-full max-w-full"
                  controls
                  autoPlay
                />
              </div>

              {/* Reactions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-center justify-around">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white"
                    onClick={() => handleReaction("heart")}
                  >
                    <Heart className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white"
                    onClick={() => handleReaction("laugh")}
                  >
                    <Smile className="h-6 w-6" />
                  </Button>
                  <div className="flex items-center gap-2 text-white">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">{selectedStory.view_count}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
