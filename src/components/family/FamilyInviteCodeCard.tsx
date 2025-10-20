import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, QrCode, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FamilyInviteCodeCardProps {
  familyGroupId?: string;
}

export const FamilyInviteCodeCard = ({ familyGroupId }: FamilyInviteCodeCardProps) => {
  const [inviteCode, setInviteCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadInviteCode();
  }, [familyGroupId]);

  const loadInviteCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let groupId = familyGroupId;
      
      // If no familyGroupId provided, find user's group
      if (!groupId) {
        const { data: group } = await supabase
          .from("family_groups")
          .select("id, invite_code")
          .eq("created_by", user.id)
          .single();

        if (group) {
          groupId = group.id;
          setInviteCode(group.invite_code);
        }
      } else {
        const { data: group } = await supabase
          .from("family_groups")
          .select("invite_code")
          .eq("id", groupId)
          .single();

        if (group) {
          setInviteCode(group.invite_code);
        }
      }
    } catch (error) {
      console.error("Error loading invite code:", error);
    } finally {
      setLoading(false);
    }
  };

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
    const shareText = `Join my family group on Vibe Check! Use invite code: ${inviteCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join My Family Group",
          text: shareText,
        });
      } catch (error) {
        // User cancelled or error occurred
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  if (loading || !inviteCode) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Family Invite Code
        </CardTitle>
        <CardDescription>
          Share this code with family members so they can join your group
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={inviteCode}
            readOnly
            className="text-center text-2xl font-mono font-bold tracking-wider bg-background"
          />
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

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Up to 10 family members can join using this code
        </div>
      </CardContent>
    </Card>
  );
};
