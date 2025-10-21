import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Shield } from "lucide-react";
import { RoomPresenceIndicator } from "./RoomPresenceIndicator";

interface ChatRoom {
  id: string;
  focus_area: string;
  name: string;
  description: string;
  focus_area_key?: string | null;
}

interface ChatRoomCardProps {
  room: ChatRoom;
  currentUserId: string;
  currentUsername: string;
  onNavigate: (path: string) => void;
}

export const ChatRoomCard = ({ room, currentUserId, currentUsername, onNavigate }: ChatRoomCardProps) => {
  const roomPath = room.focus_area_key ? `/chat-rooms/${room.focus_area_key}` : `/chat/${room.id}`;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-smooth focus-within:ring-2 focus-within:ring-primary"
      onClick={() => onNavigate(roomPath)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(roomPath);
        }
      }}
      aria-label={`Join ${room.name} chat room`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <MessageSquare className="w-8 h-8 text-primary flex-shrink-0 mt-1" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base sm:text-lg">{room.name}</CardTitle>
              <CardDescription className="text-sm mt-1">{room.description}</CardDescription>
              
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="outline" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Moderated by VibeOps AI
                </Badge>
                {currentUserId && (
                  <RoomPresenceIndicator 
                    roomId={room.id}
                    userId={currentUserId}
                    username={currentUsername}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          className="w-full" 
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(roomPath);
          }}
          aria-label={`Join ${room.name}`}
        >
          Join Chat
        </Button>
      </CardContent>
    </Card>
  );
};
