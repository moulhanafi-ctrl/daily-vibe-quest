import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Hero } from "@/components/Hero";
import { CrisisBanner } from "@/components/CrisisBanner";
import { Stats } from "@/components/Stats";
import { Features } from "@/components/Features";
import { TrustSignals } from "@/components/TrustSignals";
import { FamilyMode } from "@/components/FamilyMode";
import { Testimonials } from "@/components/Testimonials";
import { Pricing } from "@/components/Pricing";
import { AppDownload } from "@/components/AppDownload";
import { Footer } from "@/components/Footer";
import { InclusionBanner } from "@/components/InclusionBanner";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isMounted) setIsCheckingSession(false);
          return;
        }
        
        if (session) {
          // Check if user has completed onboarding
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('language, selected_focus_areas')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
            if (isMounted) setIsCheckingSession(false);
            return;
          }

          if (!profile?.language) {
            navigate('/welcome/language');
          } else if (!profile?.selected_focus_areas || profile.selected_focus_areas.length === 0) {
            navigate('/onboarding');
          } else {
            navigate('/dashboard');
          }
        } else {
          // No session - show landing page
          if (isMounted) setIsCheckingSession(false);
        }
      } catch (error) {
        console.error('Session check error:', error);
        if (isMounted) setIsCheckingSession(false);
      }
    };

    // Safety timeout: if session check takes > 5 seconds, show the page anyway
    timeoutId = setTimeout(() => {
      console.warn('Session check timeout - showing landing page');
      if (isMounted) setIsCheckingSession(false);
    }, 5000);

    checkSession().finally(() => {
      clearTimeout(timeoutId);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && isMounted) {
        checkSession();
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
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
      <CrisisBanner />
      <Stats />
      <TrustSignals />
      <Features />
      <FamilyMode />
      <Testimonials />
      <Pricing />
      <AppDownload />
      <Footer />
    </div>
  );
};

export default Index;
