import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Heart, Flag, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface ChatRoomOnboardingProps {
  onComplete: () => void;
}

export const ChatRoomOnboarding = ({ onComplete }: ChatRoomOnboardingProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem("chatroom_onboarding_seen");
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem("chatroom_onboarding_seen", "true");
    setOpen(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Welcome to Support Chat Rooms
          </DialogTitle>
          <DialogDescription className="text-base">
            Before you join, here are our community guidelines
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Heart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Be Kind & Respectful</h4>
              <p className="text-sm text-muted-foreground">
                Treat others with empathy and compassion. Everyone is on their own journey.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Protect Privacy</h4>
              <p className="text-sm text-muted-foreground">
                Never share personal information like phone numbers, addresses, or last names.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Moderated for Safety</h4>
              <p className="text-sm text-muted-foreground">
                All rooms are moderated by VibeOps AI. Inappropriate content will be flagged.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Flag className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Report Issues</h4>
              <p className="text-sm text-muted-foreground">
                Use the report button on any message that violates our guidelines.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            By joining, you agree to follow our{" "}
            <Link to="/legal/community-guidelines" className="text-primary hover:underline" target="_blank">
              Community Guidelines
            </Link>
          </p>
        </div>

        <Button onClick={handleComplete} className="w-full">
          I Understand - Let's Chat!
        </Button>
      </DialogContent>
    </Dialog>
  );
};
