import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, Copy } from "lucide-react";

interface FamilyDashboardProps {
  userId: string;
}

export const FamilyDashboard = ({ userId }: FamilyDashboardProps) => {
  const [families, setFamilies] = useState<any[]>([]);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFamilies();

    const channel = supabase
      .channel("family-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadFamilies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadFamilies = async () => {
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select(`
          *,
          family_groups (*),
          profiles (username)
        `)
        .eq("user_id", userId);

      if (error) throw error;
      setFamilies(data || []);
    } catch (error) {
      console.error("Error loading families:", error);
    }
  };

  const createFamily = async () => {
    if (!familyName.trim()) {
      toast({ title: "Please enter a family name", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Generate invite code
      const { data: codeData } = await supabase.rpc("generate_invite_code");
      
      const { data: familyData, error: familyError } = await supabase
        .from("family_groups")
        .insert({
          name: familyName,
          created_by: userId,
          invite_code: codeData,
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // Add creator as member
      const { error: memberError } = await supabase
        .from("family_members")
        .insert({
          family_id: familyData.id,
          user_id: userId,
          role: "admin",
        });

      if (memberError) throw memberError;

      toast({ title: "Family group created!" });
      setFamilyName("");
      loadFamilies();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinFamily = async () => {
    if (!inviteCode.trim()) {
      toast({ title: "Please enter an invite code", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: familyData, error: familyError } = await supabase
        .from("family_groups")
        .select("*")
        .eq("invite_code", inviteCode.toUpperCase())
        .single();

      if (familyError) throw new Error("Invalid invite code");

      const { error: memberError } = await supabase
        .from("family_members")
        .insert({
          family_id: familyData.id,
          user_id: userId,
        });

      if (memberError) throw memberError;

      toast({ title: "Joined family group!" });
      setInviteCode("");
      loadFamilies();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Invite code copied!" });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Family Group
            </CardTitle>
            <CardDescription>Start a new family wellness circle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName">Family Name</Label>
              <Input
                id="familyName"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="The Smiths"
              />
            </div>
            <Button onClick={createFamily} disabled={loading} className="w-full">
              Create Group
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Join Family Group
            </CardTitle>
            <CardDescription>Enter an invite code to join</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC12345"
                maxLength={8}
              />
            </div>
            <Button onClick={joinFamily} disabled={loading} className="w-full">
              Join Group
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Family Groups</CardTitle>
          <CardDescription>Your wellness circles</CardDescription>
        </CardHeader>
        <CardContent>
          {families.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              You're not part of any family groups yet
            </div>
          ) : (
            <div className="space-y-4">
              {families.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div>
                    <h3 className="font-semibold">{member.family_groups.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Role: {member.role}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteCode(member.family_groups.invite_code)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {member.family_groups.invite_code}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
