import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface FamilyMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

export function FamilyChatInterface() {
  const [familyGroupId, setFamilyGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MAX_MESSAGE_LENGTH = 1000;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Authentication required",
            description: "Please sign in to use family chat",
            variant: "destructive",
          });
          return;
        }

        setCurrentUserId(user.id);

        // Get username
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();

        if (profile) {
          setUsername(profile.username || "Anonymous");
        }

        // Get user's family group
        const { data: familyMember } = await supabase
          .from("family_members")
          .select("family_id")
          .eq("user_id", user.id)
          .single();

        if (!familyMember) {
          setLoading(false);
          return;
        }

        setFamilyGroupId(familyMember.family_id);

        // Load existing messages
        const { data: existingMessages, error: messagesError } = await supabase
          .from("family_messages")
          .select("*")
          .eq("family_group_id", familyMember.family_id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (messagesError) throw messagesError;
        setMessages(existingMessages || []);

        // Subscribe to new messages
        const channel = supabase
          .channel(`family_chat:${familyMember.family_id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "family_messages",
              filter: `family_group_id=eq.${familyMember.family_id}`,
            },
            (payload) => {
              setMessages((prev) => [...prev, payload.new as FamilyMessage]);
            }
          )
          .subscribe();

        setLoading(false);

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error: any) {
        console.error("Error initializing family chat:", error);
        toast({
          title: "Error",
          description: "Failed to load family chat",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !familyGroupId) return;

    if (newMessage.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Message too long",
        description: `Please keep messages under ${MAX_MESSAGE_LENGTH} characters`,
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.from("family_messages").insert({
        family_group_id: familyGroupId,
        user_id: currentUserId,
        username: username,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (!familyGroupId) {
    return (
      <Card className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-10">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Join a Family Group First</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              To use family chat, you need to create or join a family group.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.user_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"}>
                        {msg.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[75%]`}>
                      <span className="text-xs text-muted-foreground mb-1">{msg.username}</span>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              maxLength={MAX_MESSAGE_LENGTH}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {newMessage.length}/{MAX_MESSAGE_LENGTH} characters
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
