import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Copy, UserPlus } from "lucide-react";
import { format } from "date-fns";

interface Child {
  id: string;
  first_name: string;
  age: number;
  latestMood?: {
    mood: string;
    intensity: number;
    created_at: string;
  };
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: "😊",
  calm: "😌",
  anxious: "😰",
  sad: "😢",
  angry: "😠",
  excited: "🤩",
  tired: "😴",
};

export const ParentDashboard = () => {
  const [children, setChildren] = useState<Child[]>([]);
  const [inviteCode, setInviteCode] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
    generateInviteCode();
    subscribeToMoodUpdates();
  }, []);

  const loadChildren = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all children linked to this parent
      const { data: childProfiles, error } = await supabase
        .from("profiles")
        .select("id, first_name, age")
        .eq("parent_id", user.id);

      if (error) throw error;

      // Get latest mood for each child
      const childrenWithMoods = await Promise.all(
        (childProfiles || []).map(async (child) => {
          const { data: moods } = await supabase
            .from("moods")
            .select("mood, intensity, created_at")
            .eq("user_id", child.id)
            .order("created_at", { ascending: false })
            .limit(1);

          return {
            ...child,
            latestMood: moods?.[0],
          };
        })
      );

      setChildren(childrenWithMoods);
    } catch (error) {
      console.error("Error loading children:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if there's an active invite code
      const { data: existingInvite } = await supabase
        .from("family_invites")
        .select("invite_code")
        .eq("parent_id", user.id)
        .eq("is_used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (existingInvite) {
        setInviteCode(existingInvite.invite_code);
        return;
      }

      // Generate new code
      const { data, error } = await supabase.rpc("generate_family_invite_code");
      if (error) throw error;

      const newCode = data;

      // Save invite code
      await supabase.from("family_invites").insert({
        parent_id: user.id,
        invite_code: newCode,
      });

      setInviteCode(newCode);
    } catch (error) {
      console.error("Error generating invite code:", error);
    }
  };

  const subscribeToMoodUpdates = () => {
    const channel = supabase
      .channel("parent-mood-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "moods",
        },
        (payload) => {
          // Reload children data when a new mood is added
          loadChildren();
          
          // Show notification
          const mood = payload.new as any;
          toast({
            title: `📱 New check-in!`,
            description: `Your child just checked in feeling ${MOOD_EMOJIS[mood.mood] || mood.mood}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({ title: "✨ Code copied!" });
  };

  if (loading) {
    return <div className="p-8 text-center">Loading family dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">👨‍👩‍👧 Family Dashboard</CardTitle>
              <CardDescription>Keep track of your family's vibes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {inviteCode && (
            <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Share this code with your child:</p>
                  <p className="text-3xl font-mono font-bold tracking-widest">{inviteCode}</p>
                </div>
                <Button onClick={copyInviteCode} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {children.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No children linked yet</p>
              <p className="text-sm text-muted-foreground">
                Share your invite code with your child to get started!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {children.map((child) => (
                <Card key={child.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-5xl emoji-pulse">
                          {child.latestMood 
                            ? MOOD_EMOJIS[child.latestMood.mood]
                            : "😊"
                          }
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{child.first_name}</h3>
                          <p className="text-sm text-muted-foreground">Age {child.age}</p>
                          {child.latestMood && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Last check-in: {format(new Date(child.latestMood.created_at), "MMM d, h:mm a")}
                            </p>
                          )}
                        </div>
                      </div>
                      {child.latestMood && (
                        <div className="text-right">
                          <div className="text-sm font-medium capitalize">
                            {child.latestMood.mood}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Intensity: {child.latestMood.intensity}/5
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
