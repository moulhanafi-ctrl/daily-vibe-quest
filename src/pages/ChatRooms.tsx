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

const ChatRooms = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [userFocusAreas, setUserFocusAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Get user's focus areas
        const { data: profile } = await supabase
          .from("profiles")
          .select("selected_focus_areas")
          .eq("id", user.id)
          .single();

        const focusAreas = profile?.selected_focus_areas || [];
        setUserFocusAreas(focusAreas);

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

          {rooms.length === 0 ? (
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
