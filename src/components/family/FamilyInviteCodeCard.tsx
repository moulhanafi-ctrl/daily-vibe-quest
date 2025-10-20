import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2, RefreshCw, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";

interface FamilyInviteCodeCardProps {
  familyGroupId?: string;
}

export const FamilyInviteCodeCard = ({ familyGroupId }: FamilyInviteCodeCardProps) => {
  const [inviteCode, setInviteCode] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
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
          .select("id, invite_code, invite_expires_at, created_by")
          .eq("created_by", user.id)
          .single();

        if (group) {
          groupId = group.id;
          setInviteCode(group.invite_code);
          setExpiresAt(group.invite_expires_at);
          setIsOwner(group.created_by === user.id);
        }
      } else {
        const { data: group } = await supabase
          .from("family_groups")
          .select("invite_code, invite_expires_at, created_by")
          .eq("id", groupId)
          .single();

        if (group) {
          setInviteCode(group.invite_code);
          setExpiresAt(group.invite_expires_at);
          setIsOwner(group.created_by === user.id);
        }
      }
    } catch (error) {
      console.error("Error loading invite code:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!familyGroupId && !isOwner) return;
    
    setRegenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get family group ID if not provided
      let groupId = familyGroupId;
      if (!groupId) {
        const { data: group } = await supabase
          .from("family_groups")
          .select("id")
          .eq("created_by", user.id)
          .single();
        
        if (group) groupId = group.id;
      }

      if (!groupId) {
        toast({
          title: "Error",
          description: "Family group not found",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.rpc("regenerate_family_invite_code", {
        _family_id: groupId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; invite_code?: string; expires_at?: string; message?: string };

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to regenerate code",
          variant: "destructive",
        });
        return;
      }

      setInviteCode(result.invite_code || "");
      setExpiresAt(result.expires_at || null);

      toast({
        title: "✅ New code generated!",
        description: result.message || "Your invite code has been regenerated",
      });
    } catch (error: any) {
      console.error("Error regenerating code:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate invite code",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
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
    const expiryText = expiresAt 
      ? ` (valid until ${format(new Date(expiresAt), "MMM d, yyyy")})`
      : "";
    const shareText = `Join my family group on Vibe Check! Use invite code: ${inviteCode}${expiryText}`;
    
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

  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const expiresInDays = expiresAt 
    ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading || !inviteCode) {
    return null;
  }

  return (
    <Card className={`border-2 ${isExpired ? 'border-destructive/20 bg-destructive/5' : 'border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10'}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Family Invite Code
        </CardTitle>
        <CardDescription>
          {isExpired 
            ? "This invite code has expired. Generate a new one to invite members."
            : "Share this code with family members so they can join your group"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={inviteCode}
            readOnly
            className={`text-center text-2xl font-mono font-bold tracking-wider bg-background ${isExpired ? 'text-muted-foreground line-through' : ''}`}
          />
        </div>

        {expiresAt && (
          <div className={`flex items-center justify-center gap-2 text-sm ${isExpired ? 'text-destructive' : expiresInDays && expiresInDays <= 2 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
            <Calendar className="w-4 h-4" />
            {isExpired 
              ? `Expired ${formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}`
              : `Expires ${format(new Date(expiresAt), "MMM d, yyyy")} (${formatDistanceToNow(new Date(expiresAt), { addSuffix: true })})`
            }
          </div>
        )}
        
        <div className="flex gap-2">
          {!isExpired && (
            <>
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
            </>
          )}
        </div>

        {isOwner && (
          <Button
            onClick={handleRegenerateCode}
            disabled={regenerating}
            variant={isExpired ? "default" : "outline"}
            className="w-full"
          >
            {regenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {isExpired ? "Generate New Code" : "Regenerate Code"}
              </>
            )}
          </Button>
        )}

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Up to 10 family members can join using this code
        </div>
      </CardContent>
    </Card>
  );
};
