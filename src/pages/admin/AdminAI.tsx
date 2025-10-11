import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { VibeOpsChat } from "@/components/admin/VibeOpsChat";
import { ActionPanel } from "@/components/admin/ActionPanel";
import { AdminGuide } from "@/components/admin/AdminGuide";

export default function AdminAI() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role, admin_role")
        .eq("user_id", session.user.id)
        .single();

      if (error || (!roles?.role && !roles?.admin_role)) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setHasAccess(true);
    } catch (error) {
      console.error("Access check error:", error);
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">VibeOps Admin Assistant</h1>
              <p className="text-muted-foreground">
                AI-powered moderation and community operations
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/admin/analytics")}>
              View Analytics
            </Button>
          </div>
        </div>

        {/* Main Layout: Chat (left) + Action Panel (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <Card className="h-[calc(100vh-250px)]">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  <span>VibeOps Assistant</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask me to triage incidents, summarize rooms, or propose moderation actions
                </p>
              </CardHeader>
              <CardContent className="p-0 h-[calc(100%-80px)]">
                <VibeOpsChat onActionProposed={setPendingAction} />
              </CardContent>
            </Card>
          </div>

          {/* Action Panel - Takes 1 column */}
          <div className="lg:col-span-1">
            <ActionPanel pendingAction={pendingAction} onActionComplete={() => setPendingAction(null)} />
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-md text-sm transition-colors"
                    onClick={() => {
                      // TODO: Set a pre-filled prompt
                    }}
                  >
                    🚨 Triage Overnight Incidents
                  </button>
                  <button
                    className="px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-md text-sm transition-colors"
                    onClick={() => {
                      // TODO: Set a pre-filled prompt
                    }}
                  >
                    📊 Summarize Top 5 Rooms
                  </button>
                  <button
                    className="px-4 py-2 bg-primary/10 hover:bg-primary/20 rounded-md text-sm transition-colors"
                    onClick={() => {
                      // TODO: Set a pre-filled prompt
                    }}
                  >
                    📝 Draft Community Update
                  </button>
                </div>
              </CardContent>
            </Card>
            
            <AdminGuide />
          </div>
        </div>
      </div>
    </div>
  );
}