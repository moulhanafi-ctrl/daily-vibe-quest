import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, ArrowLeft, Crown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { STRIPE_PLANS } from "@/lib/stripe";

interface ChatRoom {
  id: string;
  focus_area: string;
  name: string;
  description: string;
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Get user's profile with subscription info
        const { data: profile } = await supabase
          .from("profiles")
          .select("selected_focus_areas, subscription_status, subscription_expires_at")
          .eq("id", user.id)
          .single();

        const focusAreas = profile?.selected_focus_areas || [];
        setUserFocusAreas(focusAreas);

        // Check subscription status
        const isActive = profile?.subscription_status === 'active' || 
          (profile?.subscription_status === 'trialing' && 
           profile?.subscription_expires_at && 
           new Date(profile.subscription_expires_at) > new Date());
        
        setHasActiveSubscription(isActive);

        // Get chat rooms for user's focus areas
        const { data: chatRooms, error } = await supabase
          .from("chat_rooms")
          .select("*")
          .in("focus_area", focusAreas);

        if (error) throw error;
        setRooms(chatRooms || []);
      } catch (error) {
        console.error("Error loading chat rooms:", error);
        toast({
          title: "Error",
          description: "Failed to load chat rooms",
          variant: "destructive",
        });
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
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading chat rooms...</p>
      </div>
    );
  }

  return (
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
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No chat rooms available for your focus areas yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/chat/${room.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-primary" />
                        <div>
                          <CardTitle>{room.name}</CardTitle>
                          <CardDescription>{room.description}</CardDescription>
                        </div>
                      </div>
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Join Chat</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRooms;
