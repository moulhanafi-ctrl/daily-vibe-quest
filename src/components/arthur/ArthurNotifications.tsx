import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ArthurMessage {
  id: string;
  content_sent: string;
  message_type: string;
  delivered_at: string;
  opened_at: string | null;
}

export const ArthurNotifications = () => {
  const [messages, setMessages] = useState<ArthurMessage[]>([]);
  const [showMessages, setShowMessages] = useState(true);

  useEffect(() => {
    loadArthurMessages();
    markAsOpened();
  }, []);

  const loadArthurMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data, error } = await supabase
      .from('arthur_deliveries')
      .select('*')
      .eq('user_id', user.id)
      .gte('delivered_at', oneDayAgo.toISOString())
      .is('opened_at', null)
      .order('delivered_at', { ascending: false });

    if (error) {
      console.error('Error loading Mostapha messages:', error);
      return;
    }

    setMessages((data as ArthurMessage[]) || []);
  };

  const markAsOpened = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || messages.length === 0) return;

    const messageIds = messages.map(m => m.id);
    
    await supabase
      .from('arthur_deliveries')
      .update({ opened_at: new Date().toISOString() })
      .in('id', messageIds)
      .is('opened_at', null);
  };

  const dismissMessage = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  if (!showMessages || messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      {messages.map((message) => (
        <Card key={message.id} className="mb-2 shadow-lg border-primary/20 animate-in slide-in-from-bottom">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground whitespace-pre-wrap">
                  {message.content_sent}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(message.delivered_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => dismissMessage(message.id)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
