import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MessageSquare, Video, Users, UserPlus, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FamilyStories } from "@/components/family/FamilyStories";
import ChatComingSoonModal from "@/components/family/ChatComingSoonModal";
import { AddFamilyMemberModal } from "@/components/family/AddFamilyMemberModal";
import { supabase } from "@/integrations/supabase/client";

export default function FamilyChat() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stories");
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isParent, setIsParent] = useState(false);

  useEffect(() => {
    const checkParentStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_parent")
        .eq("id", user.id)
        .single();

      setIsParent(profile?.is_parent || false);
    };

    checkParentStatus();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 md:px-8 py-6 md:py-8 max-w-6xl">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")} 
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Family Connection</h1>
              <p className="text-muted-foreground text-sm">
                Share moments and stay connected with your loved ones
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowInviteModal(true)}
                variant="outline"
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Family
              </Button>
              {isParent && (
                <Button 
                  onClick={() => navigate("/family/stories-archive")}
                  variant="outline"
                  size="sm"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Memories Archive
                </Button>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 h-12 rounded-xl">
            <TabsTrigger value="chat" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
              <Video className="h-5 w-5" />
              <span className="font-medium">Stories</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
              <Users className="h-5 w-5" />
              <span className="font-medium">Members</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <div className="mx-auto w-full max-w-3xl">
              <Card className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-10">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Family Chat Coming Soon</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Connect with your family through secure, private messaging. We're working hard to bring this feature to you.
                    </p>
                  </div>
                  <Button 
                    type="button"
                    onClick={() => setShowNotifyModal(true)}
                    className="mt-4 rounded-xl px-5 h-11"
                    size="lg"
                  >
                    Notify Me When It Launches
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stories">
            <FamilyStories />
          </TabsContent>

          <TabsContent value="members">
            <div className="mx-auto w-full max-w-3xl">
              <Card className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-10">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Manage Your Family Members</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Invite your loved ones, view who's connected, and manage your family network all in one place.
                    </p>
                  </div>
                  <Button 
                    type="button"
                    onClick={() => navigate("/family/members")}
                    className="mt-4 rounded-xl px-5 h-11"
                    size="lg"
                  >
                    View Family Members
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ChatComingSoonModal 
        open={showNotifyModal}
        onOpenChange={setShowNotifyModal}
      />

      <AddFamilyMemberModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setShowInviteModal(false);
        }}
      />
    </div>
  );
}
