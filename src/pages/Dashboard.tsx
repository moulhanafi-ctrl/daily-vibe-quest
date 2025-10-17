import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MoodCheckIn } from "@/components/dashboard/MoodCheckIn";
import { MoodHistory } from "@/components/dashboard/MoodHistory";
import { FamilyDashboard } from "@/components/dashboard/FamilyDashboard";
import { AISuggestions } from "@/components/dashboard/AISuggestions";
import { MotivationalContent } from "@/components/dashboard/MotivationalContent";
import { SaturdayTriviaCard } from "@/components/dashboard/SaturdayTriviaCard";
import { ArthurSettings } from "@/components/arthur/ArthurSettings";
import { FocusAreasPopup } from "@/components/dashboard/FocusAreasPopup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Heart, Users, Sparkles, BookOpen, MessageSquare, Settings, ShoppingBag, Book, MapPin, Trophy, Target, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { useAdminCheck } from "@/hooks/useAdminCheck";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [showFocusPopup, setShowFocusPopup] = useState(false);
  const triviaEnabled = useFeatureFlag("ff.trivia");
  const { isAdmin } = useAdminCheck();

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

    // Check for first check-in completion - redirect to journal
    if (searchParams.get("first_checkin") === "true") {
      toast({
        title: "Great start! 🎉",
        description: "Now let's capture your thoughts. Pick a prompt or start writing.",
      });
      navigate("/journal?first_entry=true", { replace: true });
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
        <div className="container mx-auto px-4 py-3">
          {/* Brand Row */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => navigate("/dashboard")} 
              className="text-xl font-semibold bg-gradient-to-r from-[hsl(270,65%,75%)] to-[hsl(340,75%,70%)] bg-clip-text text-transparent hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary rounded px-2"
              aria-label="Go to dashboard home"
              style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}
            >
              MindfulU
            </button>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground hidden sm:block">
                Welcome back, {profile?.username}! ({profile?.age_group})
              </p>
              {isAdmin && (
                <Button 
                  onClick={() => navigate("/admin")} 
                  variant="outline" 
                  size="sm" 
                  className="border-primary hover:bg-primary/10 hover:shadow-[0_0_12px_rgba(147,51,234,0.3)] transition-all"
                  aria-label="Admin Dashboard"
                >
                  <Shield className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Row */}
          <div id="main-content" className="flex justify-center items-center gap-2 flex-wrap">
            <Button 
              onClick={() => setShowFocusPopup(true)} 
              variant="outline" 
              size="sm" 
              className="border-[hsl(180,70%,70%)] hover:bg-[hsl(180,70%,70%)]/10 hover:shadow-[0_0_12px_rgba(122,241,199,0.3)] transition-all"
              aria-label="Update focus areas"
            >
              <Target className="h-4 w-4 sm:mr-2" />
              <span className="hidden lg:inline">Focus Areas</span>
            </Button>
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
            <Button onClick={() => navigate("/library")} variant="outline" size="sm" aria-label="Go to library">
              📚 <span className="hidden sm:inline ml-2">Library</span>
            </Button>
            <Button onClick={() => navigate("/journal")} variant="outline" size="sm" aria-label="Go to journal">
              <Book className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Journal</span>
            </Button>
            {triviaEnabled && (
              <Button onClick={() => navigate("/trivia/sessions")} variant="outline" size="sm" aria-label="Saturday Trivia">
                <Trophy className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Trivia</span>
              </Button>
            )}
            <Button onClick={() => navigate("/store")} variant="outline" size="sm" aria-label="Go to store">
              <ShoppingBag className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Store</span>
            </Button>
            <Button onClick={() => navigate("/help")} variant="outline" size="sm" aria-label="Help & Resources">
              <MapPin className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Help</span>
            </Button>
            <Button onClick={() => navigate("/family/chat")} variant="outline" size="sm" aria-label="Family Stories">
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Family</span>
            </Button>
            <Button onClick={() => navigate("/chat-rooms")} variant="outline" size="sm" aria-label="Go to chat rooms">
              <MessageSquare className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Chat Rooms</span>
            </Button>
            <Button onClick={() => navigate("/settings")} variant="outline" size="sm" aria-label="Settings">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
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
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
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
            <TabsTrigger value="settings" className="gap-1 sm:gap-2" aria-label="Settings">
              <Settings className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Settings</span>
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
            <div className="space-y-6">
              <SaturdayTriviaCard userId={user?.id} ageGroup={profile?.age_group} />
              <MotivationalContent ageGroup={profile?.age_group} />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <ArthurSettings />
          </TabsContent>
        </Tabs>
      </main>

      {showFocusPopup && user?.id && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <FocusAreasPopup 
              userId={user.id} 
              onClose={() => setShowFocusPopup(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
