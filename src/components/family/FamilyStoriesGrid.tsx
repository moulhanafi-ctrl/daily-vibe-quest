import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, Info } from "lucide-react";
import FamilyStoryCard from "./FamilyStoryCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  hls_url?: string;
  mp4_url?: string;
  title?: string;
}

interface Props {
  stories: Story[];
  currentUserId?: string;
  onStoryClick: (story: Story) => void;
  onUploadClick: () => void;
  onDeleteStory?: (storyId: string) => void;
}

export default function FamilyStoriesGrid({ 
  stories, 
  currentUserId,
  onStoryClick,
  onUploadClick,
  onDeleteStory 
}: Props) {
  if (!stories || stories.length === 0) {
    return (
      <Card className="rounded-2xl border border-border bg-card shadow-sm p-8 md:p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Video className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">No family stories yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Share your first 45-second memory with your family. Stories disappear after 24 hours.
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onUploadClick}
                  className="mt-2 rounded-xl px-6 h-11"
                  size="lg"
                >
                  Post a Story
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  📹 Stories are 45 seconds max and disappear after 24 hours. Share your authentic moments with family!
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload button */}
      <TooltipProvider>
        <div className="flex items-center gap-2">
          <Button 
            onClick={onUploadClick}
            className="flex-1 rounded-xl h-12"
            size="lg"
          >
            <Video className="h-5 w-5 mr-2" />
            Post a Story
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-12 w-12 rounded-xl"
              >
                <Info className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">
                📹 Stories are 45 seconds max and disappear after 24 hours. Share your authentic moments with family!
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Stories grid - mobile first: 2 cols, desktop: 3-4 cols */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {stories.map((story) => {
          const displayName = story.first_name || story.username || "User";
          const initial = displayName[0]?.toUpperCase() || "U";
          
          return (
            <FamilyStoryCard
              key={story.id}
              id={story.id}
              title={story.title}
              posterUrl={story.thumbnail_url}
              hlsUrl={story.hls_url}
              mp4Url={story.mp4_url || story.video_url}
              durationSeconds={story.duration_seconds}
              uploaderName={displayName}
              uploaderInitial={initial}
              isOwner={story.user_id === currentUserId}
              onClick={() => onStoryClick(story)}
              onDelete={
                onDeleteStory && story.user_id === currentUserId
                  ? () => onDeleteStory(story.id)
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
