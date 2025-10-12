import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { FamilyMode } from "@/components/FamilyMode";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { InclusionBanner } from "@/components/InclusionBanner";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Check if user has completed onboarding
          const { data: profile } = await supabase
            .from('profiles')
            .select('language, selected_focus_areas')
            .eq('id', session.user.id)
            .single();

          if (!profile?.language) {
            navigate('/welcome/language');
          } else if (!profile?.selected_focus_areas || profile.selected_focus_areas.length === 0) {
            navigate('/onboarding');
          } else {
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-4">
        <InclusionBanner dismissible={true} />
      </div>
      <Hero />
      <Features />
      <FamilyMode />
      <Pricing />
      <Footer />
    </div>
  );
};

export default Index;
