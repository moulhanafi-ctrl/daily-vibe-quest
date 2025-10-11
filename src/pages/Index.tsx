import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { FamilyMode } from "@/components/FamilyMode";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { InclusionBanner } from "@/components/InclusionBanner";

const Index = () => {
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
