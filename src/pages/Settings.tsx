import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Globe, Shield, Bell, Target, User } from "lucide-react";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { DataRights } from "@/components/legal/DataRights";
import { ArthurSettings } from "@/components/arthur/ArthurSettings";
import { ParentNotificationSettings } from "@/components/family/ParentNotificationSettings";
import { PushNotificationSettings } from "@/components/settings/PushNotificationSettings";
import { TestContact } from "@/components/family/TestContact";
import { FocusAreasPopup } from "@/components/dashboard/FocusAreasPopup";

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [userId, setUserId] = useState<string | null>(null);
  const [showFocusPopup, setShowFocusPopup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back", "Back")}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">{t("settings", "Settings")}</h1>

        <Tabs defaultValue="language" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              {t("profile", "Profile")}
            </TabsTrigger>
            <TabsTrigger value="language" className="gap-2">
              <Globe className="h-4 w-4" />
              {t("language", "Language")}
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="h-4 w-4" />
              {t("privacy", "Privacy")}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              {t("notifications", "Notifications")}
            </TabsTrigger>
            <TabsTrigger value="arthur" className="gap-2">
              ✨ Arthur
            </TabsTrigger>
            <TabsTrigger value="developer" className="gap-2">
              🔧 QA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Focus Areas</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose up to 3 areas where you'd like support and guidance. You can update these anytime.
                  </p>
                  <Button 
                    onClick={() => setShowFocusPopup(true)}
                    className="bg-gradient-to-r from-[hsl(180,70%,70%)] to-[hsl(270,65%,75%)] hover:opacity-90 transition-all shadow-[0_4px_16px_rgba(122,241,199,0.3)]"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Update Focus Areas
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="language">
            <Card className="p-6">
              <LanguageSelector />
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <DataRights />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <PushNotificationSettings />
            <ParentNotificationSettings />
          </TabsContent>

          <TabsContent value="arthur">
            <ArthurSettings />
          </TabsContent>

          <TabsContent value="developer">
            <TestContact />
          </TabsContent>
        </Tabs>
      </main>

      {showFocusPopup && userId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <FocusAreasPopup 
              userId={userId} 
              onClose={() => setShowFocusPopup(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
