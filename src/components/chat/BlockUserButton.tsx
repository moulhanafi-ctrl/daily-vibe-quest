import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ban, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BlockUserButtonProps {
  userId: string;
  username: string;
  onBlockComplete?: () => void;
}

export const BlockUserButton = ({ userId, username, onBlockComplete }: BlockUserButtonProps) => {
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to block users");
        return;
      }

      const { error } = await supabase
        .from("blocked_users")
        .insert({
          blocker_id: user.id,
          blocked_id: userId,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("User is already blocked");
        } else {
          throw error;
        }
      } else {
        toast.success(`Blocked ${username}`);
        onBlockComplete?.();
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Failed to block user");
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Ban className="h-4 w-4 mr-2" />
          Block User
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-destructive" />
            Block {username}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will prevent you from seeing each other's messages in chat rooms.
            You can unblock them later from your settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBlock}
            disabled={isBlocking}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isBlocking ? "Blocking..." : "Block User"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
