import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Globe } from "lucide-react";

export const CrisisResources = () => {
  const { t, i18n } = useTranslation("legal");
  const currentLanguage = i18n.language;

  // Determine which crisis resources to show based on language
  const showUSResources = currentLanguage === "en" || currentLanguage === "es";
  const showInternationalFallback = currentLanguage === "fr" || currentLanguage === "ar";

  return (
    <div className="space-y-4">
      {showUSResources && (
        <Card className="p-6 bg-red-500/10 border-red-500/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <Phone className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{t("banner.988")}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {currentLanguage === "es" 
                  ? "Línea de Vida para Crisis y Suicidio disponible 24/7"
                  : "Suicide & Crisis Lifeline available 24/7"}
              </p>
              <a 
                href="tel:988" 
                className="text-lg font-bold text-red-500 hover:text-red-600"
              >
                988
              </a>
            </div>
          </div>
        </Card>
      )}

      {showInternationalFallback && (
        <Card className="p-6 bg-red-500/10 border-red-500/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <Globe className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                {currentLanguage === "fr" 
                  ? "Ressources Internationales"
                  : "موارد دولية"}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {currentLanguage === "fr"
                  ? "Trouvez des lignes d'aide locales dans votre région"
                  : "ابحث عن خطوط المساعدة المحلية في منطقتك"}
              </p>
              <Button variant="outline" asChild>
                <a 
                  href="https://findahelpline.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <Globe className="h-4 w-4" />
                  findahelpline.com
                </a>
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 bg-secondary/20">
        <h3 className="font-semibold mb-2">{t("common:emergency", "Emergency")}</h3>
        <p className="text-sm text-muted-foreground">
          {currentLanguage === "es" 
            ? "Si estás en peligro inmediato, llama a los servicios de emergencia locales."
            : currentLanguage === "fr"
            ? "Si vous êtes en danger immédiat, appelez les services d'urgence locaux."
            : currentLanguage === "ar"
            ? "إذا كنت في خطر فوري، اتصل بخدمات الطوارئ المحلية."
            : "If you're in immediate danger, call your local emergency services."}
        </p>
      </Card>
    </div>
  );
};
