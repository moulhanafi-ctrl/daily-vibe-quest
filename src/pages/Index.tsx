import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { FamilyMode } from "@/components/FamilyMode";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <FamilyMode />
      <Pricing />
      <Footer />
    </div>
  );
};

export default Index;
