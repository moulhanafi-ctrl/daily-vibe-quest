import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2, MessageSquareOff, MoreVertical, Flag, VolumeX, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessageSkeleton } from "@/components/ChatMessageSkeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

interface Message {
  id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
}

const ChatRoom = () => {
  const { roomId, focusArea } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [room, setRoom] = useState<Room | null>(null);
  const [resolvedRoomId, setResolvedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [reportingMessage, setReportingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MAX_MESSAGE_LENGTH = 500;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }
        setCurrentUserId(user.id);

        // Get username and age_group
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, age_group")
          .eq("id", user.id)
          .single();

        setUsername(profile?.username || "Anonymous");

        let activeRoomId = roomId;

        // If focusArea is provided, find the matching room for user's age group
        if (focusArea && !roomId) {
          const { data: matchingRoom, error: roomFindError } = await supabase
            .from("chat_rooms")
            .select("id")
            .eq("focus_area", focusArea)
            .eq("age_group", profile?.age_group || "adult")
            .limit(1)
            .maybeSingle();

          if (roomFindError) throw roomFindError;
          
          if (!matchingRoom) {
            toast({
              title: "Chat room not found",
              description: "No chat room found for this focus area",
              variant: "destructive",
            });
            navigate("/chat-rooms");
            return;
          }

          activeRoomId = matchingRoom.id;
          setResolvedRoomId(matchingRoom.id);
        }

        if (!activeRoomId) {
          navigate("/chat-rooms");
          return;
        }

        // Get room details
        const { data: roomData, error: roomError } = await supabase
          .from("chat_rooms")
          .select("*")
          .eq("id", activeRoomId)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        // Get messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", activeRoomId)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(messagesData || []);
        
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Error loading chat room:", error);
        toast({
          title: "Error",
          description: "Failed to load chat room",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [roomId, focusArea, navigate]);

  useEffect(() => {
    const activeRoomId = resolvedRoomId || roomId;
    if (!activeRoomId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeRoomId}`
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, resolvedRoomId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeRoomId = resolvedRoomId || roomId;
    if (!newMessage.trim() || !activeRoomId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          room_id: activeRoomId,
          user_id: currentUserId,
          username: username,
          message: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const groupMessages = (messages: Message[]) => {
    const grouped: Array<Message & { showUsername: boolean }> = [];
    messages.forEach((msg, idx) => {
      const prevMsg = messages[idx - 1];
      const showUsername = !prevMsg || prevMsg.user_id !== msg.user_id;
      grouped.push({ ...msg, showUsername });
    });
    return grouped;
  };

  const handleMuteUser = (userId: string) => {
    setMutedUsers(prev => new Set(prev).add(userId));
    trackEvent({ eventType: "room_mute", metadata: { room_id: roomId, muted_user_id: userId } });
    toast({ title: "User muted", description: "You won't see messages from this user anymore." });
  };

  const handleReportMessage = async (messageId: string) => {
    setReportingMessage(null);
    const activeRoomId = resolvedRoomId || roomId;
    try {
      const { error } = await supabase.from("incidents").insert({
        room_id: activeRoomId,
        message_id: messageId,
        user_id: currentUserId,
        category: "inappropriate_content",
        severity: "medium",
        status: "open",
        description: "Reported via chat room"
      });

      if (error) throw error;

      trackEvent({ eventType: "room_report", metadata: { room_id: activeRoomId, message_id: messageId } });
      toast({ title: "Report submitted", description: "Thank you. Our moderation team will review this." });
    } catch (error) {
      console.error("Error reporting message:", error);
      toast({ title: "Error", description: "Failed to submit report", variant: "destructive" });
    }
  };

  const groupedMessages = groupMessages(messages.filter(msg => !mutedUsers.has(msg.user_id)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-2 sm:p-4">
      <div className="container max-w-4xl mx-auto py-4 sm:py-8 h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] flex flex-col">
        <Button
          variant="ghost"
          onClick={() => navigate("/chat-rooms")}
          className="mb-4 self-start"
          aria-label="Back to chat rooms"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back to Rooms</span>
          <span className="sm:hidden">Back</span>
        </Button>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl">{room?.name || "Chat Room"}</CardTitle>
                {room?.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{room.description}</p>
                )}
              </div>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-accent" 
                onClick={() => navigate("/legal/community-guidelines")}
                role="button"
                aria-label={t("rooms.rules_aria")}
              >
                <Shield className="w-3 h-3 mr-1" />
                <span className="text-xs">{t("rooms.rules_chip")}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 p-3 sm:p-6 pt-0">
            {loading ? (
              <ChatMessageSkeleton />
            ) : (
              <>
                <ScrollArea className="flex-1 pr-2 sm:pr-4 mb-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <MessageSquareOff className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Be the first to start the conversation! Share your thoughts and connect with others.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {groupedMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${
                            msg.user_id === currentUserId ? "justify-end" : "justify-start"
                          }`}
                        >
                          {msg.user_id !== currentUserId && msg.showUsername && (
                            <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(msg.username)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {msg.user_id !== currentUserId && !msg.showUsername && (
                            <div className="w-8" />
                          )}
                          <div className="flex gap-1 items-start max-w-[85%] sm:max-w-[70%]">
                            <div
                              className={`rounded-lg p-2 sm:p-3 flex-1 ${
                                msg.user_id === currentUserId
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {msg.user_id !== currentUserId && msg.showUsername && (
                                <p className="text-xs font-semibold mb-1">{msg.username}</p>
                              )}
                              <p className="text-sm break-words">{msg.message}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(msg.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            {msg.user_id !== currentUserId && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setReportingMessage(msg.id)}>
                                    <Flag className="mr-2 h-4 w-4" />
                                    Report
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleMuteUser(msg.user_id)}>
                                    <VolumeX className="mr-2 h-4 w-4" />
                                    Mute User
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                <form onSubmit={sendMessage} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                      placeholder="Type your message..."
                      className="flex-1"
                      disabled={sending}
                      maxLength={MAX_MESSAGE_LENGTH}
                      aria-label="Message input"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={sending || !newMessage.trim()}
                      aria-label="Send message"
                      className="flex-shrink-0"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs text-muted-foreground">
                      Press Enter to send
                    </span>
                    <span className={`text-xs ${
                      newMessage.length > MAX_MESSAGE_LENGTH * 0.9 
                        ? "text-destructive font-medium" 
                        : "text-muted-foreground"
                    }`}>
                      {newMessage.length}/{MAX_MESSAGE_LENGTH}
                    </span>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!reportingMessage} onOpenChange={() => setReportingMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report this message?</AlertDialogTitle>
            <AlertDialogDescription>
              Our moderation team will review this report. False reports may result in action on your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => reportingMessage && handleReportMessage(reportingMessage)}>
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatRoom;
