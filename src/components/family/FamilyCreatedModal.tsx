import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FamilyCreatedModalProps {
  open: boolean;
  onClose: () => void;
  inviteCode: string;
  expiresAt: string;
}

export const FamilyCreatedModal = ({ 
  open, 
  onClose, 
  inviteCode, 
  expiresAt 
}: FamilyCreatedModalProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast({
        title: "✅ Copied!",
        description: "Invite code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy invite code",
        variant: "destructive",
      });
    }
  };

  const shareInviteCode = async () => {
    const shareText = `Join my family group on Vibe Check! Use invite code: ${inviteCode} (valid until ${format(new Date(expiresAt), "MMM d, yyyy")})`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join My Family Group",
          text: shareText,
        });
      } catch (error) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            ✅ Family Group Created!
          </DialogTitle>
          <DialogDescription>
            Your family group is ready! Share this invite code with your family members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
            <div className="text-sm text-muted-foreground mb-2 text-center">
              Your Invite Code
            </div>
            <Input
              value={inviteCode}
              readOnly
              className="text-center text-3xl font-mono font-bold tracking-wider bg-background mb-4"
            />
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Valid until {format(new Date(expiresAt), "MMMM d, yyyy")}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="flex-1"
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
            
            <Button
              onClick={shareInviteCode}
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground pt-2 border-t">
            💡 Family members can join by entering this code in "Join Family Group"
          </div>
        </div>

        <Button onClick={onClose} className="w-full">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
};
