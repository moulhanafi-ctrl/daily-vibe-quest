import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FamilyStories } from "@/components/family/FamilyStories";
import ChatComingSoonModal from "@/components/family/ChatComingSoonModal";

export default function FamilyChat() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stories");
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl overflow-x-hidden">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")} 
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Family Connection</h1>
          <p className="text-muted-foreground text-base">
            Share moments and stay connected with your loved ones
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-xl">
            <TabsTrigger value="chat" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
              <Video className="h-5 w-5" />
              <span className="font-medium">Stories</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <Card className="rounded-2xl border border-border bg-card shadow-sm p-8 md:p-12">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Family Chat Coming Soon</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Connect with your family through secure, private messaging. We're working hard to bring this feature to you.
                  </p>
                </div>
                <Button 
                  onClick={() => setShowNotifyModal(true)}
                  className="mt-2 rounded-xl px-6 h-11"
                  size="lg"
                >
                  Notify Me When It Launches
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stories" className="space-y-4">
            <FamilyStories />
          </TabsContent>
        </Tabs>
      </div>

      <ChatComingSoonModal 
        open={showNotifyModal}
        onOpenChange={setShowNotifyModal}
      />
    </div>
  );
}
