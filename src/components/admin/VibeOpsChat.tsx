import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolResults?: any[];
}

interface VibeOpsChatProps {
  onActionProposed: (action: any) => void;
}

export interface VibeOpsChatRef {
  sendCommand: (command: string) => void;
}

export const VibeOpsChat = forwardRef<VibeOpsChatRef, VibeOpsChatProps>(
  ({ onActionProposed }, ref) => {
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([
      {
        role: "assistant",
        content: "Hi! I'm VibeOps. I can triage incidents, summarize rooms, draft communications, manage store items, and surface analytics. I'll always show you my plan first—nothing goes live without your OK. How can I help?",
      },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" });
      }
    };

    const sendMessage = async (messageText?: string) => {
      const textToSend = messageText || input.trim();
      if (!textToSend || isLoading) return;

      const userMessage: Message = { role: "user", content: textToSend };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke("admin-ai-chat", {
          body: {
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          },
        });

        if (error) throw error;

        const assistantMessage: Message = {
          role: "assistant",
          content: data.message || "I received your request.",
          toolResults: data.toolResults,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Check if any tool results require approval
        if (data.toolResults) {
          for (const result of data.toolResults) {
            if (result.result?.requiresApproval) {
              onActionProposed(result.result);
            }
          }
        }
      } catch (error: any) {
        console.error("Chat error:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to send message. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };

    // Expose sendCommand to parent via ref
    useImperativeHandle(ref, () => ({
      sendCommand: (command: string) => {
        sendMessage(command);
      },
    }));

    return (
      <div className="flex flex-col h-full">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Tool Results */}
                  {message.toolResults && message.toolResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.toolResults.map((result: any, idx: number) => (
                        <div key={idx} className="text-xs bg-background/50 rounded p-2">
                          <div className="font-semibold mb-1">🔧 {result.toolName}</div>
                          {result.result?.requiresApproval && (
                            <div className="text-amber-600 dark:text-amber-400">
                              ⚠️ Requires Approval
                            </div>
                          )}
                          {result.result?.incidents && (
                            <div>Found {result.result.incidents.length} incidents</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask VibeOps to help with moderation, summaries, or actions..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

VibeOpsChat.displayName = "VibeOpsChat";
