import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MoodCheckIn } from "@/components/dashboard/MoodCheckIn";
import { MoodHistory } from "@/components/dashboard/MoodHistory";
import { FamilyDashboard } from "@/components/dashboard/FamilyDashboard";
import { AISuggestions } from "@/components/dashboard/AISuggestions";
import { MotivationalContent } from "@/components/dashboard/MotivationalContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Heart, Users, Sparkles, BookOpen, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold gradient-primary">MindfulU</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {profile?.username}! ({profile?.age_group})
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/chat-rooms")} variant="outline" size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat Rooms
            </Button>
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="checkin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="checkin" className="gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Check-in</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Family</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checkin">
            <MoodCheckIn userId={user?.id} ageGroup={profile?.age_group} />
          </TabsContent>

          <TabsContent value="history">
            <MoodHistory userId={user?.id} />
          </TabsContent>

          <TabsContent value="family">
            <FamilyDashboard userId={user?.id} />
          </TabsContent>

          <TabsContent value="ai">
            <AISuggestions userId={user?.id} />
          </TabsContent>

          <TabsContent value="content">
            <MotivationalContent ageGroup={profile?.age_group} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
