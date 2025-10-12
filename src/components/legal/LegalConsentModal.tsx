import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

interface LegalConsentModalProps {
  open: boolean;
  onClose: () => void;
  onConsent: () => void;
  userAgeGroup?: "child" | "teen" | "adult" | "elder";
  isGuardian?: boolean;
}

export const LegalConsentModal = ({ open, onClose, onConsent, userAgeGroup, isGuardian = false }: LegalConsentModalProps) => {
  const { t } = useTranslation("legal");
  const [checkedItems, setCheckedItems] = useState({
    notTherapy: false,
    terms: false,
    communityRules: false,
    parentalConsent: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const requiresParentalConsent = userAgeGroup === "child" || (userAgeGroup === "teen" && isGuardian);

  const allRequiredChecked = 
    checkedItems.notTherapy && 
    checkedItems.terms && 
    checkedItems.communityRules &&
    (!requiresParentalConsent || checkedItems.parentalConsent);

  const handleAgree = async () => {
    if (!allRequiredChecked) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update profile with consent details
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          legal_consent_version: "1.0.0",
          legal_consent_accepted_at: new Date().toISOString(),
          legal_consent_ip: "client",
          legal_consent_user_agent: navigator.userAgent,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Insert into consent ledger
      const { error: ledgerError } = await supabase
        .from("consent_ledger")
        .insert({
          user_id: user.id,
          version: "1.0.0",
          accepted_ip: "client",
          user_agent: navigator.userAgent,
          guardian_id: isGuardian ? user.id : null,
          terms_accepted: checkedItems.terms,
          privacy_accepted: checkedItems.terms,
          guidelines_accepted: checkedItems.communityRules,
          not_therapy_acknowledged: checkedItems.notTherapy,
        });

      if (ledgerError) throw ledgerError;

      trackEvent({
        eventType: "legal_consent_accepted" as any,
        metadata: { version: "1.0.0", is_guardian: isGuardian, age_group: userAgeGroup }
      });

      toast({
        title: t("consent.success.title"),
        description: t("consent.success.message"),
      });

      onConsent();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] md:max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">{t("consent.title")}</DialogTitle>
          <DialogDescription>
            {t("consent.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-4">
          <p className="text-sm">
            {t("consent.inclusionBanner")}
          </p>
        </div>

        <ScrollArea className="flex-1 min-h-0 pr-4 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Not Therapy Disclaimer */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <h3 className="font-semibold text-left">{t("consent.notTherapy.title")}</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t("consent.notTherapy.content")}
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Community Guidelines */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <h3 className="font-semibold text-left">{t("consent.guidelines.title")}</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border rounded-lg">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>{t("consent.guidelines.beKind")}</li>
                  <li>{t("consent.guidelines.keepSafe")}</li>
                  <li>{t("consent.guidelines.respectPrivacy")}</li>
                  <li>{t("consent.guidelines.staySupportive")}</li>
                  <li>{t("consent.guidelines.crisisContent")}</li>
                </ul>
                <Button variant="link" className="mt-2 p-0" asChild>
                  <a href="/community-guidelines" target="_blank">
                    {t("consent.guidelines.viewFull")} <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Terms of Use */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <h3 className="font-semibold text-left">{t("consent.terms.title")}</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border rounded-lg">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>{t("consent.terms.point1")}</li>
                  <li>{t("consent.terms.point2")}</li>
                  <li>{t("consent.terms.point3")}</li>
                  <li>{t("consent.terms.point4")}</li>
                </ul>
                <Button variant="link" className="mt-2 p-0" asChild>
                  <a href="/terms" target="_blank">
                    {t("consent.terms.viewFull")} <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Privacy Notice */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <h3 className="font-semibold text-left">{t("consent.privacy.title")}</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t("consent.privacy.content")}
                </p>
                <Button variant="link" className="mt-2 p-0" asChild>
                  <a href="/privacy" target="_blank">
                    {t("consent.privacy.viewFull")} <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Crisis Resources */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20">
                <h3 className="font-semibold text-left text-red-600 dark:text-red-400">{t("consent.crisis.title")}</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border border-red-500/20 rounded-lg bg-red-500/5">
                <ul className="space-y-2 text-sm">
                  <li>{t("consent.crisis.us")}</li>
                  <li>{t("consent.crisis.uk")}</li>
                  <li><strong>{t("common:elsewhere", "Elsewhere")}:</strong> <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="underline">findahelpline.com</a></li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t mt-4 flex-shrink-0">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="notTherapy"
                checked={checkedItems.notTherapy}
                onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, notTherapy: !!checked }))}
              />
              <label htmlFor="notTherapy" className="text-sm cursor-pointer">
                {t("consent.checkboxes.notTherapy")}
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={checkedItems.terms}
                onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, terms: !!checked }))}
              />
              <label htmlFor="terms" className="text-sm cursor-pointer">
                {t("consent.checkboxes.terms")}
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="communityRules"
                checked={checkedItems.communityRules}
                onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, communityRules: !!checked }))}
              />
              <label htmlFor="communityRules" className="text-sm cursor-pointer">
                {t("consent.checkboxes.guidelines")}
              </label>
            </div>

            {requiresParentalConsent && (
              <div className="flex items-start gap-3 p-3 bg-primary/10 rounded border border-primary/20">
                <Checkbox
                  id="parentalConsent"
                  checked={checkedItems.parentalConsent}
                  onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, parentalConsent: !!checked }))}
                />
                <label htmlFor="parentalConsent" className="text-sm cursor-pointer font-medium">
                  {t("consent.checkboxes.parentalConsent")}
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleAgree}
              disabled={!allRequiredChecked || submitting}
              size="lg"
              className="w-full font-semibold"
            >
              {submitting ? t("consent.actions.processing") : t("consent.actions.agree")}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              size="sm"
            >
              {t("consent.actions.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};