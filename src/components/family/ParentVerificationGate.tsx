import { ReactNode } from "react";
import { useParentVerification } from "@/hooks/useParentVerification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ParentVerificationGateProps {
  children: ReactNode;
  feature: "rooms" | "checkout" | "journals";
}

export const ParentVerificationGate = ({ children, feature }: ParentVerificationGateProps) => {
  const { isMinor, needsVerification, isVerified, ageGroup, loading } = useParentVerification();
  const navigate = useNavigate();

  const featureNames = {
    rooms: "Chat Rooms",
    checkout: "Store Checkout",
    journals: "Shared Journals",
  };

  const featureDescriptions = {
    rooms: "participate in community chat rooms",
    checkout: "make purchases in the store",
    journals: "share journal entries with your parent",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Adults and verified minors can access everything
  if (!isMinor || isVerified) {
    return <>{children}</>;
  }

  // Unverified minors see the gate
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Alert className="mb-6">
          <Shield className="h-4 w-4" />
          <AlertTitle>Parent Verification Required</AlertTitle>
          <AlertDescription>
            For safety, {ageGroup === "child" ? "kids" : "teens"} need a verified parent or guardian to access {featureNames[feature]}.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Parent Verification Needed
            </CardTitle>
            <CardDescription>
              To {featureDescriptions[feature]}, please complete parent verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-semibold">Why do we need this?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Keeps you safe online</li>
                <li>Required by law (COPPA) for users under 13</li>
                <li>Lets your parent stay informed about your wellbeing</li>
                <li>Required for certain features like chat rooms and purchases</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">What happens next?</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>You'll enter your parent's email</li>
                <li>They'll receive a verification code</li>
                <li>They enter the code to verify</li>
                <li>You'll get access to all features</li>
              </ol>
            </div>

            <Button 
              onClick={() => navigate("/settings")} 
              className="w-full"
            >
              Start Parent Verification
            </Button>

            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")} 
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>

        {ageGroup === "child" && (
          <Alert variant="default" className="mt-4">
            <AlertTitle>For Kids (12 and under)</AlertTitle>
            <AlertDescription>
              Your parent will need to verify before you can use chat rooms, make purchases, or share journals.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};
