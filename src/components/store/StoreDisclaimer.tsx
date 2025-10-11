import { useTranslation } from "react-i18next";
import { AlertCircle } from "lucide-react";

export const StoreDisclaimer = () => {
  const { t } = useTranslation("legal");

  return (
    <div className="border-t pt-4 mt-4 space-y-2">
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p>{t("storeDisclaimer.educational")}</p>
          <p>{t("storeDisclaimer.digitalGoods")}</p>
          <a 
            href="/policies/refunds" 
            className="text-primary underline hover:text-primary/80"
          >
            {t("storeDisclaimer.refundPolicy")}
          </a>
        </div>
      </div>
    </div>
  );
};
