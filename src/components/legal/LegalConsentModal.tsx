import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface LegalConsentModalProps {
  open: boolean;
  onClose: () => void;
  onConsent: () => void;
  userAgeGroup?: "child" | "teen" | "adult" | "elder";
  isGuardian?: boolean;
}

export const LegalConsentModal = ({ open, onClose, onConsent, userAgeGroup, isGuardian = false }: LegalConsentModalProps) => {
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

      const legalConsent = {
        version: "1.0.0",
        accepted_at: new Date().toISOString(),
        accepted_ip: "client", // Would need server-side tracking for real IP
        user_agent: navigator.userAgent,
        ...(isGuardian && { guardian_id: user.id }),
      };

      const { error } = await supabase
        .from("profiles")
        .update({ legal_consent: legalConsent })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Thank you! ✅",
        description: "You can now access all features",
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
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Legal & Safety Consent</DialogTitle>
          <DialogDescription>
            Please review and agree to continue using Vibe Check
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Not Therapy Disclaimer */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <h3 className="font-semibold text-left">⚠️ Important: This is Not Therapy</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Vibe Check is not therapy, medical care, or a crisis service.</strong> It's a peer-support 
                  and wellness space for reflection, education, and community. If you need clinical care, please 
                  contact a licensed professional. If you're in immediate danger, call your local emergency number.
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Community Guidelines */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <h3 className="font-semibold text-left">🤝 Community Guidelines</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border rounded-lg">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><strong>Be kind.</strong> No bullying, harassment, hate speech, or threats.</li>
                  <li><strong>Keep it safe.</strong> No sexual content, sexual advances, or explicit messages.</li>
                  <li><strong>Respect privacy.</strong> Don't share others' personal information.</li>
                  <li><strong>Stay supportive.</strong> No spamming, self-promotion, or scams.</li>
                  <li><strong>Crisis content.</strong> If you or someone expresses intent to self-harm, use the crisis resources provided and alert a moderator.</li>
                </ul>
                <Button variant="link" className="mt-2 p-0" asChild>
                  <a href="/community-guidelines" target="_blank">
                    View Full Guidelines <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Terms of Use */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <h3 className="font-semibold text-left">📜 Terms of Use</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border rounded-lg">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Vibe Check provides wellness content and peer rooms; no medical advice.</li>
                  <li>You must be 18+, or 13–17 with parent/guardian oversight, or &lt;13 with verified parent consent.</li>
                  <li>We may moderate or remove content that violates rules and may restrict accounts.</li>
                  <li>Purchases are subject to our Refund Policy; digital items grant personal, non-transferable access.</li>
                </ul>
                <Button variant="link" className="mt-2 p-0" asChild>
                  <a href="/terms" target="_blank">
                    View Full Terms <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Privacy Notice */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
                <h3 className="font-semibold text-left">🔒 Privacy Notice</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  We collect only the data needed to run the app (account, age group, room membership, check-ins). 
                  We don't sell your data.
                </p>
                <Button variant="link" className="mt-2 p-0" asChild>
                  <a href="/privacy" target="_blank">
                    View Privacy Policy <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Crisis Resources */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20">
                <h3 className="font-semibold text-left text-red-600 dark:text-red-400">🆘 Crisis Resources</h3>
                <ChevronDown className="h-5 w-5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border border-red-500/20 rounded-lg bg-red-500/5">
                <ul className="space-y-2 text-sm">
                  <li><strong>US/Canada:</strong> Call/text <strong>988</strong> (Suicide & Crisis Lifeline)</li>
                  <li><strong>UK & Ireland:</strong> Samaritans <strong>116 123</strong></li>
                  <li><strong>Elsewhere:</strong> <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="underline">findahelpline.com</a></li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="notTherapy"
                checked={checkedItems.notTherapy}
                onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, notTherapy: !!checked }))}
              />
              <label htmlFor="notTherapy" className="text-sm cursor-pointer">
                I understand Vibe Check is not therapy or medical care.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={checkedItems.terms}
                onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, terms: !!checked }))}
              />
              <label htmlFor="terms" className="text-sm cursor-pointer">
                I agree to the Terms of Use and Privacy Policy.
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="communityRules"
                checked={checkedItems.communityRules}
                onCheckedChange={(checked) => setCheckedItems(prev => ({ ...prev, communityRules: !!checked }))}
              />
              <label htmlFor="communityRules" className="text-sm cursor-pointer">
                I agree to follow the Community Guidelines (no bullying, harassment, sexual content, or hate speech).
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
                  I am the parent/guardian and consent to my child's use of Vibe Check and to the processing 
                  of their data as described.
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAgree}
              disabled={!allRequiredChecked || submitting}
              className="flex-1"
            >
              {submitting ? "Processing..." : "Agree & Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};