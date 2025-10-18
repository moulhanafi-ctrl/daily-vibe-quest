import { Users } from "lucide-react";
import { useChatRoomPresence } from "@/hooks/useChatRoomPresence";

interface RoomPresenceIndicatorProps {
  roomId: string;
  userId: string;
  username: string;
}

export const RoomPresenceIndicator = ({ roomId, userId, username }: RoomPresenceIndicatorProps) => {
  const { activeUsers } = useChatRoomPresence(roomId, userId, username);

  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Users className="w-4 h-4" />
      <span className="text-sm font-medium">
        {activeUsers} {activeUsers === 1 ? "user" : "users"} active
      </span>
    </div>
  );
};
