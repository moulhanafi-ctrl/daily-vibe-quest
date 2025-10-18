import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, ArrowLeft, Crown, MessageSquareOff, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { STRIPE_PLANS } from "@/lib/stripe";
import { ChatRoomSkeleton } from "@/components/ChatRoomSkeleton";
import { InclusionBanner } from "@/components/InclusionBanner";
import { LegalConsentModal } from "@/components/legal/LegalConsentModal";
import { FeatureGate } from "@/components/FeatureGate";
import { useConsentGate } from "@/hooks/useConsentGate";
import { Badge } from "@/components/ui/badge";
import { ChatRoomOnboarding } from "@/components/chat/ChatRoomOnboarding";
import { useChatRoomPresence } from "@/hooks/useChatRoomPresence";
import { ChatRoomCard } from "@/components/chat/ChatRoomCard";

interface ChatRoom {
  id: string;
  focus_area: string;
  name: string;
  description: string;
  focus_area_key?: string | null;
}

interface Profile {
  selected_focus_areas: string[];
  subscription_status: string;
  subscription_expires_at: string | null;
}

const ChatRooms = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [userFocusAreas, setUserFocusAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  
  // Consent gate
  const {
    showConsentModal,
    setShowConsentModal,
    loading: consentLoading,
    userAgeGroup,
    handleConsentComplete,
  } = useConsentGate("rooms");

  useEffect(() => {
    const loadData = async () => {
      try {
        // Force fresh JWT to pick up role/claims (fixes desktop stale session)
        await supabase.auth.refreshSession().catch(() => {});
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }
        setCurrentUserId(user.id);

        // Use server-side view for access check (not cached client flags)
        const { data: accessData, error: accessError } = await supabase
          .from("my_chat_access")
          .select("allowed, role")
          .single();

        if (accessError) {
          console.error("Error checking chat access:", accessError);
        }

        const role = (accessData?.role || '').toLowerCase();
        const isAdmin = ['owner', 'super_admin', 'admin'].includes(role);
        const canAccess = isAdmin || Boolean(accessData?.allowed);
        
        console.log(`Chat Access Check - Role: ${role}, Is Admin: ${isAdmin}, Can Access: ${canAccess}`);
        setHasActiveSubscription(canAccess);

        // Get user's focus areas (needed for room filtering)
        const { data: profile } = await supabase
          .from("profiles")
          .select("selected_focus_areas, username")
          .eq("id", user.id)
          .maybeSingle();

        const focusAreas = profile?.selected_focus_areas || [];
        setUserFocusAreas(focusAreas);
        setCurrentUsername(profile?.username || "Anonymous");

        // Get chat rooms using safe RPC that works for admins and regular users
        const { data: chatRooms, error } = await supabase
          .rpc("list_rooms_for_me");

        if (error) {
          console.error("Error loading chat rooms:", error);
          toast({
            title: "Error",
            description: "Failed to load chat rooms. Please try refreshing the page.",
            variant: "destructive",
          });
          setRooms([]);
        } else {
          setRooms(chatRooms || []);
          console.log(`Loaded ${chatRooms?.length || 0} chat rooms`);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load chat rooms. Please refresh and try again.",
          variant: "destructive",
        });
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleUpgrade = async (planType: "individual" | "family") => {
    setCheckoutLoading(true);
    try {
      const priceId = STRIPE_PLANS[planType].price_id;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <div className="container max-w-4xl mx-auto py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-6"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Support Chat Rooms</h1>
              <p className="text-muted-foreground">
                Verifying access and loading chat rooms...
              </p>
            </div>
            <ChatRoomSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <FeatureGate flag="rooms">
        <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
          <div className="container max-w-4xl mx-auto py-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>

            <div className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">Support Chat Rooms</h1>
                <p className="text-muted-foreground">
                  Connect with others who share your focus areas
                </p>
              </div>

              <InclusionBanner compact={true} />

              {!hasActiveSubscription ? (
            <Card className="max-w-3xl mx-auto">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-3xl">Upgrade to Access Chat Rooms</CardTitle>
                <CardDescription className="text-base">
                  Connect with others in our supportive community. Start your 7-day free trial today.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Individual Plan</CardTitle>
                      <div className="text-3xl font-bold">$5.99<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                      <CardDescription className="text-xs">Perfect for personal wellness</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full" 
                        onClick={() => handleUpgrade("individual")}
                        disabled={checkoutLoading}
                      >
                        {checkoutLoading ? "Loading..." : "Start Free Trial"}
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2 border-primary">
                    <CardHeader>
                      <div className="inline-block px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium mb-2">
                        Most Popular
                      </div>
                      <CardTitle className="text-lg">Family Plan</CardTitle>
                      <div className="text-3xl font-bold">$9.99<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                      <CardDescription className="text-xs">For families supporting each other</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        variant="hero"
                        className="w-full" 
                        onClick={() => handleUpgrade("family")}
                        disabled={checkoutLoading}
                      >
                        {checkoutLoading ? "Loading..." : "Start Free Trial"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    ✓ 7-day free trial &nbsp;•&nbsp; ✓ No credit card required &nbsp;•&nbsp; ✓ Cancel anytime
                  </p>
                  <div className="pt-4">
                    <p className="text-sm font-medium mb-2">What you'll get:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 24/7 peer support chat rooms</li>
                      <li>• Age-appropriate safe spaces</li>
                      <li>• AI-powered wellness suggestions</li>
                      <li>• Community with people who understand</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : rooms.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-8">
                <div className="flex flex-col items-center justify-center text-center py-8">
                  <MessageSquareOff className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Chat Rooms Yet</h3>
                  <p className="text-muted-foreground max-w-md mb-4">
                    There are no chat rooms available for your selected focus areas at the moment. 
                    We're constantly adding new rooms!
                  </p>
                  <Button variant="outline" onClick={() => navigate("/dashboard")}>
                    Return to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <ChatRoomCard
                  key={room.id}
                  room={room}
                  currentUserId={currentUserId}
                  currentUsername={currentUsername}
                  onNavigate={(path) => navigate(path)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </FeatureGate>
    
    <ChatRoomOnboarding onComplete={() => console.log("Onboarding completed")} />
    
    <LegalConsentModal
      open={showConsentModal}
      onClose={() => setShowConsentModal(false)}
      onConsent={handleConsentComplete}
      userAgeGroup={userAgeGroup}
    />
  </>
  );
};

export default ChatRooms;
