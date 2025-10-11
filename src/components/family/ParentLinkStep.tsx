import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ParentLinkStepProps {
  userId: string;
  onLinked: () => void;
  onSkip: () => void;
}

export const ParentLinkStep = ({ userId, onLinked, onSkip }: ParentLinkStepProps) => {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLinkParent = async () => {
    if (!inviteCode.trim()) {
      toast({ title: "Please enter an invite code", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Verify invite code
      const { data: invite, error: inviteError } = await supabase
        .from("family_invites")
        .select("*")
        .eq("invite_code", inviteCode.toUpperCase())
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        throw new Error("Invalid or expired invite code");
      }

      // Link user to parent
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ parent_id: invite.parent_id })
        .eq("id", userId);

      if (updateError) throw updateError;

      // Mark invite as used
      await supabase
        .from("family_invites")
        .update({ is_used: true })
        .eq("id", invite.id);

      toast({ title: "✨ Successfully linked to parent!" });
      onLinked();
    } catch (error: any) {
      toast({
        title: "Link failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-glow">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4 emoji-pulse">👨‍👩‍👧</div>
          <CardTitle className="text-2xl">Link to Your Parent</CardTitle>
          <CardDescription>
            Ask your parent for their invite code to connect your accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Parent Invite Code</Label>
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleLinkParent} 
              disabled={loading || inviteCode.length !== 6}
              className="w-full"
            >
              {loading ? "Linking..." : "Connect 🔗"}
            </Button>
            <Button 
              onClick={onSkip} 
              variant="ghost"
              className="w-full"
            >
              Skip for now
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Don't have a code? Ask your parent to create one in their settings!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
