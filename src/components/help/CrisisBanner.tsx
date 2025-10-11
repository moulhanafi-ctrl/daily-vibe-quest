import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CrisisBanner = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  // US English/Spanish → show 988
  const isUS = currentLang === "en" || currentLang === "es";

  return (
    <Alert variant="destructive" className="sticky top-0 z-50 rounded-none border-x-0">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="flex-1">
          {isUS ? (
            <>
              <strong>Need urgent help?</strong> Call or text <strong>988</strong> (US)
            </>
          ) : (
            <>
              <strong>Need urgent help?</strong> Find crisis support in your country
            </>
          )}
        </span>
        {!isUS && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="bg-background"
          >
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Phone className="h-4 w-4 mr-2" />
              Find Helpline
            </a>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
