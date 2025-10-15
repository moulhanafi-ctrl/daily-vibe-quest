import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Smile, Eye, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import FamilyStoriesGrid from "./FamilyStoriesGrid";

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
  mp4_url?: string;
  hls_url?: string;
  title?: string;
}

export const FamilyStories = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    
    initUser();
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
      description: "Video recording feature coming soon. Max 45 seconds, 100MB limit.",
    });
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from("family_stories")
        .delete()
        .eq("id", storyId);

      if (error) throw error;

      toast({
        title: "Story deleted",
        description: "Your story has been removed.",
      });
    } catch (error: any) {
      console.error("Error deleting story:", error);
      toast({
        title: "Error",
        description: "Failed to delete story. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours === 1) return "1h ago";
    return `${hours}h ago`;
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-32 mx-auto"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-video bg-muted rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FamilyStoriesGrid
        stories={stories}
        currentUserId={currentUserId || undefined}
        onStoryClick={handleStoryClick}
        onUploadClick={handleUploadClick}
        onDeleteStory={handleDeleteStory}
      />

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
                  src={selectedStory.mp4_url || selectedStory.video_url}
                  poster={selectedStory.thumbnail_url}
                  className="max-h-full max-w-full"
                  controls
                  autoPlay
                  playsInline
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
