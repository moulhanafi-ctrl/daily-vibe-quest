import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { OnboardingOverview } from "@/components/onboarding/OnboardingOverview";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { BasicInfoStep } from "@/components/onboarding/BasicInfoStep";
import { FocusAreaStep } from "@/components/onboarding/FocusAreaStep";
import { DeepDiveStep } from "@/components/onboarding/DeepDiveStep";
import { ConfirmationScreen } from "@/components/onboarding/ConfirmationScreen";
import { trackEvent } from "@/lib/analytics";
import { analytics } from "@/lib/posthog";
import { slugForId } from "@/lib/focusAreas";

type OnboardingStep = "overview" | "welcome" | "basic-info" | "focus-area" | "deep-dive" | "confirmation";

interface OnboardingData {
  firstName?: string;
  age?: number;
  sex?: string;
  zipcode?: string;
  focusAreas?: string[];
  reflection?: string;
  chatRoomId?: string;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("overview");
  const [data, setData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleBasicInfo = (basicInfo: {
    firstName: string;
    age: number;
    sex: string;
    zipcode: string;
  }) => {
    setData(prev => ({ ...prev, ...basicInfo }));
    setCurrentStep("focus-area");
  };

  const handleFocusAreas = async (focusAreas: string[]) => {
    setData(prev => ({ ...prev, focusAreas }));
    
    // Save focus areas to profile immediately
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && focusAreas.length > 0) {
        await supabase
          .from("profiles")
          .update({ selected_focus_areas: focusAreas })
          .eq("id", user.id);
      }
    } catch (error) {
      console.error("Error setting up focus area:", error);
    }
    
    setCurrentStep("deep-dive");
  };

  const handleReflection = (reflection: string) => {
    setData(prev => ({ ...prev, reflection }));
    setCurrentStep("confirmation");
  };

  const handleComplete = async () => {
    setLoading(true);
    trackEvent({ 
      eventType: "onboarding_completed",
      metadata: {
        firstName: data.firstName,
        ageGroup: data.age && data.age >= 50 ? "senior" : data.age && data.age >= 18 ? "adult" : data.age && data.age >= 13 ? "teen" : "kid",
        focusAreasCount: data.focusAreas?.length || 0
      }
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No user found");
      }

      // Calculate age group based on age
      const { data: ageGroupData, error: ageGroupError } = await supabase
        .rpc("assign_age_group", { user_age: data.age });

      if (ageGroupError) throw ageGroupError;

      // Create a unique username by combining first name with random string
      const uniqueUsername = `${data.firstName}${Math.random().toString(36).substring(2, 6)}`;
      
      // Update the user's profile with onboarding data
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: data.firstName,
          age: data.age,
          age_group: ageGroupData, // Auto-assigned based on age
          sex: data.sex,
          zipcode: data.zipcode,
          selected_focus_areas: data.focusAreas,
          optional_reflection: data.reflection,
          username: uniqueUsername,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Track onboarding completion
      analytics.onboardingCompleted({
        age_group: ageGroupData,
        focus_areas: data.focusAreas || [],
      });

      toast({
        title: "Profile created! 🎉",
        description: "Welcome to your mental health journey.",
      });
      
      // SECURITY: Enforce parent verification for minors (COPPA compliance)
      if (ageGroupData === 'child' || ageGroupData === 'teen') {
        navigate("/parent-verification");
      } else if (data.focusAreas && data.focusAreas.length > 0) {
        // Redirect to their focus area chat room using focus area slug
        navigate(`/chat-rooms/${slugForId(data.focusAreas[0])}`);
      } else {
        navigate("/dashboard?first_checkin=true");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  switch (currentStep) {
    case "overview":
      return <OnboardingOverview onStart={() => setCurrentStep("welcome")} />;
    
    case "welcome":
      return <WelcomeScreen onNext={() => setCurrentStep("basic-info")} />;
    
    case "basic-info":
      return (
        <BasicInfoStep
          onNext={handleBasicInfo}
          onBack={() => setCurrentStep("welcome")}
        />
      );
    
    case "focus-area":
      return (
        <FocusAreaStep
          onNext={handleFocusAreas}
          onBack={() => setCurrentStep("basic-info")}
        />
      );
    
    case "deep-dive":
      return (
        <DeepDiveStep
          onNext={handleReflection}
          onBack={() => setCurrentStep("focus-area")}
        />
      );
    
    case "confirmation":
      return (
        <ConfirmationScreen
          firstName={data.firstName || ""}
          focusAreas={data.focusAreas || []}
          onComplete={handleComplete}
        />
      );
    
    default:
      return null;
  }
};

export default Onboarding;