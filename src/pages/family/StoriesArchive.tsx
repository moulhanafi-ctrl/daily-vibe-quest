import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Archive, Video, Calendar, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ArchivedStory {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url?: string;
  duration_seconds: number;
  view_count: number;
  created_at: string;
  username?: string;
  first_name?: string;
  mp4_url?: string;
}

const StoriesArchive = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<ArchivedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isParent, setIsParent] = useState(false);
  const [selectedStory, setSelectedStory] = useState<ArchivedStory | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_parent")
        .eq("id", user.id)
        .single();

      if (!profile?.is_parent) {
        toast({
          title: "Access Denied",
          description: "Only parents can access the memories archive",
          variant: "destructive",
        });
        navigate("/family/chat");
        return;
      }

      setIsParent(true);
      loadArchivedStories();
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/family/chat");
    }
  };

  const loadArchivedStories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's family group
      const { data: familyGroup } = await supabase
        .from("family_groups")
        .select("id")
        .eq("created_by", user.id)
        .single();

      if (!familyGroup) {
        setStories([]);
        setLoading(false);
        return;
      }

      // Get all stories from family (including expired ones)
      const { data: storiesData, error } = await supabase
        .from("family_stories")
        .select("*")
        .eq("family_id", familyGroup.id)
        .order("created_at", { ascending: false })
        .limit(50);

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
      }
    } catch (error: any) {
      console.error("Error loading archived stories:", error);
      toast({
        title: "Error",
        description: "Failed to load archived stories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <div className="container max-w-6xl mx-auto py-8">
          <Button variant="ghost" onClick={() => navigate("/family/chat")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Family
          </Button>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-video rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isParent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="container max-w-6xl mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/family/chat")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Family
        </Button>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Archive className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl">Family Memories Archive</CardTitle>
                <CardDescription className="mt-1">
                  View all family stories, past and present
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {stories.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Video className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">No stories yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your family hasn't shared any stories yet. Encourage them to share their moments!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stories.map((story) => {
              const isExpired = new Date(story.created_at).getTime() + 24 * 60 * 60 * 1000 < Date.now();
              return (
                <Card
                  key={story.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedStory(story)}
                >
                  <div className="aspect-video relative bg-muted">
                    {story.thumbnail_url ? (
                      <img
                        src={story.thumbnail_url}
                        alt="Story thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {isExpired && (
                      <Badge className="absolute top-2 right-2 bg-red-500/80">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {(story.first_name?.[0] || story.username?.[0] || "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">
                        {story.first_name || story.username}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(story.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {story.view_count}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Story Viewer Modal */}
        {selectedStory && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedStory(null)}
          >
            <div
              className="relative max-w-2xl w-full bg-black rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 text-white bg-black/50"
                onClick={() => setSelectedStory(null)}
              >
                ✕
              </Button>
              <video
                src={selectedStory.mp4_url || selectedStory.video_url}
                poster={selectedStory.thumbnail_url}
                className="w-full"
                controls
                autoPlay
                playsInline
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoriesArchive;
