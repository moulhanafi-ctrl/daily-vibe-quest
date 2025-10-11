import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FamilyStories } from "@/components/family/FamilyStories";

export default function FamilyChat() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Family Connection</h1>
          <p className="text-muted-foreground mt-2">
            Share moments and stay connected
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-2">
              <Video className="h-4 w-4" />
              Stories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Family Chat Coming Soon</p>
              <p className="text-sm">
                Connect with your family through secure messaging
              </p>
            </div>
          </TabsContent>

          <TabsContent value="stories" className="space-y-4">
            <FamilyStories />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
