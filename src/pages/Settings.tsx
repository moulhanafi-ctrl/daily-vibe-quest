import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Globe, Shield, Bell } from "lucide-react";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { DataRights } from "@/components/legal/DataRights";
import { ArthurSettings } from "@/components/arthur/ArthurSettings";
import { ParentNotificationSettings } from "@/components/family/ParentNotificationSettings";
import { TestContact } from "@/components/family/TestContact";

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

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
          <TabsList className="grid w-full grid-cols-5">
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

          <TabsContent value="language">
            <Card className="p-6">
              <LanguageSelector />
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <DataRights />
          </TabsContent>

          <TabsContent value="notifications">
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
    </div>
  );
};

export default Settings;
