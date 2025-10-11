import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, CreditCard, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

interface ParentVerificationProps {
  childId: string;
  onVerified: () => void;
}

export const ParentVerification = ({ childId, onVerified }: ParentVerificationProps) => {
  const { t } = useTranslation("legal");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "failed">("pending");

  const handleSendCode = async () => {
    setLoading(true);
    try {
      // TODO: Implement email verification code sending via edge function
      // For now, simulate the flow
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setCodeSent(true);
      trackEvent({ 
        eventType: "guardian_verification_started" as any,
        metadata: { method: "email", child_id: childId }
      });
      
      toast({
        title: t("common:success", "Success"),
        description: t("parentVerification.methods.email.sendCode") + " sent!",
      });
    } catch (error: any) {
      toast({
        title: t("parentVerification.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    try {
      // TODO: Implement code verification via edge function
      // For now, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setVerificationStatus("verified");
      trackEvent({ 
        eventType: "guardian_verified" as any,
        metadata: { method: "email", child_id: childId }
      });
      
      toast({
        title: t("parentVerification.success"),
      });
      
      onVerified();
    } catch (error: any) {
      setVerificationStatus("failed");
      toast({
        title: t("parentVerification.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStripeVerification = async () => {
    setLoading(true);
    try {
      // TODO: Implement Stripe micro-charge verification via edge function
      trackEvent({ 
        eventType: "guardian_verification_started" as any,
        metadata: { method: "stripe", child_id: childId }
      });
      
      toast({
        title: t("common:comingSoon", "Coming Soon"),
        description: "Stripe verification will be available soon.",
      });
    } catch (error: any) {
      toast({
        title: t("parentVerification.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case "verified":
        return (
          <Badge className="bg-green-500 gap-1">
            <Check className="h-3 w-3" />
            {t("parentVerification.status.verified")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            {t("parentVerification.status.failed")}
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {t("parentVerification.status.pending")}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t("parentVerification.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("parentVerification.subtitle")}</p>
        </div>
        {getStatusBadge()}
      </div>

      <Card className="p-6 bg-primary/5 border-primary/20">
        <p className="text-sm">{t("parentVerification.description")}</p>
      </Card>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            {t("parentVerification.methods.email.title")}
          </TabsTrigger>
          <TabsTrigger value="stripe" className="gap-2">
            <CreditCard className="h-4 w-4" />
            {t("parentVerification.methods.stripe.title")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              {t("parentVerification.methods.email.description")}
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="parentEmail">
                  {t("parentVerification.methods.email.emailLabel")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="parentEmail"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
                    disabled={codeSent || loading}
                  />
                  {!codeSent && (
                    <Button
                      onClick={handleSendCode}
                      disabled={!email || loading}
                    >
                      {t("parentVerification.methods.email.sendCode")}
                    </Button>
                  )}
                </div>
              </div>

              {codeSent && (
                <div>
                  <Label htmlFor="verificationCode">
                    {t("parentVerification.methods.email.codeLabel")}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="verificationCode"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="123456"
                      disabled={loading}
                      maxLength={6}
                    />
                    <Button
                      onClick={handleVerifyCode}
                      disabled={code.length !== 6 || loading}
                    >
                      {t("parentVerification.methods.email.verify")}
                    </Button>
                  </div>
                  <Button
                    variant="link"
                    onClick={handleSendCode}
                    disabled={loading}
                    className="mt-2 p-0 h-auto"
                  >
                    {t("parentVerification.methods.email.resend")}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="stripe" className="space-y-4">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              {t("parentVerification.methods.stripe.description")}
            </p>
            <p className="text-xs text-muted-foreground mb-4 italic">
              {t("parentVerification.methods.stripe.note")}
            </p>
            <Button
              onClick={handleStripeVerification}
              disabled={loading}
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {t("parentVerification.methods.stripe.button")}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
