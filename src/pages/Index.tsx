import { useEffect } from "react";
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

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('language, selected_focus_areas')
            .eq('id', session.user.id)
            .maybeSingle();

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
      }
    };

    checkSession();
  }, [navigate]);

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
