import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserX, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

export const BlockedUsersList = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get blocked_users
      const { data: blockedData, error: blockedError } = await supabase
        .from("blocked_users")
        .select("id, blocked_id, created_at")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });

      if (blockedError) throw blockedError;

      // Then fetch profile data for each blocked user
      if (blockedData && blockedData.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", blockedData.map(bu => bu.blocked_id));

        if (profilesError) throw profilesError;

        // Map profiles to blocked users
        const enrichedData = blockedData.map(bu => ({
          ...bu,
          profiles: profilesData?.find(p => p.id === bu.blocked_id) || { username: "Unknown User" }
        }));

        setBlockedUsers(enrichedData);
      } else {
        setBlockedUsers([]);
      }
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      toast.error("Failed to load blocked users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (blockId: string, username: string) => {
    setUnblocking(blockId);
    try {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("id", blockId);

      if (error) throw error;

      toast.success(`Unblocked ${username}`);
      setBlockedUsers(prev => prev.filter(bu => bu.id !== blockId));
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Failed to unblock user");
    } finally {
      setUnblocking(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Blocked Users
          </CardTitle>
          <CardDescription>Loading blocked users...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5" />
          Blocked Users
        </CardTitle>
        <CardDescription>
          Users you've blocked won't see your messages and you won't see theirs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {blockedUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blocked users</p>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((blockedUser) => (
              <div
                key={blockedUser.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>
                      {blockedUser.profiles?.username?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{blockedUser.profiles?.username || "Unknown User"}</p>
                    <p className="text-xs text-muted-foreground">
                      Blocked {new Date(blockedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnblock(blockedUser.id, blockedUser.profiles?.username || "user")}
                  disabled={unblocking === blockedUser.id}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {unblocking === blockedUser.id ? "Unblocking..." : "Unblock"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
