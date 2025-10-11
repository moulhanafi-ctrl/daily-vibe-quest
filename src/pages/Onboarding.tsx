import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { WelcomeScreen } from "@/components/onboarding/WelcomeScreen";
import { BasicInfoStep } from "@/components/onboarding/BasicInfoStep";
import { FocusAreaStep } from "@/components/onboarding/FocusAreaStep";
import { DeepDiveStep } from "@/components/onboarding/DeepDiveStep";
import { ConfirmationScreen } from "@/components/onboarding/ConfirmationScreen";

type OnboardingStep = "welcome" | "basic-info" | "focus-area" | "deep-dive" | "confirmation";

interface OnboardingData {
  firstName?: string;
  age?: number;
  sex?: string;
  zipcode?: string;
  focusAreas?: string[];
  reflection?: string;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [data, setData] = useState<OnboardingData>({});
  const [loading, setLoading] = useState(false);

  const handleBasicInfo = (basicInfo: {
    firstName: string;
    age: number;
    sex: string;
    zipcode: string;
  }) => {
    setData(prev => ({ ...prev, ...basicInfo }));
    setCurrentStep("focus-area");
  };

  const handleFocusAreas = (focusAreas: string[]) => {
    setData(prev => ({ ...prev, focusAreas }));
    setCurrentStep("deep-dive");
  };

  const handleReflection = (reflection: string) => {
    setData(prev => ({ ...prev, reflection }));
    setCurrentStep("confirmation");
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("No user found");
      }

      // Calculate age group based on age
      const { data: ageGroupData, error: ageGroupError } = await supabase
        .rpc("assign_age_group", { user_age: data.age });

      if (ageGroupError) throw ageGroupError;

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
          username: data.firstName,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Welcome to Vibe Check! 🎉",
        description: "Your profile has been set up successfully.",
      });

      navigate("/dashboard");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Setting up your profile...</p>
      </div>
    );
  }

  switch (currentStep) {
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
