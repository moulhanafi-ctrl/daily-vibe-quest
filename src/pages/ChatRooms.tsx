import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl">Premium Feature</CardTitle>
                <CardDescription>
                  Access to community chat rooms is available with a premium subscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Join our supportive community and connect with others who share your focus areas. 
                    Get instant access to:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>24/7 peer support chat rooms</li>
                    <li>Age-appropriate safe spaces</li>
                    <li>Moderated discussions</li>
                    <li>Connect with people who understand</li>
                  </ul>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => navigate("/")}
                >
                  View Pricing Plans
                </Button>
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
