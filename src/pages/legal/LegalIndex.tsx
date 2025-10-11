import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FileText, Shield, Users, Heart, AlertTriangle, CreditCard } from "lucide-react";

const LegalIndex = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("legal");

  const legalPages = [
    {
      icon: FileText,
      path: "/terms",
      titleKey: "index.terms.title",
      descKey: "index.terms.description",
      version: "1.0.0",
      updated: "January 11, 2025"
    },
    {
      icon: Shield,
      path: "/privacy",
      titleKey: "index.privacy.title",
      descKey: "index.privacy.description",
      version: "1.0.0",
      updated: "January 11, 2025"
    },
    {
      icon: Users,
      path: "/community-guidelines",
      titleKey: "index.guidelines.title",
      descKey: "index.guidelines.description",
      version: "1.0.0",
      updated: "January 11, 2025"
    },
    {
      icon: Heart,
      path: "/inclusion",
      titleKey: "index.inclusion.title",
      descKey: "index.inclusion.description",
      version: "1.0.0",
      updated: "January 11, 2025"
    },
    {
      icon: AlertTriangle,
      path: "/crisis",
      titleKey: "index.crisis.title",
      descKey: "index.crisis.description",
      version: "1.0.0",
      updated: "January 11, 2025"
    },
    {
      icon: CreditCard,
      path: "/policies/refunds",
      titleKey: "index.refunds.title",
      descKey: "index.refunds.description",
      version: "1.0.0",
      updated: "January 11, 2025"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common:back", "Back")}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{t("index.title")}</h1>
          <p className="text-muted-foreground">{t("index.subtitle")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {legalPages.map((page) => {
            const Icon = page.icon;
            return (
              <Card 
                key={page.path}
                className="p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary/50"
                onClick={() => navigate(page.path)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{t(page.titleKey)}</h2>
                    <p className="text-sm text-muted-foreground mb-3">{t(page.descKey)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t("index.version", { version: page.version })}</span>
                      <span>•</span>
                      <span>{t("index.lastUpdated", { date: page.updated })}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="mt-8 p-6 bg-secondary/20">
          <h2 className="text-lg font-semibold mb-2">{t("common:contact", "Questions?")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("common:contactText", "Contact us at")}{" "}
            <a href="mailto:legal@vibecheck.app" className="text-primary underline">
              legal@vibecheck.app
            </a>
          </p>
        </Card>
      </main>
    </div>
  );
};

export default LegalIndex;
