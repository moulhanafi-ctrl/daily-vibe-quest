import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Heart } from "lucide-react";

interface InclusionBannerProps {
  dismissible?: boolean;
  compact?: boolean;
}

export const InclusionBanner = ({ dismissible = false, compact = false }: InclusionBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useTranslation('common');

  if (dismissed) return null;

  return (
    <Alert className="border-primary/20 bg-primary/5 relative" role="banner" aria-label="Inclusion statement">
      <div className="flex items-start gap-3">
        <Heart className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <AlertDescription className={compact ? "text-sm" : ""}>
            <strong>{t('inclusion.shortBanner')}</strong>{' '}
            {!compact && t('inclusion.banner').split('.')[1]}
          </AlertDescription>
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss inclusion banner"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
};