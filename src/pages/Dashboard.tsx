import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MoodCheckIn } from "@/components/dashboard/MoodCheckIn";
import { MoodHistory } from "@/components/dashboard/MoodHistory";
import { FamilyDashboard } from "@/components/dashboard/FamilyDashboard";
import { AISuggestions } from "@/components/dashboard/AISuggestions";
import { MotivationalContent } from "@/components/dashboard/MotivationalContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Heart, Users, Sparkles, BookOpen, MessageSquare, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  useEffect(() => {
    // Check for checkout success
    if (searchParams.get("checkout") === "success") {
      toast({
        title: "Subscription activated! 🎉",
        description: "Welcome to your 7-day free trial. Enjoy all premium features!",
      });
      // Clear the query param
      navigate("/dashboard", { replace: true });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
        checkSubscription();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
        checkSubscription();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const checkSubscription = async () => {
    setCheckingSubscription(true);
    try {
      await supabase.functions.invoke("check-subscription");
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

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

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open subscription portal",
        variant: "destructive",
      });
    }
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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <div className="flex-1 min-w-0">
            <button 
              onClick={() => navigate("/dashboard")} 
              className="text-2xl font-bold gradient-primary hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary rounded"
              aria-label="Go to dashboard home"
            >
              MindfulU
            </button>
            <p className="text-sm text-muted-foreground truncate">
              Welcome back, {profile?.username}! ({profile?.age_group})
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {profile?.subscription_status && profile.subscription_status !== "free" && (
              <>
                <span className="hidden sm:flex text-xs bg-primary/10 text-primary px-3 py-1 rounded-full items-center gap-1">
                  {profile.subscription_status === "trialing" ? "Free Trial" : "Subscribed"}
                </span>
                <Button onClick={handleManageSubscription} variant="outline" size="sm" className="hidden md:flex" aria-label="Manage subscription">
                  <Settings className="mr-2 h-4 w-4" />
                  Manage
                </Button>
              </>
            )}
            <Button onClick={() => navigate("/chat-rooms")} variant="outline" size="sm" aria-label="Go to chat rooms">
              <MessageSquare className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Chat Rooms</span>
            </Button>
            <Button onClick={handleSignOut} variant="ghost" size="sm" aria-label="Sign out">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="checkin" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="checkin" className="gap-1 sm:gap-2" aria-label="Mood check-in">
              <Heart className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Check-in</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 sm:gap-2" aria-label="Mood history">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs sm:text-sm">History</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-1 sm:gap-2" aria-label="Family dashboard">
              <Users className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Family</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1 sm:gap-2" aria-label="AI suggestions">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs sm:text-sm">AI</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1 sm:gap-2" aria-label="Motivational content">
              <Heart className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Content</span>
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
